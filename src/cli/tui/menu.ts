import * as p from '@clack/prompts';
import { readFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile } from '../../core/parser.ts';
import { runArchiveFlow } from './archive.ts';

type MenuAction = 'list' | 'add' | 'done' | 'archive' | 'doctor' | 'quit';

/**
 * Display task summary
 */
function showTaskSummary(simblDir: string) {
  const paths = getSimblPaths(simblDir);
  try {
    const content = readFileSync(paths.tasks, 'utf-8');
    const file = parseSimblFile(content);

    const backlogCount = file.backlog.length;
    const doneCount = file.done.length;

    // Count by priority
    const p1Count = file.backlog.filter((t) => t.reserved.priority === 1).length;
    const inProgressCount = file.backlog.filter((t) => t.reserved.inProgress).length;

    let summary = `${backlogCount} in backlog`;
    if (p1Count > 0) summary += ` (${p1Count} P1)`;
    if (inProgressCount > 0) summary += `, ${inProgressCount} in progress`;
    summary += `, ${doneCount} done`;

    p.note(summary, 'Tasks');
  } catch {
    p.note('No tasks yet', 'Tasks');
  }
}

/**
 * List backlog tasks briefly
 */
function listBacklog(simblDir: string) {
  const paths = getSimblPaths(simblDir);
  try {
    const content = readFileSync(paths.tasks, 'utf-8');
    const file = parseSimblFile(content);

    if (file.backlog.length === 0) {
      console.log('  (no tasks in backlog)');
      return;
    }

    // Sort by priority
    const sorted = [...file.backlog].sort((a, b) => {
      const aPri = a.reserved.priority ?? 10;
      const bPri = b.reserved.priority ?? 10;
      return aPri - bPri;
    });

    console.log('');
    for (const task of sorted) {
      const tags = task.tags.map((t) => `[${t}]`).join('');
      console.log(`  ${task.id} ${task.title}  ${tags}`);
    }
    console.log('');
  } catch {
    console.log('  (could not read tasks)');
  }
}

/**
 * Add a new task interactively
 */
async function addTaskFlow(_simblDir: string): Promise<void> {
  const title = await p.text({
    message: 'Task title:',
    placeholder: 'What needs to be done?',
    validate: (value) => {
      if (!value.trim()) return 'Title is required';
    },
  });

  if (p.isCancel(title)) return;

  const priority = await p.select({
    message: 'Priority:',
    options: [
      { value: '', label: 'None' },
      { value: '1', label: 'P1 - Critical' },
      { value: '2', label: 'P2 - High' },
      { value: '3', label: 'P3 - Medium' },
    ],
  });

  if (p.isCancel(priority)) return;

  // Build command args
  const args = ['run', 'src/index.ts', 'add', title as string];
  if (priority) {
    args.push('-p', priority as string);
  }

  const result = Bun.spawnSync(args, {
    cwd: process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
  });

  if (result.exitCode === 0) {
    p.log.success('Task added!');
  }
}

/**
 * Mark a task as done interactively
 */
async function markDoneFlow(simblDir: string): Promise<void> {
  const paths = getSimblPaths(simblDir);
  const content = readFileSync(paths.tasks, 'utf-8');
  const file = parseSimblFile(content);

  if (file.backlog.length === 0) {
    p.log.warning('No tasks in backlog');
    return;
  }

  const taskId = await p.select({
    message: 'Select task to mark as done:',
    options: file.backlog.map((t) => ({
      value: t.id,
      label: `${t.id} ${t.title}`,
      hint: t.tags.map((tag) => `[${tag}]`).join(''),
    })),
  });

  if (p.isCancel(taskId)) return;

  const result = Bun.spawnSync(['bun', 'run', 'src/index.ts', 'done', taskId as string], {
    cwd: process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
  });

  if (result.exitCode === 0) {
    p.log.success('Task marked as done!');
  }
}

/**
 * Run doctor validation
 */
function runDoctor(): void {
  Bun.spawnSync(['bun', 'run', 'src/index.ts', 'doctor'], {
    cwd: process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
  });
}

/**
 * Main TUI menu loop
 */
export async function runTuiMenu(): Promise<void> {
  const simblDir = findSimblDir();

  if (!simblDir) {
    p.intro('SIMBL - Simple Backlog');
    p.log.warning('No .simbl directory found.');

    const shouldInit = await p.confirm({
      message: 'Initialize SIMBL in this directory?',
    });

    if (p.isCancel(shouldInit) || !shouldInit) {
      p.outro('Run `simbl init` to get started.');
      return;
    }

    // Run init
    Bun.spawnSync(['bun', 'run', 'src/index.ts', 'init'], {
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
    });
    return;
  }

  p.intro('SIMBL - Simple Backlog');
  showTaskSummary(simblDir);

  let running = true;

  while (running) {
    const action = (await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'list' as const, label: 'View backlog' },
        { value: 'add' as const, label: 'Add task' },
        { value: 'done' as const, label: 'Mark task done' },
        { value: 'archive' as const, label: 'Archive completed tasks' },
        { value: 'doctor' as const, label: 'Run doctor' },
        { value: 'quit' as const, label: 'Quit' },
      ],
    })) as MenuAction | symbol;

    if (p.isCancel(action) || action === 'quit') {
      running = false;
      continue;
    }

    switch (action) {
      case 'list':
        listBacklog(simblDir);
        break;
      case 'add':
        await addTaskFlow(simblDir);
        break;
      case 'done':
        await markDoneFlow(simblDir);
        break;
      case 'archive':
        await runArchiveFlow(simblDir);
        break;
      case 'doctor':
        runDoctor();
        break;
    }
  }

  p.outro('Goodbye!');
}
