import { defineCommand } from 'citty';
import { readFileSync, writeFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, serializeSimblFile, findTaskById } from '../../core/parser.ts';

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
    }

    if (args.content) {
      task.content = normalizeHeadings(args.content);
      changes.push('content');
    }

    if (args.append) {
      const normalizedAppend = normalizeHeadings(args.append);
      if (task.content) {
        task.content = task.content + '\n\n' + normalizedAppend;
      } else {
        task.content = normalizedAppend;
      }
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
