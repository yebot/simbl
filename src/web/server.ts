import { readFileSync, writeFileSync, watch } from 'fs';
import { findSimblDir, getSimblPaths, loadConfig } from '../core/config.ts';
import { parseSimblFile, getAllTasks, serializeSimblFile } from '../core/parser.ts';
import { parseReservedTags, deriveStatus, type Task } from '../core/task.ts';
import { generateNextId } from '../utils/id.ts';
import { renderTaskTable, renderTagCloud, renderPriorityFilter, renderStatusFilter, renderProjectFilter, renderTaskModal, renderAddTaskForm, shiftHeadingsForStorage } from './templates.ts';
import { renderPage } from './page.ts';
import type { ServerWebSocket } from 'bun';

// Track connected WebSocket clients
const wsClients = new Set<ServerWebSocket<unknown>>();

// Debounce file watcher to avoid rapid re-broadcasts
let lastBroadcast = 0;
const BROADCAST_DEBOUNCE_MS = 100;

export interface ServerOptions {
  port: number;
  open: boolean;
}

/**
 * Check if an error is a port-in-use error
 */
function isPortInUseError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('eaddrinuse') || msg.includes('address already in use') || msg.includes('port') && msg.includes('in use');
  }
  return false;
}

/**
 * Open URL in default browser
 */
function openBrowser(url: string): void {
  const proc = Bun.spawn(['open', url], {
    stdout: 'ignore',
    stderr: 'ignore',
  });
  proc.unref();
}

/**
 * Get the simbl paths
 */
function getPathsOrThrow() {
  const simblDir = findSimblDir();
  if (!simblDir) {
    throw new Error('No .simbl directory found. Run `simbl init` first.');
  }
  return getSimblPaths(simblDir);
}

/**
 * Load and parse the tasks file
 */
function loadTasks() {
  const paths = getPathsOrThrow();
  const content = readFileSync(paths.tasks, 'utf-8');
  return parseSimblFile(content);
}

/**
 * Save the tasks file
 */
function saveTasks(file: ReturnType<typeof parseSimblFile>) {
  const paths = getPathsOrThrow();
  const content = serializeSimblFile(file);
  writeFileSync(paths.tasks, content, 'utf-8');
}

/**
 * Start the SIMBL web server with automatic port retry
 */
