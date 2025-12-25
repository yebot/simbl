import { defineCommand } from 'citty';
import { readFileSync, writeFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, serializeSimblFile } from '../../core/parser.ts';
import { appendLogToFile } from '../../core/log.ts';

export const cancelCommand = defineCommand({
  meta: {
    name: 'cancel',
    description: 'Mark a task as canceled (add [canceled] tag and move to Done)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID to cancel',
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

    // Check if task is already in done section (cannot cancel done tasks)
    const inDone = file.done.some((t) => t.id === args.id);
    if (inDone) {
      console.error(`Task "${args.id}" is already done and cannot be canceled.`);
      process.exit(1);
    }

    // Find task in backlog
    const taskIndex = file.backlog.findIndex((t) => t.id === args.id);

    if (taskIndex === -1) {
      console.error(`Task "${args.id}" not found in backlog.`);
      process.exit(1);
    }

    // Move task from backlog to done
    const task = file.backlog[taskIndex];
    file.backlog.splice(taskIndex, 1);

    // Add [canceled] tag
    task.tags.push('canceled');
    task.reserved.canceled = true;
    task.status = 'canceled';

    // Update task section
    task.section = 'done';

    // Remove [in-progress] tag if present
    task.tags = task.tags.filter((t) => t !== 'in-progress');
    task.reserved.inProgress = false;

    // Add to beginning of done section (most recent first)
    file.done.unshift(task);

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    // Log to centralized log file
    await appendLogToFile(simblDir, {
      taskId: args.id,
      timestamp: new Date(),
      message: 'Marked as canceled',
    });

    if (args.json) {
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    console.log(`✓ Marked "${args.id}" as canceled`);
  },
});
