import { defineCommand } from 'citty';
import { readFileSync, writeFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, serializeSimblFile, findTaskById } from '../../core/parser.ts';
import { parseReservedTags, deriveStatus } from '../../core/task.ts';
import { sanitizeObjectForJson } from '../../core/sanitize.ts';

export const unrelateCommand = defineCommand({
  meta: {
    name: 'unrelate',
    description: 'Remove relationships between tasks',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID to remove relationship from',
      required: true,
    },
    parent: {
      type: 'boolean',
      description: 'Remove parent relationship',
      default: false,
    },
    'depends-on': {
      type: 'string',
      description: 'Remove dependency on specific task ID',
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

    if (!args.parent && !args['depends-on']) {
      console.error('Provide --parent or --depends-on to remove a relationship.');
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

    // Handle parent relationship removal
    if (args.parent) {
      if (!task.reserved.parentId) {
        console.error(`Task "${args.id}" has no parent.`);
        process.exit(1);
      }

      const oldParent = task.reserved.parentId;
      task.tags = task.tags.filter((t) => !t.startsWith('child-of-'));
      changes.push(`removed parent: ${oldParent}`);
    }

    // Handle depends-on relationship removal
    if (args['depends-on']) {
      const depId = args['depends-on'];

      if (!task.reserved.dependsOn.includes(depId)) {
        console.error(`Task "${args.id}" doesn't depend on "${depId}".`);
        process.exit(1);
      }

      task.tags = task.tags.filter((t) => t !== `depends-on-${depId}`);
      changes.push(`removed dependency: ${depId}`);
    }

    // Reparse reserved tags
    task.reserved = parseReservedTags(task.tags);
    task.status = deriveStatus(task.section, task.reserved);

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    if (args.json) {
      console.log(JSON.stringify(sanitizeObjectForJson(task), null, 2));
      return;
    }

    console.log(`✓ Updated "${args.id}": ${changes.join(', ')}`);
  },
});
