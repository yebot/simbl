import { defineCommand } from 'citty';
import { readFileSync, writeFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, serializeSimblFile, findTaskById } from '../../core/parser.ts';

export const cancelCommand = defineCommand({
  meta: {
    name: 'cancel',
    description: 'Mark a task as canceled (add [canceled] tag)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID to cancel',
      required: true,
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

    if (task.reserved.canceled) {
      console.error(`Task "${args.id}" is already canceled.`);
      process.exit(1);
    }

    // Add [canceled] tag
    task.tags.push('canceled');
    task.reserved.canceled = true;
    task.status = 'canceled';

    // Remove [in-progress] tag if present
    task.tags = task.tags.filter((t) => t !== 'in-progress');
    task.reserved.inProgress = false;

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    console.log(`✓ Marked "${args.id}" as canceled`);
  },
});
