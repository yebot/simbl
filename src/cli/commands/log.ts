import { defineCommand } from 'citty';
import { findSimblDir } from '../../core/config.ts';
import { readLogFile, getTaskLog, type FileLogEntry } from '../../core/log.ts';
import { sanitizeObjectForJson } from '../../core/sanitize.ts';

/**
 * Group entries by date for cleaner display
 */
function groupEntriesByDate(entries: FileLogEntry[]): Map<string, FileLogEntry[]> {
  const groups = new Map<string, FileLogEntry[]>();

  for (const entry of entries) {
    const dateKey = entry.timestamp.toISOString().split('T')[0];
    const existing = groups.get(dateKey) || [];
    existing.push(entry);
    groups.set(dateKey, existing);
  }

  return groups;
}

/**
 * Format grouped entries for display
 */
function formatGroupedEntries(groups: Map<string, FileLogEntry[]>, showTaskId: boolean): string {
  const lines: string[] = [];

  for (const [dateKey, entries] of groups) {
    lines.push(`\n${dateKey}`);
    lines.push('-'.repeat(10));

    for (const entry of entries) {
      const time = entry.timestamp.toTimeString().slice(0, 8);
      const taskPart = showTaskId ? ` [${entry.taskId}]` : '';
      lines.push(`  ${time}${taskPart} - ${entry.message}`);
    }
  }

  return lines.join('\n');
}

/**
 * Calculate stats summary
 */
function getStatsSummary(entries: FileLogEntry[]): string {
  if (entries.length === 0) {
    return 'No log entries';
  }

  // Get date range
  const timestamps = entries.map((e) => e.timestamp.getTime());
  const oldest = new Date(Math.min(...timestamps));
  const newest = new Date(Math.max(...timestamps));
  const daysDiff = Math.ceil((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));

  // Count unique tasks
  const uniqueTasks = new Set(entries.map((e) => e.taskId)).size;

  if (daysDiff <= 1) {
    return `${entries.length} event(s) across ${uniqueTasks} task(s) today`;
  }

  return `${entries.length} event(s) across ${uniqueTasks} task(s) over ${daysDiff} day(s)`;
}

export const logCommand = defineCommand({
  meta: {
    name: 'log',
    description: 'Display task log entries',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID (optional with --all)',
      required: false,
    },
    all: {
      type: 'boolean',
      description: 'Show logs for all tasks',
      default: false,
    },
    since: {
      type: 'string',
      description: 'Show entries since date (YYYY-MM-DD)',
    },
    until: {
      type: 'string',
      description: 'Show entries until date (YYYY-MM-DD)',
    },
    limit: {
      type: 'string',
      alias: 'n',
      description: 'Limit number of entries',
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

    // Validate args
    if (!args.all && !args.id) {
      console.error('Provide a task ID or use --all to show all logs.');
      console.error('Usage: simbl log <task-id>');
      console.error('       simbl log --all');
      process.exit(1);
    }

    // Get entries
    let entries: FileLogEntry[];
    if (args.all) {
      entries = await readLogFile(simblDir);
    } else {
      entries = await getTaskLog(simblDir, args.id!);
    }

    // Filter by date range
    if (args.since) {
      const sinceDate = new Date(args.since);
      if (isNaN(sinceDate.getTime())) {
        console.error(`Invalid date format for --since: ${args.since}`);
        process.exit(1);
      }
      sinceDate.setHours(0, 0, 0, 0);
      entries = entries.filter((e) => e.timestamp >= sinceDate);
    }

    if (args.until) {
      const untilDate = new Date(args.until);
      if (isNaN(untilDate.getTime())) {
        console.error(`Invalid date format for --until: ${args.until}`);
        process.exit(1);
      }
      untilDate.setHours(23, 59, 59, 999);
      entries = entries.filter((e) => e.timestamp <= untilDate);
    }

    // Sort newest first for display
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (args.limit) {
      const limit = parseInt(args.limit, 10);
      if (isNaN(limit) || limit < 1) {
        console.error(`Invalid limit: ${args.limit}`);
        process.exit(1);
      }
      entries = entries.slice(0, limit);
    }

    // JSON output
    if (args.json) {
      const jsonEntries = entries.map((e) => ({
        taskId: e.taskId,
        timestamp: e.timestamp.toISOString(),
        message: e.message,
      }));

      const output = args.all
        ? { entries: jsonEntries, count: jsonEntries.length }
        : { taskId: args.id, entries: jsonEntries, count: jsonEntries.length };

      console.log(JSON.stringify(sanitizeObjectForJson(output), null, 2));
      return;
    }

    // Human-readable output
    if (entries.length === 0) {
      if (args.all) {
        console.log('No log entries found.');
      } else {
        console.log(`No log entries for "${args.id}".`);
      }
      return;
    }

    // Header
    if (args.all) {
      console.log('All task logs');
    } else {
      console.log(`Log for "${args.id}"`);
    }

    // Stats summary
    console.log(getStatsSummary(entries));

    // Group and display
    const groups = groupEntriesByDate(entries);
    console.log(formatGroupedEntries(groups, args.all));
  },
});
