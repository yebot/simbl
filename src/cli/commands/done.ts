import { defineCommand } from 'citty';
import { readFileSync, writeFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, serializeSimblFile } from '../../core/parser.ts';
import { appendLogToFile } from '../../core/log.ts';
import { sanitizeObjectForJson } from '../../core/sanitize.ts';

export const doneCommand = defineCommand({
  meta: {
    name: 'done',
    description: 'Mark a task as done (move to Done section)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID to mark as done',
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

    // Find task in backlog
    const taskIndex = file.backlog.findIndex((t) => t.id === args.id);

    if (taskIndex === -1) {
      // Check if already in done
      const inDone = file.done.some((t) => t.id === args.id);
      if (inDone) {
        console.error(`Task "${args.id}" is already done.`);
        process.exit(1);
      }
      console.error(`Task "${args.id}" not found in backlog.`);
      process.exit(1);
    }

    // Move task from backlog to done
    const task = file.backlog[taskIndex];
    file.backlog.splice(taskIndex, 1);

    // Update task section and status
    task.section = 'done';
    task.status = 'done';

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
      message: 'Moved to Done',
    });

    if (args.json) {
      console.log(JSON.stringify(sanitizeObjectForJson(task), null, 2));
      return;
    }

    console.log(`✓ Marked "${args.id}" as done`);
  },
});
