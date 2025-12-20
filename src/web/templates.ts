import type { Task } from "../core/task.ts";
import { parseTaskLog, stripTaskLog } from "../core/log.ts";
import type { LogEntry } from "../core/log.ts";

/**
 * Pico CSS CDN URLs
 */
export const PICO_CSS =
  "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css";
export const PICO_COLORS_CSS =
  "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.colors.min.css";

/**
 * HTMX CDN URL
 */
export const HTMX_JS = "https://unpkg.com/htmx.org@2.0.4";

/**
 * Escape HTML special characters to prevent XSS
 * Use this for all user-provided content (task titles, content, tags, etc.)
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Shift markdown heading levels for display (H3 -> H1, H4 -> H2, etc.)
 * Task content uses H3+ internally, but we display as H1+ in the UI
 */
export function shiftHeadingsForDisplay(content: string): string {
  return content.replace(/^(#{3,6})\s/gm, (match, hashes) => {
    const level = hashes.length;
    // H3 -> H1, H4 -> H2, H5 -> H3, H6 -> H4
    const newLevel = level - 2;
    if (newLevel < 1) return match; // Safety check
    return "#".repeat(newLevel) + " ";
  });
}

/**
 * Shift markdown heading levels for storage (H1 -> H3, H2 -> H4, etc.)
 * When saving, we shift back so H1 in UI becomes H3 in file
 * H5/H6 would become H7/H8 which don't exist, so convert to bold
 */
export function shiftHeadingsForStorage(content: string): string {
  return content.replace(/^(#{1,6})\s(.*)$/gm, (_match, hashes, text) => {
    const level = hashes.length;
    const newLevel = level + 2;
    if (newLevel > 6) {
      // H5+ in UI would become H7+, convert to bold text
      return `**${text}**`;
    }
    return "#".repeat(newLevel) + " " + text;
  });
}

/**
 * Render the task log section (collapsible)
 */
function renderTaskLog(logEntries: LogEntry[]): string {
  if (logEntries.length === 0) {
    return `
      <details class="task-log-section">
        <summary role="button" class="secondary outline">
          Task Log <small>(no entries)</small>
        </summary>
        <div class="task-log-content">
          <em>No log entries yet</em>
        </div>
      </details>
    `;
  }

  const entriesHtml = logEntries.map(entry => {
    const dateStr = entry.timestamp.toLocaleString();
    return `
      <div class="task-log-entry">
        <span class="task-log-timestamp">${escapeHtml(dateStr)}</span>
        <span class="task-log-message">${escapeHtml(entry.message)}</span>
      </div>
    `;
  }).join('');

  return `
    <details class="task-log-section">
      <summary role="button" class="secondary outline">
        Task Log <small>(${logEntries.length} ${logEntries.length === 1 ? 'entry' : 'entries'})</small>
      </summary>
      <div class="task-log-content">
        ${entriesHtml}
      </div>
    </details>
  `;
}

/**
 * Get CSS variable suffix for priority (p1, p2, p3, p4, or p5-and-up)
 */
function getPriorityVarSuffix(priority: number): string {
  if (priority >= 5) return "p5-and-up";
  return `p${priority}`;
}

/**
 * Priority badge styling using SIMBL CSS variables
 */
function getPriorityBadge(priority: number | undefined): string {
  if (!priority) return "";
  const suffix = getPriorityVarSuffix(priority);
  const style = `background: var(--simbl-${suffix}-bg-light); color: var(--simbl-${suffix}-text);`;
  return `<span class="priority-badge" style="${style}">P${priority}</span>`;
}

/**
 * Status badge styling using SIMBL CSS variables
 * Only shows badge for in-progress, done, and canceled statuses (not backlog)
 */
function getStatusBadge(status: string): string {
  const colors: Record<string, string> = {
    "in-progress": "var(--simbl-in-progress-bg)",
    done: "var(--simbl-done-bg)",
    canceled: "var(--pico-color-red-550)",
  };
  const color = colors[status];
  if (!color) return "";
  const style = `background: ${color}; color: var(--pico-color-slate-50); padding: 2px 8px; border-radius: var(--pico-border-radius); font-size: 0.8em;`;
  return `<span style="${style}">${escapeHtml(status)}</span>`;
}

/**
 * Small status badge for relation links
 * Only shows badge for in-progress, done, and canceled statuses (not backlog)
 */
