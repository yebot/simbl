import * as p from '@clack/prompts';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, serializeSimblFile } from '../../core/parser.ts';
import type { Task } from '../../core/task.ts';

/**
 * Archive selected done tasks to tasks-archive.md
 */
export async function runArchiveFlow(simblDir: string): Promise<void> {
  const paths = getSimblPaths(simblDir);

  // Read current tasks
  const content = readFileSync(paths.tasks, 'utf-8');
  const file = parseSimblFile(content);

  if (file.done.length === 0) {
    p.log.warning('No completed tasks to archive.');
    return;
  }

  // Multi-select done tasks
  const selected = await p.multiselect({
    message: `Select tasks to archive (${file.done.length} completed):`,
    options: file.done.map((t) => ({
      value: t.id,
      label: `${t.id} ${t.title}`,
      hint: t.tags.map((tag) => `[${tag}]`).join(''),
    })),
    required: false,
  });

  if (p.isCancel(selected) || selected.length === 0) {
    p.log.info('No tasks archived.');
    return;
  }

  const selectedIds = new Set(selected as string[]);
  const tasksToArchive = file.done.filter((t) => selectedIds.has(t.id));
  const tasksToKeep = file.done.filter((t) => !selectedIds.has(t.id));

  // Confirm
  const confirm = await p.confirm({
    message: `Archive ${tasksToArchive.length} task(s)?`,
  });

  if (p.isCancel(confirm) || !confirm) {
    p.log.info('Cancelled.');
    return;
  }

  // Read or create archive file
  let archiveFile = { backlog: [] as Task[], done: [] as Task[] };
  if (existsSync(paths.archive)) {
    const archiveContent = readFileSync(paths.archive, 'utf-8');
    archiveFile = parseSimblFile(archiveContent);
  }

  // Add archived tasks to archive's done section
  archiveFile.done = [...tasksToArchive, ...archiveFile.done];

  // Update main file
  file.done = tasksToKeep;

  // Write both files
  writeFileSync(paths.tasks, serializeSimblFile(file), 'utf-8');
  writeFileSync(paths.archive, serializeSimblFile(archiveFile), 'utf-8');

  p.log.success(`Archived ${tasksToArchive.length} task(s) to tasks-archive.md`);
}
