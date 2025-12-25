import { defineCommand } from 'citty';
import { readFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, getAllTasks } from '../../core/parser.ts';
import { sanitizeObjectForJson } from '../../core/sanitize.ts';
import { needsMigration } from '../../core/migrate.ts';
import type { Task } from '../../core/task.ts';

/**
 * Sort tasks by priority (DESC) then by ID number (ASC)
 */
function sortBacklogTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Priority: higher priority (lower number) first, undefined last
    const aPriority = a.reserved.priority ?? 10;
    const bPriority = b.reserved.priority ?? 10;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // ID number: ascending
    const aNum = extractIdNum(a.id);
    const bNum = extractIdNum(b.id);
    return aNum - bNum;
  });
}

/**
 * Sort done tasks by ID number (DESC)
 */
function sortDoneTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aNum = extractIdNum(a.id);
    const bNum = extractIdNum(b.id);
    return bNum - aNum;
  });
}

/**
 * Extract numeric part from task ID
 */
function extractIdNum(id: string): number {
  const match = id.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Format a task for brief display (default: one line)
 */
function formatTaskBrief(task: Task): string {
  const title = task.title || '(no title)';
  let line = `${task.id} ${title}`;

  if (task.tags.length > 0) {
    const tagStr = task.tags.map((t) => `[${t}]`).join('');
    line += `  ${tagStr}`;
  }

  return line;
}

/**
 * Format a task with full content
 */
function formatTaskFull(task: Task): string {
  const parts: string[] = [];

  // ID and title
  const title = task.title || '(no title)';
  parts.push(`## ${task.id} ${title}`);

  // Tags
  if (task.tags.length > 0) {
    const tagStr = task.tags.map((t) => `[${t}]`).join('');
    parts.push(tagStr);
  }

  // Full content
  if (task.content) {
    parts.push('');
    parts.push(task.content);
  }

  return parts.join('\n');
}

/**
 * Filter tasks based on criteria
 */
function filterTasks(
  tasks: Task[],
  options: {
    tag?: string;
    project?: string;
    search?: string;
    status?: string;
  }
): Task[] {
  let filtered = tasks;

  if (options.tag) {
    filtered = filtered.filter((t) => t.tags.includes(options.tag!));
  }

  if (options.project) {
    filtered = filtered.filter((t) => t.reserved.project === options.project);
  }

  if (options.status) {
    filtered = filtered.filter((t) => t.status === options.status);
  }

  if (options.search) {
    const searchLower = options.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.id.toLowerCase().includes(searchLower) ||
        t.title.toLowerCase().includes(searchLower) ||
        t.content.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
}

export const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List all tasks',
  },
  args: {
    tag: {
      type: 'string',
      alias: 't',
      description: 'Filter by tag',
    },
    project: {
      type: 'string',
      alias: 'p',
      description: 'Filter by project',
    },
    search: {
      type: 'string',
      alias: 's',
      description: 'Search in ID, title, and content',
    },
    status: {
      type: 'string',
      description: 'Filter by status (backlog, in-progress, done, canceled)',
    },
    full: {
      type: 'boolean',
      alias: 'f',
      description: 'Show full task content',
      default: false,
    },
    ids: {
      type: 'boolean',
      description: 'Show only task IDs (minimal output)',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const simblDir = findSimblDir();

    if (!simblDir) {
      console.error('No .simbl directory found. Run `simbl init` first.');
      process.exit(1);
    }

    const paths = getSimblPaths(simblDir);
    const content = readFileSync(paths.tasks, 'utf-8');
    const file = parseSimblFile(content);

    // Determine output format
    const formatTask = args.ids
      ? (t: Task) => t.id
      : args.full
        ? formatTaskFull
        : formatTaskBrief;

    // Apply filters
    const hasFilters = args.tag || args.project || args.search || args.status;

    if (hasFilters) {
      // When filtering, show all matching tasks together
      const allTasks = getAllTasks(file);
      const filtered = filterTasks(allTasks, {
        tag: args.tag,
        project: args.project,
        search: args.search,
        status: args.status,
      });

      if (args.json) {
        console.log(JSON.stringify(sanitizeObjectForJson(filtered), null, 2));
        return;
      }

      if (filtered.length === 0) {
        console.log('No tasks match the filter criteria.');
        return;
      }

      if (args.ids) {
        // IDs only: one per line, no header
        for (const task of filtered) {
          console.log(task.id);
        }
        return;
      }

      console.log(`Found ${filtered.length} task(s):\n`);
      for (const task of filtered) {
        console.log(formatTask(task));
        if (args.full) console.log('');
      }

      // Check for pending migration
      const migrationNeeded = await needsMigration(simblDir);
      if (migrationNeeded) {
        console.log('\n⚠ Embedded logs detected. Run `simbl migrate-logs` to upgrade.');
      }
      return;
    }

    // Default view: grouped by section
    if (args.json) {
      console.log(JSON.stringify(sanitizeObjectForJson(file), null, 2));
      return;
    }

    // Backlog section
    const backlogSorted = sortBacklogTasks(file.backlog);

    if (args.ids) {
      // IDs only: just list them
      for (const task of backlogSorted) {
        console.log(task.id);
      }
      for (const task of sortDoneTasks(file.done)) {
        console.log(task.id);
      }
      return;
    }

    console.log('# Backlog\n');

    if (backlogSorted.length === 0) {
      console.log('  (no tasks)\n');
    } else {
      for (const task of backlogSorted) {
        console.log(formatTask(task));
        if (args.full) console.log('');
      }
      if (!args.full) console.log('');
    }

    // Done section
    const doneSorted = sortDoneTasks(file.done);
    console.log('# Done\n');

    if (doneSorted.length === 0) {
      console.log('  (no tasks)\n');
    } else {
      for (const task of doneSorted) {
        console.log(formatTask(task));
        if (args.full) console.log('');
      }
    }

    // Check for pending migration (only in human-readable mode)
    const migrationNeeded = await needsMigration(simblDir);
    if (migrationNeeded) {
      console.log('\n⚠ Embedded logs detected. Run `simbl migrate-logs` to upgrade.');
    }
  },
});