function getRelationStatusBadge(status: string): string {
  const colors: Record<string, string> = {
    "in-progress": "var(--simbl-in-progress-bg)",
    done: "var(--simbl-done-bg)",
    canceled: "var(--pico-color-red-550)",
  };
  const color = colors[status];
  if (!color) return "";
  const style = `background: ${color}; color: var(--pico-color-slate-50); padding: 2px 6px; border-radius: var(--pico-border-radius); font-size: 0.75em; margin-left: 0.5em;`;
  return `<span style="${style}" aria-label="${escapeHtml(status)} status">${escapeHtml(status)}</span>`;
}

/**
 * Project badge styling using SIMBL CSS variables
 * Non-interactive badge - use the project filter section to filter by project
 */
function getProjectBadge(project: string | undefined): string {
  if (!project) return "";
  return `<span
    class="project-badge"
    style="background: var(--simbl-project-bg-light); color: var(--simbl-project-text); padding: 2px 8px; border-radius: var(--pico-border-radius); font-size: 0.8em;"
  >${escapeHtml(project)}</span>`;
}

/**
 * Render a single task row
 */
export function renderTaskRow(task: Task): string {
  const priorityBadge = getPriorityBadge(task.reserved.priority);
  const statusBadge = getStatusBadge(task.status);
  const projectBadge = getProjectBadge(task.reserved.project);
  const badges = [priorityBadge, statusBadge, projectBadge]
    .filter(Boolean)
    .join(" ");

  return `
    <tr hx-get="/task/${escapeHtml(task.id)}"
        hx-target="#modal-container"
        hx-swap="innerHTML"
        style="cursor: pointer;">
      <td style="white-space: nowrap;"><code class="task-id">${escapeHtml(task.id)}</code></td>
      <td>${escapeHtml(task.title)}${badges ? " " + badges : ""}</td>
    </tr>
  `;
}

/**
 * Extract all unique priorities from tasks
 */
export function extractAllPriorities(tasks: Task[]): number[] {
  const prioritySet = new Set<number>();
  for (const task of tasks) {
    if (task.reserved.priority !== undefined) {
      prioritySet.add(task.reserved.priority);
    }
  }
  return Array.from(prioritySet).sort((a, b) => a - b);
}

/**
 * Extract all unique projects from tasks
 */
export function extractAllProjects(tasks: Task[]): string[] {
  const projectSet = new Set<string>();
  for (const task of tasks) {
    if (task.reserved.project) {
      projectSet.add(task.reserved.project);
    }
  }
  return Array.from(projectSet).sort();
}

/**
 * Render the priority filter buttons
 */
export function renderPriorityFilter(
  tasks: Task[],
  activePriority?: number
): string {
  const priorities = extractAllPriorities(tasks);

  if (priorities.length === 0) {
    return '<div id="priority-filter"></div>';
  }

  const priorityButtons = priorities
    .map((p) => {
      const isActive = activePriority === p;
      const suffix = getPriorityVarSuffix(p);
      const style = isActive
        ? `background: var(--simbl-${suffix}-bg); color: var(--simbl-${suffix}-text);`
        : `background: var(--simbl-${suffix}-bg-light); color: var(--simbl-${suffix}-text);`;
      // If active, clicking deselects (go to /tasks without priority filter)
      const targetUrl = isActive ? "/tasks" : `/tasks?priority=${p}`;
      // data-priority-filter always stores the priority number for keyboard cycling
      return `<button
      class="tag-btn"
      style="${style}"
      data-priority-filter="${p}"
      hx-get="${targetUrl}"
      hx-target="#tasks-container"
      hx-swap="innerHTML"
      hx-include="#search-input"
    >P${p}</button>`;
    })
    .join("");

  return `<div id="priority-filter">${priorityButtons}</div>`;
}

/**
 * Render the status filter buttons (backlog, in-progress, done)
 * Default view shows all tasks. Filters narrow the view.
 */
export function renderStatusFilter(activeStatus?: string): string {
  const statuses = [
    {
      value: "backlog",
      label: "backlog",
      bgVar: "--pico-color-slate-500",
      bgLightVar: "--pico-color-slate-100",
      textVar: "--pico-color-slate-600",
    },
    {
      value: "in-progress",
      label: "in-progress",
      bgVar: "--simbl-in-progress-bg",
      bgLightVar: "--simbl-in-progress-bg-light",
      textVar: "--simbl-in-progress-text",
    },
    {
      value: "done",
      label: "done",
      bgVar: "--simbl-done-bg",
      bgLightVar: "--simbl-done-bg-light",
      textVar: "--simbl-done-text",
    },
  ];

  const statusButtons = statuses
    .map((s) => {
      const isActive = activeStatus === s.value;
      const style = isActive
        ? `background: var(${s.bgVar}); color: var(--pico-color-slate-50);`
        : `background: var(${s.bgLightVar}); color: var(${s.textVar});`;
      // If active, clicking deselects (go to /tasks without status filter)
      const targetUrl = isActive ? "/tasks" : `/tasks?status=${s.value}`;
      return `<button
      class="tag-btn"
      style="${style}"
      hx-get="${targetUrl}"
      hx-target="#tasks-container"
      hx-swap="innerHTML"
      hx-include="#search-input"
    >${s.label}</button>`;
    })
    .join("");

  return `<div id="status-filter">${statusButtons}</div>`;
}

