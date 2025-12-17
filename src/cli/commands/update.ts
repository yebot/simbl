import { defineCommand } from 'citty';
import { readFileSync, writeFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, serializeSimblFile, findTaskById } from '../../core/parser.ts';
import { appendOrBatchLogEntry, stripTaskLog } from '../../core/log.ts';

/**
 * Normalize heading levels in content.
 * Task content must use H3+ (H1 is for sections, H2 is for tasks).
 * This shifts all headings down by 2 levels:
 *   # H1 → ### H3
 *   ## H2 → #### H4
 *   ### H3 → ##### H5
 */
function normalizeHeadings(content: string): string {
  return content.replace(/^(#{1,6})\s/gm, (_match, hashes) => {
    const level = hashes.length;
    const newLevel = Math.min(level + 2, 6); // Cap at H6
    return '#'.repeat(newLevel) + ' ';
  });
}

export const updateCommand = defineCommand({
  meta: {
    name: 'update',
    description: 'Update task title or content',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID to update',
      required: true,
    },
    title: {
      type: 'string',
      alias: 't',
      description: 'New title for the task',
    },
    content: {
      type: 'string',
      alias: 'c',
      description: 'New content for the task (replaces existing content)',
    },
    append: {
      type: 'string',
      alias: 'a',
      description: 'Append content to existing content',
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

    if (!args.title && !args.content && !args.append) {
      console.error('Provide --title, --content, or --append to update.');
      process.exit(1);
    }

    const paths = getSimblPaths(simblDir);
    const content = readFileSync(paths.tasks, 'utf-8');
    const file = parseSimblFile(content);

    const task = findTaskById(file, args.id);

    if (!task) {
      console.error(`Task "${args.id}" not found.`);
      process.exit(1);
    }

    const changes: string[] = [];

    if (args.title) {
      task.title = args.title;
      changes.push('title');
      // Add batched log entry for title change
      task.content = appendOrBatchLogEntry(task.content, 'Title updated');
    }

    if (args.content) {
      // Strip existing log before replacing content, then add log entry
      const existingLog = task.content;
      const userContent = normalizeHeadings(args.content);
      // Preserve log section by stripping from old, adding to new
      const logSection = existingLog.includes('\n***\n\ntask-log\n')
        ? existingLog.slice(existingLog.indexOf('\n***\n\ntask-log\n'))
        : '';
      task.content = userContent + logSection;
      task.content = appendOrBatchLogEntry(task.content, 'Content updated');
      changes.push('content');
    }

    if (args.append) {
      const normalizedAppend = normalizeHeadings(args.append);
      const userContent = stripTaskLog(task.content);
      if (userContent) {
        task.content = userContent + '\n\n' + normalizedAppend;
      } else {
        task.content = normalizedAppend;
      }
      // Restore log section and add entry
      task.content = appendOrBatchLogEntry(task.content, 'Content updated');
      changes.push('content (appended)');
    }

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    if (args.json) {
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    console.log(`✓ Updated "${args.id}": ${changes.join(', ')}`);
  },
});