export async function startServer(options: ServerOptions): Promise<void> {
  const { open } = options;
  const startPort = options.port;
  const maxAttempts = 100;

  // Get paths for file watcher (do this before server start to fail fast)
  const paths = getPathsOrThrow();

  /**
   * Broadcast task list update to all connected WebSocket clients
   */
  function broadcastUpdate() {
    const now = Date.now();
    if (now - lastBroadcast < BROADCAST_DEBOUNCE_MS) {
      return; // Debounce rapid changes
    }
    lastBroadcast = now;

    try {
      const file = loadTasks();
      const allTasks = getAllTasks(file);
      const backlogTasks = file.backlog;

      // Send fresh task table HTML to all clients
      const html = renderTaskTable(backlogTasks);
      const tagCloudHtml = renderTagCloud(allTasks);
      const priorityFilterHtml = renderPriorityFilter(allTasks);
      const statusFilterHtml = renderStatusFilter();
      const projectFilterHtml = renderProjectFilter(allTasks);

      // HTMX expects messages as HTML that will be swapped
      const message = `<div id="tasks-container" hx-swap-oob="true">${html}</div>
<div id="tag-cloud" hx-swap-oob="true">${tagCloudHtml.replace('<div id="tag-cloud">', '').replace('</div>', '')}</div>
<div id="priority-filter" hx-swap-oob="true">${priorityFilterHtml.replace('<div id="priority-filter">', '').replace('</div>', '')}</div>
<div id="status-filter" hx-swap-oob="true">${statusFilterHtml.replace('<div id="status-filter">', '').replace('</div>', '')}</div>
<div id="project-filter" hx-swap-oob="true">${projectFilterHtml.replace('<div id="project-filter">', '').replace('</div>', '')}</div>`;

      for (const client of wsClients) {
        client.send(message);
      }
    } catch (error) {
      console.error('Error broadcasting update:', error);
    }
  }

  // Try to bind to ports atomically with retry
  let server: ReturnType<typeof Bun.serve> | null = null;
  let boundPort = startPort;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      server = Bun.serve({
        port: boundPort,
        hostname: '0.0.0.0',

        async fetch(req, server) {
      const url = new URL(req.url);
      const path = url.pathname;

      // Handle WebSocket upgrade
      if (path === '/ws') {
        const upgraded = server.upgrade(req, { data: {} });
        if (!upgraded) {
          return new Response('WebSocket upgrade failed', { status: 400 });
        }
        return undefined;
      }

      try {
        // GET / - Main page
        if (path === '/' && req.method === 'GET') {
          const file = loadTasks();
          const simblDir = findSimblDir()!;
          const config = loadConfig(simblDir);
          return new Response(renderPage(file, config.name), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // GET /tasks - Task list partial (for HTMX)
        if (path === '/tasks' && req.method === 'GET') {
          const file = loadTasks();
          const allTasks = getAllTasks(file);

          // Project filter takes precedence - shows both backlog and done
          const projectFilter = url.searchParams.get('project');
          // Status filter determines which tasks to show (mutually exclusive with project filter)
          const statusFilter = projectFilter ? null : url.searchParams.get('status');

          let tasks: Task[];
          if (projectFilter) {
            // Project filter shows tasks from both Backlog AND Done sections
            tasks = [...file.backlog, ...file.done].filter((t) => t.reserved.project === projectFilter);
          } else if (statusFilter === 'in-progress') {
            // Show tasks with in-progress status from backlog only
            tasks = file.backlog.filter((t) => t.status === 'in-progress');
          } else if (statusFilter === 'done') {
            // Show done tasks only
            tasks = file.done;
          } else {
            // Default: show both backlog AND done tasks
            tasks = [...file.backlog, ...file.done];
          }

          // Search filter
          const searchQuery = url.searchParams.get('q')?.toLowerCase().trim();
          if (searchQuery) {
            tasks = tasks.filter(
              (t) =>
                t.id.toLowerCase().includes(searchQuery) ||
                t.title.toLowerCase().includes(searchQuery) ||
                t.content.toLowerCase().includes(searchQuery)
            );
          }

          // Tag filter
          const tagFilter = url.searchParams.get('tag');
          if (tagFilter) {
            tasks = tasks.filter((t) => t.tags.includes(tagFilter));
          }

          // Priority filter
          const priorityParam = url.searchParams.get('priority');
          const priorityFilter = priorityParam ? parseInt(priorityParam, 10) : undefined;
          if (priorityFilter !== undefined && !isNaN(priorityFilter)) {
            tasks = tasks.filter((t) => t.reserved.priority === priorityFilter);
          }

          const sortBy = url.searchParams.get('sort') || 'id';
          const sortDir = (url.searchParams.get('dir') || 'asc') as 'asc' | 'desc';

          // Build response with task table only
          let response = renderTaskTable(tasks, sortBy, sortDir, searchQuery || undefined, tagFilter || undefined, priorityFilter, statusFilter || undefined);

          // Include tag cloud OOB swap to update active state
          response += `\n<div id="tag-cloud" hx-swap-oob="true">${renderTagCloud(allTasks, tagFilter || undefined).replace('<div id="tag-cloud">', '').replace('</div>', '')}</div>`;

          // Include priority filter OOB swap to update active state
          response += `\n<div id="priority-filter" hx-swap-oob="true">${renderPriorityFilter(allTasks, priorityFilter).replace('<div id="priority-filter">', '').replace('</div>', '')}</div>`;

          // Include status filter OOB swap to update active state
          response += `\n<div id="status-filter" hx-swap-oob="true">${renderStatusFilter(statusFilter || undefined).replace('<div id="status-filter">', '').replace('</div>', '')}</div>`;

          // Include project filter OOB swap to update active state
          response += `\n<div id="project-filter" hx-swap-oob="true">${renderProjectFilter(allTasks, projectFilter || undefined).replace('<div id="project-filter">', '').replace('</div>', '')}</div>`;

          return new Response(response, {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // GET /task/:id - Task detail modal (for HTMX)
        if (path.startsWith('/task/') && req.method === 'GET') {
          const id = path.slice(6); // Remove '/task/'
          const file = loadTasks();
          const allTasks = getAllTasks(file);
          const task = allTasks.find((t) => t.id === id);

          if (!task) {
            return new Response('Task not found', { status: 404 });
          }

          return new Response(renderTaskModal(task, allTasks), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // PATCH /task/:id - Update task (title or content)
        if (path.startsWith('/task/') && req.method === 'PATCH') {
          const id = path.slice(6); // Remove '/task/'
          const file = loadTasks();

          // Find task in either section
          let task = file.backlog.find((t) => t.id === id);
          let section: 'backlog' | 'done' = 'backlog';
          if (!task) {
            task = file.done.find((t) => t.id === id);
            section = 'done';
          }

          if (!task) {
            return new Response('Task not found', { status: 404 });
          }

          // Parse form data
          const formData = await req.formData();
          const title = formData.get('title');
          const content = formData.get('content');

          let updated = false;

          if (title !== null && typeof title === 'string') {
            task.title = title;
            updated = true;
          }

          if (content !== null && typeof content === 'string') {
            // Shift headings back for storage (H1 in UI -> H3 in file)
            task.content = shiftHeadingsForStorage(content);
            updated = true;
          }

          if (updated) {
            // Update the task in the appropriate section
            const taskIndex = file[section].findIndex((t) => t.id === id);
            if (taskIndex !== -1) {
              file[section][taskIndex] = task;
            }
            saveTasks(file);
          }

          // Return "Saved" indicator - determine which indicator to update based on field
          // The hx-target will be either #save-indicator-{id} or #content-save-indicator-{id}
          // We return a span that will replace the target via outerHTML
          const indicatorType = title !== null ? 'save-indicator' : 'content-save-indicator';
          return new Response(`<span id="${indicatorType}-${id}" class="save-indicator">Saved ✓</span>`, {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // GET /add - Add task form (modal)
        if (path === '/add' && req.method === 'GET') {
          return new Response(renderAddTaskForm(), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // POST /task - Create new task
        if (path === '/task' && req.method === 'POST') {
          const formData = await req.formData();
          const title = formData.get('title');
          const tagsInput = formData.get('tags');
          const contentInput = formData.get('content');

          if (!title || typeof title !== 'string' || !title.trim()) {
            return new Response('Title is required', { status: 400 });
          }

          const file = loadTasks();
          const simblDir = findSimblDir()!;
          const config = loadConfig(simblDir);

          // Generate new ID
          const id = generateNextId(config.prefix, simblDir);

          // Parse tags from comma-separated input
          const tags: string[] = [];
          if (tagsInput && typeof tagsInput === 'string' && tagsInput.trim()) {
            const tagList = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
            tags.push(...tagList);
          }

          // Parse content (shift headings for storage if needed)
          let content = '';
          if (contentInput && typeof contentInput === 'string') {
            content = shiftHeadingsForStorage(contentInput);
          }

          // Create task
          const task: Task = {
            id,
            title: title.trim(),
            tags,
            reserved: parseReservedTags(tags),
            status: deriveStatus('backlog', parseReservedTags(tags)),
            content,
            section: 'backlog',
          };

          file.backlog.push(task);
          saveTasks(file);

          // Return updated task list + close modal
          return new Response(
            `<div id="modal-container" hx-swap-oob="true"></div>
             ${renderTaskTable(file.backlog)}`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        }

        // POST /task/:id/done - Mark task as done
        if (path.match(/^\/task\/[^/]+\/done$/) && req.method === 'POST') {
          const id = path.split('/')[2];
          const file = loadTasks();

          // Find task in backlog
          const taskIndex = file.backlog.findIndex((t) => t.id === id);
          if (taskIndex === -1) {
            return new Response('Task not found in backlog', { status: 404 });
          }

          // Move to done
          const task = file.backlog.splice(taskIndex, 1)[0];
          task.section = 'done';
          task.status = 'done';
          file.done.push(task);
          saveTasks(file);

          // Return updated modal
          const allTasks = getAllTasks(file);
          return new Response(renderTaskModal(task, allTasks), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // POST /task/:id/cancel - Mark task as canceled and move to done
        if (path.match(/^\/task\/[^/]+\/cancel$/) && req.method === 'POST') {
          const id = path.split('/')[2];
          const file = loadTasks();

          // Find task in backlog
          const taskIndex = file.backlog.findIndex((t) => t.id === id);
          if (taskIndex === -1) {
            return new Response('Task not found in backlog', { status: 404 });
          }

          // Move to done with canceled tag
          const task = file.backlog.splice(taskIndex, 1)[0];
          task.section = 'done';
          task.status = 'canceled';
          // Remove in-progress tag if present
          const inProgressIndex = task.tags.indexOf('in-progress');
          if (inProgressIndex !== -1) {
            task.tags.splice(inProgressIndex, 1);
          }
          // Add canceled tag if not present
          if (!task.tags.includes('canceled')) {
            task.tags.push('canceled');
          }
          task.reserved = parseReservedTags(task.tags);
          file.done.push(task);
          saveTasks(file);

          // Return updated modal
          const allTasks = getAllTasks(file);
          return new Response(renderTaskModal(task, allTasks), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // POST /task/:id/in-progress - Add in-progress tag (from backlog or done)
        if (path.match(/^\/task\/[^/]+\/in-progress$/) && req.method === 'POST') {
          const id = path.split('/')[2];
          const file = loadTasks();

          // Check if task is in backlog first
          let task = file.backlog.find((t) => t.id === id);
          if (task) {
            // Task is in backlog - just add in-progress tag
            if (!task.tags.includes('in-progress')) {
              task.tags.push('in-progress');
              task.reserved = parseReservedTags(task.tags);
              task.status = deriveStatus('backlog', task.reserved);
              saveTasks(file);
            }
          } else {
            // Check if task is in done
            const taskIndex = file.done.findIndex((t) => t.id === id);
            if (taskIndex === -1) {
              return new Response('Task not found', { status: 404 });
            }

            // Move from done to backlog with in-progress tag
            task = file.done.splice(taskIndex, 1)[0];
            task.section = 'backlog';
            if (!task.tags.includes('in-progress')) {
              task.tags.push('in-progress');
            }
            // Remove canceled tag if present (task is being reactivated)
            const canceledIndex = task.tags.indexOf('canceled');
            if (canceledIndex !== -1) {
              task.tags.splice(canceledIndex, 1);
            }
            task.reserved = parseReservedTags(task.tags);
            task.status = deriveStatus('backlog', task.reserved);
            file.backlog.push(task);
            saveTasks(file);
          }

          // Return updated modal
          const allTasks = getAllTasks(file);
          return new Response(renderTaskModal(task, allTasks), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // POST /task/:id/backlog - Remove in-progress tag (send back to backlog status)
        if (path.match(/^\/task\/[^/]+\/backlog$/) && req.method === 'POST') {
          const id = path.split('/')[2];
          const file = loadTasks();

          // Find task in backlog
          const task = file.backlog.find((t) => t.id === id);
          if (!task) {
            return new Response('Task not found in backlog', { status: 404 });
          }

          // Remove in-progress tag
          const tagIndex = task.tags.indexOf('in-progress');
          if (tagIndex !== -1) {
            task.tags.splice(tagIndex, 1);
            task.reserved = parseReservedTags(task.tags);
            task.status = deriveStatus('backlog', task.reserved);
            saveTasks(file);
          }

          // Return updated modal
          const allTasks = getAllTasks(file);
          return new Response(renderTaskModal(task, allTasks), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // POST /task/:id/tag - Add tag to task
        if (path.match(/^\/task\/[^/]+\/tag$/) && req.method === 'POST') {
          const id = path.split('/')[2];
          const formData = await req.formData();
          const tag = formData.get('tag');

          if (!tag || typeof tag !== 'string' || !tag.trim()) {
            return new Response('Tag is required', { status: 400 });
          }

          const file = loadTasks();

          // Find task in either section
          let task = file.backlog.find((t) => t.id === id);
          let section: 'backlog' | 'done' = 'backlog';
          if (!task) {
            task = file.done.find((t) => t.id === id);
            section = 'done';
          }

          if (!task) {
            return new Response('Task not found', { status: 404 });
          }

          // Add tag if not already present
          const cleanTag = tag.trim().replace(/^\[|\]$/g, '');
          if (!task.tags.includes(cleanTag)) {
            task.tags.push(cleanTag);
            task.reserved = parseReservedTags(task.tags);
            task.status = deriveStatus(section, task.reserved);
            saveTasks(file);
          }

          // Return updated modal with saved indicator
          const allTasks = getAllTasks(file);
          return new Response(renderTaskModal(task, allTasks, true), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // POST /task/:id/priority/:value - Set priority
        if (path.match(/^\/task\/[^/]+\/priority\/[1-9]$/) && req.method === 'POST') {
          const parts = path.split('/');
          const id = parts[2];
          const priority = parseInt(parts[4], 10);

          const file = loadTasks();

          // Find task in either section
          let task = file.backlog.find((t) => t.id === id);
          let section: 'backlog' | 'done' = 'backlog';
          if (!task) {
            task = file.done.find((t) => t.id === id);
            section = 'done';
          }

          if (!task) {
            return new Response('Task not found', { status: 404 });
          }

          // Remove any existing priority tag
          task.tags = task.tags.filter((t) => !/^p[1-9]$/.test(t));

          // Add new priority tag
          task.tags.unshift(`p${priority}`);
          task.reserved = parseReservedTags(task.tags);
          task.status = deriveStatus(section, task.reserved);
          saveTasks(file);

          // Return updated modal with saved indicator
          const allTasks = getAllTasks(file);
          return new Response(renderTaskModal(task, allTasks, true), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // DELETE /task/:id/priority - Remove priority
        if (path.match(/^\/task\/[^/]+\/priority$/) && req.method === 'DELETE') {
          const id = path.split('/')[2];

          const file = loadTasks();

          // Find task in either section
          let task = file.backlog.find((t) => t.id === id);
          let section: 'backlog' | 'done' = 'backlog';
          if (!task) {
            task = file.done.find((t) => t.id === id);
            section = 'done';
          }

          if (!task) {
            return new Response('Task not found', { status: 404 });
          }

          // Remove priority tags
          task.tags = task.tags.filter((t) => !/^p[1-9]$/.test(t));
          task.reserved = parseReservedTags(task.tags);
          task.status = deriveStatus(section, task.reserved);
          saveTasks(file);

          // Return updated modal with saved indicator
          const allTasks = getAllTasks(file);
          return new Response(renderTaskModal(task, allTasks, true), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // DELETE /task/:id/tag/:tag - Remove tag from task
        if (path.match(/^\/task\/[^/]+\/tag\/[^/]+$/) && req.method === 'DELETE') {
          const parts = path.split('/');
          const id = parts[2];
          const tagToRemove = decodeURIComponent(parts[4]);

          const file = loadTasks();

          // Find task in either section
          let task = file.backlog.find((t) => t.id === id);
          let section: 'backlog' | 'done' = 'backlog';
          if (!task) {
            task = file.done.find((t) => t.id === id);
            section = 'done';
          }

          if (!task) {
            return new Response('Task not found', { status: 404 });
          }

          // Remove tag
          const tagIndex = task.tags.indexOf(tagToRemove);
          if (tagIndex !== -1) {
            task.tags.splice(tagIndex, 1);
            task.reserved = parseReservedTags(task.tags);
            task.status = deriveStatus(section, task.reserved);
            saveTasks(file);
          }

          // Return updated modal with saved indicator
          const allTasks = getAllTasks(file);
          return new Response(renderTaskModal(task, allTasks, true), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // DELETE /task/:id - Delete task (done section only)
        if (path.match(/^\/task\/[^/]+$/) && req.method === 'DELETE') {
          const id = path.slice(6); // Remove '/task/'
          const file = loadTasks();

          // Only allow deleting from done section
          const taskIndex = file.done.findIndex((t) => t.id === id);
          if (taskIndex === -1) {
            // Check if it exists in backlog
            const inBacklog = file.backlog.find((t) => t.id === id);
            if (inBacklog) {
              return new Response('Cannot delete tasks in backlog. Mark as done first.', { status: 400 });
            }
            return new Response('Task not found', { status: 404 });
          }

          // Remove the task
          file.done.splice(taskIndex, 1);
          saveTasks(file);

          // Close modal and refresh task list
          return new Response('', {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // 404 for unknown routes
        return new Response('Not found', { status: 404 });
      } catch (error) {
        console.error('Server error:', error);
        return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          status: 500,
        });
      }
    },

        websocket: {
          open(ws) {
            wsClients.add(ws);
            console.log(`WebSocket client connected (${wsClients.size} total)`);
          },
          close(ws) {
            wsClients.delete(ws);
            console.log(`WebSocket client disconnected (${wsClients.size} total)`);
          },
          message(_ws, _message) {
            // We don't expect messages from clients, but handle anyway
          },
        },
      });
      // Successfully bound - exit retry loop
      break;
    } catch (error) {
      if (isPortInUseError(error)) {
        boundPort++;
      } else {
        throw error;
      }
    }
  }

  if (!server) {
    throw new Error(`Could not find available port after ${maxAttempts} attempts starting from ${startPort}`);
  }

  // Set up file watcher on tasks.md AFTER successful server bind
  const watcher = watch(paths.tasks, (eventType) => {
    if (eventType === 'change') {
      broadcastUpdate();
    }
  });

  // Warn if we're running on a different port than requested
  if (boundPort !== startPort) {
    console.warn(`\n⚠️  Warning: Preferred port ${startPort} is in use. Starting on port ${boundPort} instead.`);
  }

  const url = `http://localhost:${boundPort}`;
  console.log(`\n🚀 SIMBL UI running at ${url}\n`);

  if (open) {
    openBrowser(url);
  }

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down SIMBL server...');
    watcher.close();
    server.stop();
    process.exit(0);
  });
}