/**
 * Render the project filter buttons
 * Returns empty div when no projects exist (hides content but keeps container for OOB swaps)
 */
export function renderProjectFilter(
  tasks: Task[],
  activeProject?: string
): string {
  const projects = extractAllProjects(tasks);

  if (projects.length === 0) {
    return '<div id="project-filter" style="display: none;"></div>';
  }

  const projectButtons = projects
    .map((project) => {
      const isActive = activeProject === project;
      const style = isActive
        ? "background: var(--simbl-project-bg); color: var(--pico-color-slate-50);"
        : "background: var(--simbl-project-bg-light); color: var(--simbl-project-text);";
      // If active, clicking deselects (go to /tasks without project filter)
      const targetUrl = isActive
        ? "/tasks"
        : `/tasks?project=${encodeURIComponent(project)}`;
      return `<button
      class="tag-btn"
      style="${style}"
      hx-get="${targetUrl}"
      hx-target="#tasks-container"
      hx-swap="innerHTML"
      hx-include="#search-input"
    >${escapeHtml(project)}</button>`;
    })
    .join("");

  return `<div id="project-filter">${projectButtons}</div>`;
}

/**
 * Render the task list table
 */
export function renderTaskTable(
  tasks: Task[],
  sortBy: string = "id",
  sortDir: "asc" | "desc" = "asc",
  searchQuery?: string,
  tagFilter?: string,
  priorityFilter?: number,
  statusFilter?: string
): string {
  // Sort tasks: always section DESC (backlog before done) as primary, then user's choice
  const sorted = [...tasks].sort((a, b) => {
    // Primary sort: section DESC (backlog = 0, done = 1, so backlog comes first)
    const sectionOrder = { backlog: 0, done: 1 };
    const sectionA = sectionOrder[a.section as keyof typeof sectionOrder] ?? 0;
    const sectionB = sectionOrder[b.section as keyof typeof sectionOrder] ?? 0;
    if (sectionA !== sectionB) {
      return sectionA - sectionB; // backlog before done
    }

    // Secondary sort based on user's choice
    let cmp = 0;
    switch (sortBy) {
      case "id":
        cmp = a.id.localeCompare(b.id, undefined, { numeric: true });
        break;
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "priority":
        const pa = a.reserved.priority || 99;
        const pb = b.reserved.priority || 99;
        cmp = pa - pb;
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  const nextDir = (col: string) =>
    sortBy === col && sortDir === "asc" ? "desc" : "asc";
  const arrow = (col: string) =>
    sortBy === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  // Build query string preserving search, tag, priority, and status filters
  const buildSortUrl = (col: string) => {
    const params = new URLSearchParams();
    params.set("sort", col);
    params.set("dir", nextDir(col));
    if (searchQuery) params.set("q", searchQuery);
    if (tagFilter) params.set("tag", tagFilter);
    if (priorityFilter !== undefined)
      params.set("priority", String(priorityFilter));
    if (statusFilter) params.set("status", statusFilter);
    return `/tasks?${params.toString()}`;
  };

  const rows = sorted.map(renderTaskRow).join("");

  const idSortUrl = buildSortUrl("id");
  const titleSortUrl = buildSortUrl("title");

  return `
    <table id="task-list">
      <thead>
        <tr>
          <th hx-get="${idSortUrl}"
              hx-target="#tasks-container"
              hx-swap="innerHTML"
              style="cursor: pointer;">
            ID${arrow("id")}
          </th>
          <th hx-get="${titleSortUrl}"
              hx-target="#tasks-container"
              hx-swap="innerHTML"
              style="cursor: pointer;">
            Task${arrow("title")}
          </th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        ${sorted.length === 0
          ? '<tr><td colspan="2">No tasks found</td></tr>'
          : ""}
      </tbody>
    </table>
  `;
}

/**
 * Check if a tag is a reserved/special tag that should be hidden from tag cloud
 */
function isReservedTag(tag: string): boolean {
  // Priority tags: p1, p2, p3, etc.
  if (/^p[1-9]$/.test(tag)) return true;
  // Relation tags: depends-on-*, child-of-*
  if (tag.startsWith("depends-on-")) return true;
  if (tag.startsWith("child-of-")) return true;
  // Project tags: project:xxx
  if (tag.startsWith("project:")) return true;
  // Status tags (in-progress and canceled affect workflow, refined is metadata and should be shown)
  if (tag === "in-progress" || tag === "canceled") return true;
  return false;
}

/**
 * Extract all unique tags from tasks (excluding reserved tags like priority)
 */
export function extractAllTags(tasks: Task[]): string[] {
  const tagSet = new Set<string>();
  for (const task of tasks) {
    for (const tag of task.tags) {
      // Filter out reserved tags from tag cloud
      if (!isReservedTag(tag)) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Render the tag cloud
 */
export function renderTagCloud(tasks: Task[], activeTag?: string): string {
  const tags = extractAllTags(tasks);

  if (tags.length === 0) {
    return "<p><em>No tags</em></p>";
  }

  const tagButtons = tags
    .map((tag) => {
      const isActive = activeTag === tag;
      const style = isActive
        ? "background: var(--simbl-tag-bg); color: var(--pico-color-slate-50);"
        : "background: var(--simbl-tag-bg-light); color: var(--simbl-tag-text);";
      // If active, clicking deselects (go to /tasks without tag filter)
      const targetUrl = isActive
        ? "/tasks"
        : `/tasks?tag=${encodeURIComponent(tag)}`;
      return `<button
      class="tag-btn"
      style="${style}"
      hx-get="${targetUrl}"
      hx-target="#tasks-container"
      hx-swap="innerHTML"
      hx-include="#search-input"
    >${escapeHtml(tag)}</button>`;
    })
    .join("");

  return `<div id="tag-cloud">${tagButtons}</div>`;
}

/**
 * Render the task detail modal (editable version)
 */
export function renderTaskModal(
  task: Task,
  allTasks: Task[],
  showSaved = false
): string {
  const savedIndicator = showSaved ? "Saved ✓" : "";
  // Tags display (excluding priority, in-progress, and project which are shown separately)
  const displayTags = task.tags.filter(
    (t) =>
      !t.match(/^p[1-9]$/) && t !== "in-progress" && !t.startsWith("project:")
  );

  // Priority display with CRUD
  const currentPriority = task.reserved.priority;

  // Default priorities: 1, 2, 3. Add higher priorities if they exist in backlog.
  const existingPriorities = new Set(
    allTasks
      .map((t) => t.reserved.priority)
      .filter((p): p is number => p !== undefined)
  );
  const priorities = [1, 2, 3];
  for (let p = 4; p <= 9; p++) {
    if (existingPriorities.has(p)) priorities.push(p);
  }

  // Gather all unique tags for autocomplete (excluding current task's tags)
  const allTagsSet = new Set<string>();
  // Add reserved/special tags
  ['in-progress', 'refined', 'needs-refinement', 'canceled'].forEach(t => allTagsSet.add(t));
  // Add all tags from all tasks
  allTasks.forEach(t => t.tags.forEach(tag => allTagsSet.add(tag)));
  // Remove tags the current task already has
  task.tags.forEach(t => allTagsSet.delete(t));
  // Sort alphabetically
  const autocompleteTags = Array.from(allTagsSet).sort();

  // Priority buttons using tag-btn class for smaller sizing
  const priorityButtons = priorities
    .map((p) => {
      const isActive = currentPriority === p;
      const suffix = getPriorityVarSuffix(p);
      const style = isActive
        ? `background: var(--simbl-${suffix}-bg); color: var(--simbl-${suffix}-text);`
        : `background: var(--simbl-${suffix}-bg-light); color: var(--simbl-${suffix}-text);`;
      const priorityUrl = `/task/${escapeHtml(task.id)}/priority/${p}`;
      return `<button
      class="tag-btn"
      hx-post="${priorityUrl}"
      hx-target="#modal-container"
      hx-swap="innerHTML"
      style="${style}"
      title="${isActive ? "Current priority" : `Set to P${p}`}"
    >P${p}</button>`;
    })
    .join("");
  const clearPriorityUrl = `/task/${escapeHtml(task.id)}/priority`;
  const clearPriorityBtn = currentPriority
    ? `<button
        class="tag-btn"
        hx-delete="${clearPriorityUrl}"
        hx-target="#modal-container"
        hx-swap="innerHTML"
        style="background: transparent; color: #6c757d;"
        title="Remove priority"
      >&times;</button>`
    : "";
  const priorityHtml = `${priorityButtons}${clearPriorityBtn}`;

  // Status display
  const statusColor = getStatusColor(task.status);
  const statusStyle = `background: ${statusColor}; color: var(--pico-color-slate-50); padding: 4px 12px; border-radius: var(--pico-border-radius);`;
  const statusHtml = `<span style="${statusStyle}">${escapeHtml(task.status)}</span>`;

  // Relations section
  const relationsHtml: string[] = [];

  // Parent
  if (task.reserved.parentId) {
    const parentTask = allTasks.find((t) => t.id === task.reserved.parentId);
    const parentTitle = parentTask ? parentTask.title : "";
    const parentStatusBadge = parentTask ? getRelationStatusBadge(parentTask.status) : "";
    const parentUrl = `/task/${escapeHtml(task.reserved.parentId)}`;
    relationsHtml.push(`
      <div style="margin-bottom: 0.5rem;">
        <strong>Parent:</strong>
        <a href="#" class="relation-link" hx-get="${parentUrl}" hx-target="#modal-container" hx-swap="innerHTML" style="text-decoration: none;">
          <code>${escapeHtml(task.reserved.parentId)}</code><span class="relation-title">${escapeHtml(parentTitle)}</span>${parentStatusBadge}
        </a>
      </div>
    `);
  }

  // Dependencies
  if (task.reserved.dependsOn.length > 0) {
    const deps = task.reserved.dependsOn
      .map((depId) => {
        const depTask = allTasks.find((t) => t.id === depId);
        const depTitle = depTask ? depTask.title : "";
        const depStatusBadge = depTask ? getRelationStatusBadge(depTask.status) : "";
        const depUrl = `/task/${escapeHtml(depId)}`;
        return `<a href="#" class="relation-link" hx-get="${depUrl}" hx-target="#modal-container" hx-swap="innerHTML" style="text-decoration: none;"><code>${escapeHtml(depId)}</code><span class="relation-title">${escapeHtml(depTitle)}</span>${depStatusBadge}</a>`;
      })
      .join("");
    relationsHtml.push(`
      <div style="margin-bottom: 0.5rem;">
        <strong>Blocked by:</strong>
        <div style="margin-left: var(--pico-spacing);">${deps}</div>
      </div>
    `);
  }

  // Children (find tasks that have this task as parent)
  const children = allTasks.filter((t) => t.reserved.parentId === task.id);
  if (children.length > 0) {
    const childLinks = children
      .map((child) => {
        const childStatusBadge = getRelationStatusBadge(child.status);
        const childUrl = `/task/${escapeHtml(child.id)}`;
        return `<a href="#" class="relation-link" hx-get="${childUrl}" hx-target="#modal-container" hx-swap="innerHTML" style="text-decoration: none;"><code>${escapeHtml(child.id)}</code><span class="relation-title">${escapeHtml(child.title)}</span>${childStatusBadge}</a>`;
      })
      .join("");
    relationsHtml.push(`
      <div style="margin-bottom: 0.5rem;">
        <strong>Children:</strong>
        <div style="margin-left: var(--pico-spacing);">${childLinks}</div>
      </div>
    `);
  }

  // Gather all unique projects for autocomplete
  const allProjectsSet = new Set<string>();
  allTasks.forEach(t => {
    if (t.reserved.project) allProjectsSet.add(t.reserved.project);
  });
  const autocompleteProjects = Array.from(allProjectsSet).sort();

  // Project badge with CRUD controls
  const projectDeleteUrl = `/task/${escapeHtml(task.id)}/project`;
  const projectHtml = task.reserved.project
    ? `<span class="tag-badge" style="background: var(--simbl-project-bg-light); color: var(--simbl-project-text);">
        ${escapeHtml(task.reserved.project)}
        <button
          hx-delete="${projectDeleteUrl}"
          hx-target="#modal-container"
          hx-swap="innerHTML"
          style="background: none; border: none; padding: 0; cursor: pointer; font-size: 1em; line-height: 1; color: var(--simbl-project-text);"
          title="Remove from project"
        >&times;</button>
      </span>`
    : "";

  // Project input form (for adding/changing project)
  const projectDatalistOptions = autocompleteProjects.map(p => `<option value="${escapeHtml(p)}">`).join('');
  const projectPostUrl = `/task/${escapeHtml(task.id)}/project`;
  const projectInputHtml = `<form
    hx-post="${projectPostUrl}"
    hx-target="#modal-container"
    hx-swap="innerHTML"
    style="display: inline-flex; gap: .2rem; margin: 0; align-items: center;"
  >
    <input
      type="text"
      name="project"
      placeholder="${task.reserved.project ? 'change project' : 'add to project'}"
      list="project-suggestions-${escapeHtml(task.id)}"
      autocomplete="off"
      style="padding: .2rem .4rem; font-size: 0.85em; width: 8rem; margin: 0; height: auto;"
    >
    <datalist id="project-suggestions-${escapeHtml(task.id)}">
      ${projectDatalistOptions}
    </datalist>
    <button type="submit" class="tag-btn" style="background: var(--simbl-project-bg-light); color: var(--simbl-project-text);">${task.reserved.project ? '↻' : '+'}</button>
  </form>`;

  // Parse log entries and strip from display content
  const logEntries = parseTaskLog(task.content);
  const displayContent = shiftHeadingsForDisplay(stripTaskLog(task.content));

  // Tag badges with remove buttons
  const tagBadgesHtml = displayTags.length > 0
    ? displayTags
        .map((t) => {
          const tagDeleteUrl = `/task/${escapeHtml(task.id)}/tag/${encodeURIComponent(t)}`;
          return `<span class="tag-badge">
                  ${escapeHtml(t)}
                  <button
                    hx-delete="${tagDeleteUrl}"
                    hx-target="#modal-container"
                    hx-swap="innerHTML"
                    style="background: none; border: none; padding: 0; cursor: pointer; font-size: 1em; line-height: 1; color: var(--simbl-tag-text);"
                    title="Remove tag"
                  >&times;</button>
                </span>`;
        })
        .join("")
    : '<em style="color: var(--pico-muted-color);">No tags</em>';

  // Tag autocomplete datalist
  const tagDatalistOptions = autocompleteTags.map(t => `<option value="${escapeHtml(t)}">`).join('');

  // Action buttons based on task state
  const inProgressUrl = `/task/${escapeHtml(task.id)}/in-progress`;
  const doneUrl = `/task/${escapeHtml(task.id)}/done`;
  const backlogUrl = `/task/${escapeHtml(task.id)}/backlog`;
  const cancelUrl = `/task/${escapeHtml(task.id)}/cancel`;
  const archiveUrl = `/task/${escapeHtml(task.id)}`;

  let actionButtonsHtml: string;
  if (task.section === "done") {
    actionButtonsHtml = `<button
                   hx-post="${inProgressUrl}"
                   hx-target="#modal-container"
                   hx-swap="innerHTML"
                   class="tag-btn"
                   style="background: var(--simbl-in-progress-bg-light); color: var(--simbl-in-progress-text);"
                 >⬅ Back to In-Progress</button>
                 <button
                   onclick="showConfirmDialog('Archive Task', 'This will permanently remove this task. This cannot be undone. Continue?', '${archiveUrl}', 'DELETE', true)"
                   class="tag-btn"
                   style="background: transparent; color: var(--pico-del-color); border: 1px solid var(--pico-del-color);"
                 >✖️ Archive</button>`;
  } else if (task.status === "in-progress") {
    actionButtonsHtml = `<button
                   hx-post="${doneUrl}"
                   hx-target="#modal-container"
                   hx-swap="innerHTML"
                   class="tag-btn"
                   style="background: var(--simbl-done-bg-light); color: var(--simbl-done-text);"
                 >✔ Mark Done</button>
                 <button
                   hx-post="${backlogUrl}"
                   hx-target="#modal-container"
                   hx-swap="innerHTML"
                   class="tag-btn"
                   style="background: var(--pico-color-slate-100); color: var(--pico-color-slate-600);"
                 >⬅ Back to Backlog</button>
                 <button
                   onclick="showConfirmDialog('Cancel Task', 'Mark this task as canceled and move it to Done?', '${cancelUrl}', 'POST', false)"
                   class="tag-btn"
                   style="background: transparent; color: var(--pico-del-color); border: 1px solid var(--pico-del-color);"
                 >✖ Cancel</button>`;
  } else {
    actionButtonsHtml = `<button
                   hx-post="${inProgressUrl}"
                   hx-target="#modal-container"
                   hx-swap="innerHTML"
                   class="tag-btn"
                   style="background: var(--simbl-in-progress-bg-light); color: var(--simbl-in-progress-text);"
                 >⮕ Move to In-Progress</button>
                 <button
                   hx-post="${doneUrl}"
                   hx-target="#modal-container"
                   hx-swap="innerHTML"
                   class="tag-btn"
                   style="background: var(--simbl-done-bg-light); color: var(--simbl-done-text);"
                 >✔ Mark Done</button>
                 <button
                   onclick="showConfirmDialog('Cancel Task', 'Mark this task as canceled and move it to Done?', '${cancelUrl}', 'POST', false)"
                   class="tag-btn"
                   style="background: transparent; color: var(--pico-del-color); border: 1px solid var(--pico-del-color);"
                 >✖ Cancel</button>`;
  }

  // Relations section HTML
  const relationsSectionHtml = relationsHtml.length > 0
    ? `
          <hr style="margin: var(--pico-spacing) 0;">
          <h4 style="margin-bottom: 0.5rem;">Relations</h4>
          ${relationsHtml.join("")}
        `
    : "";

  // URL for task updates
  const taskPatchUrl = `/task/${escapeHtml(task.id)}`;
  const tagPostUrl = `/task/${escapeHtml(task.id)}/tag`;
  const escapedTaskId = escapeHtml(task.id);

  return `
    <dialog id="modal-dialog" open>
      <article id="modal-content" data-task-id="${escapedTaskId}">
        <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--pico-spacing);">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <h2 style="margin: 0;">
                <code
                  class="task-id task-id-clickable"
                  onclick="copyTaskId('${escapedTaskId}', this)"
                  title="Click to copy task ID"
                  role="button"
                  tabindex="0"
                  onkeydown="if(event.key==='Enter'||event.key===' '){copyTaskId('${escapedTaskId}', this);event.preventDefault();}"
                >${escapedTaskId}</code>
              </h2>
              <span id="save-indicator-${escapedTaskId}" class="save-indicator">${savedIndicator
    ? `<span class="save-indicator">${savedIndicator}</span>`
    : ""}</span>
            </div>
            <div style="margin-top: 0.5rem;">
              <input
                type="text"
                name="title"
                value="${escapeHtml(task.title)}"
                placeholder="Task title..."
                hx-patch="${taskPatchUrl}"
                hx-trigger="input changed delay:500ms, blur"
                hx-target="#save-indicator-${escapedTaskId}"
                hx-swap="outerHTML"
                class="modal-title-input"
              >
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button
              onclick="toggleModalMaximize()"
              class="modal-close-btn"
              id="modal-maximize-btn"
              aria-label="Maximize modal"
              aria-pressed="false"
              title="Maximize"
            >⛶</button>
            <button
              onclick="closeModal()"
              class="modal-close-btn"
              aria-label="Close modal"
            >&times;</button>
          </div>
        </header>

        <div style="display: flex; align-items: center; gap: calc(var(--pico-spacing) / 2); margin-bottom: var(--pico-spacing); flex-wrap: wrap;">
          ${statusHtml}
          <div style="margin-left: auto; display: flex; gap: calc(var(--pico-spacing) / 2); flex-wrap: wrap;">
            ${actionButtonsHtml}
          </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: calc(var(--pico-spacing) / 2); margin-bottom: var(--pico-spacing);">
          <strong style="margin-right: 4px;">Priority</strong>
          ${priorityHtml}
          <span style="margin-left: calc(var(--pico-spacing) / 2);"></span>
          <strong style="margin-right: 4px;">Project</strong>
          ${projectHtml}
          ${projectInputHtml}
          <span style="margin-left: calc(var(--pico-spacing) / 2);"></span>
          <strong style="margin-right: 4px;">Tags</strong>
          ${tagBadgesHtml}
          <form
            hx-post="${tagPostUrl}"
            hx-target="#modal-container"
            hx-swap="innerHTML"
            style="display: inline-flex; gap: .2rem; margin: 0; align-items: center;"
          >
            <input
              type="text"
              name="tag"
              placeholder="add tag"
              list="tag-suggestions-${escapedTaskId}"
              autocomplete="off"
              style="padding: .2rem .4rem; font-size: 0.85em; width: 7rem; margin: 0; height: auto;"
            >
            <datalist id="tag-suggestions-${escapedTaskId}">
              ${tagDatalistOptions}
            </datalist>
            <button type="submit" class="tag-btn" style="background: var(--simbl-tag-bg-light); color: var(--simbl-tag-text);">+</button>
          </form>
        </div>

        ${relationsSectionHtml}

        <hr style="margin: var(--pico-spacing) 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <h4 style="margin: 0;">Content</h4>
          <span id="content-save-indicator-${escapedTaskId}" class="save-indicator"></span>
        </div>
        <textarea
          name="content"
          placeholder="Task content (markdown)..."
          hx-patch="${taskPatchUrl}"
          hx-trigger="input changed delay:500ms, blur"
          hx-target="#content-save-indicator-${escapedTaskId}"
          hx-swap="outerHTML"
          class="content-textarea"
        >${escapeHtml(displayContent)}</textarea>

        ${renderTaskLog(logEntries)}
      </article>
    </dialog>
  `;
}

/**
 * Get status color using Pico CSS color variables
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    backlog: "var(--pico-color-slate-500)",
    "in-progress": "var(--simbl-in-progress-bg)",
    done: "var(--simbl-done-bg)",
    canceled: "var(--pico-color-red-550)",
  };
  return colors[status] || "var(--pico-color-slate-500)";
}

/**
 * Render the add task form modal
 */
export function renderAddTaskForm(): string {
  // Generate priority buttons for P1-P3
  const priorityButtons = [1, 2, 3]
    .map((p) => {
      const suffix = getPriorityVarSuffix(p);
      const style = `background: var(--simbl-${suffix}-bg-light); color: var(--simbl-${suffix}-text);`;
      return `<button
        type="button"
        class="tag-btn add-task-priority-btn"
        data-priority="${p}"
        style="${style}"
        title="Set priority P${p}"
        onclick="selectAddTaskPriority(${p})"
      >P${p}</button>`;
    })
    .join("");

  // Script content is static and trusted, use $${}
  const scriptContent = `
      function selectAddTaskPriority(p) {
        // Update hidden input
        document.getElementById('add-task-priority').value = p;
        // Update button styles
        document.querySelectorAll('.add-task-priority-btn').forEach(btn => {
          const btnP = parseInt(btn.dataset.priority);
          const suffix = btnP >= 5 ? 'p5-and-up' : 'p' + btnP;
          if (btnP === p) {
            btn.style.background = 'var(--simbl-' + suffix + '-bg)';
          } else {
            btn.style.background = 'var(--simbl-' + suffix + '-bg-light)';
          }
        });
        // Show clear button
        document.getElementById('add-task-priority-clear').style.display = 'inline-block';
      }
      function clearAddTaskPriority() {
        // Clear hidden input
        document.getElementById('add-task-priority').value = '';
        // Reset button styles
        document.querySelectorAll('.add-task-priority-btn').forEach(btn => {
          const btnP = parseInt(btn.dataset.priority);
          const suffix = btnP >= 5 ? 'p5-and-up' : 'p' + btnP;
          btn.style.background = 'var(--simbl-' + suffix + '-bg-light)';
        });
        // Hide clear button
        document.getElementById('add-task-priority-clear').style.display = 'none';
      }
    `;

  return `
    <dialog id="modal-dialog" open>
      <article id="modal-content" style="max-width: 700px;">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--pico-spacing);">
          <h2 style="margin: 0;">Add Task</h2>
          <button
            onclick="closeModal()"
            class="modal-close-btn"
            aria-label="Close modal"
          >&times;</button>
        </header>

        <form hx-post="/task" hx-target="#tasks-container" hx-swap="innerHTML">
          <label>
            Title <span style="color: var(--pico-del-color);">*</span>
            <input type="text" name="title" placeholder="Task title..." required autofocus>
          </label>
          <div style="margin-bottom: var(--pico-spacing);">
            <label style="margin-bottom: calc(var(--pico-spacing) / 2);">Priority <small style="color: var(--pico-muted-color);">(optional)</small></label>
            <input type="hidden" name="priority" id="add-task-priority" value="">
            <div style="display: flex; gap: calc(var(--pico-spacing) / 4); align-items: center;">
              ${priorityButtons}
              <button
                type="button"
                class="tag-btn"
                id="add-task-priority-clear"
                style="background: transparent; color: var(--pico-muted-color); display: none;"
                title="Clear priority"
                onclick="clearAddTaskPriority()"
              >&times;</button>
            </div>
          </div>
          <label>
            Tags <small style="color: var(--pico-muted-color);">(comma separated)</small>
            <input type="text" name="tags" placeholder="e.g. feature, auth">
          </label>
          <label>
            Content <small style="color: var(--pico-muted-color);">(markdown)</small>
            <textarea name="content" placeholder="Task description, notes, acceptance criteria..." rows="6" style="font-family: monospace;"></textarea>
          </label>
          <div style="display: flex; gap: calc(var(--pico-spacing) / 2); justify-content: flex-end; margin-top: var(--pico-spacing);">
            <button type="button" class="secondary" onclick="closeModal()">Cancel</button>
            <button type="submit">Create Task</button>
          </div>
        </form>
      </article>
    </dialog>
    <script>${scriptContent}</script>
  `;
}
