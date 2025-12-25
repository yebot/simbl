import { defineCommand } from 'citty';
import { readFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, findTaskById } from '../../core/parser.ts';
import { sanitizeObjectForJson } from '../../core/sanitize.ts';

export const showCommand = defineCommand({
  meta: {
    name: 'show',
    description: 'Show full details of a single task',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID to show',
      required: true,
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

    const task = findTaskById(file, args.id);

    if (!task) {
      console.error(`Task "${args.id}" not found.`);
      process.exit(1);
    }

    if (args.json) {
      console.log(JSON.stringify(sanitizeObjectForJson(task), null, 2));
      return;
    }

    // Full task display
    console.log(`## ${task.id} ${task.title}`);
    console.log('');

    if (task.tags.length > 0) {
      const tagStr = task.tags.map((t) => `[${t}]`).join('');
      console.log(tagStr);
      console.log('');
    }

    // Metadata
    console.log(`Status: ${task.status}`);
    if (task.reserved.priority) {
      console.log(`Priority: ${task.reserved.priority}`);
    }
    if (task.reserved.project) {
      console.log(`Project: ${task.reserved.project}`);
    }
    if (task.reserved.parentId) {
      console.log(`Parent: ${task.reserved.parentId}`);
    }
    if (task.reserved.dependsOn.length > 0) {
      console.log(`Depends on: ${task.reserved.dependsOn.join(', ')}`);
    }

    // Content
    if (task.content) {
      console.log('');
      console.log(task.content);
    }
  },
});
