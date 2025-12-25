import { defineCommand } from 'citty';
import { readFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, findTaskById } from '../../core/parser.ts';
import { parseTaskLog, formatLogEntriesForDisplay } from '../../core/log.ts';
import { sanitizeObjectForJson } from '../../core/sanitize.ts';

export const logCommand = defineCommand({
  meta: {
    name: 'log',
    description: 'Display task log entries',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID',
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

    const entries = parseTaskLog(task.content);

    if (args.json) {
      const jsonEntries = entries.map((e) => ({
        timestamp: e.timestamp.toISOString(),
        message: e.message,
      }));
      console.log(JSON.stringify(sanitizeObjectForJson({
        taskId: task.id,
        entries: jsonEntries,
      }), null, 2));
      return;
    }

    console.log(`Task log for "${args.id}":`);
    console.log('');
    console.log(formatLogEntriesForDisplay(entries));
  },
});
