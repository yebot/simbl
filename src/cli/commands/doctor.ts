import { defineCommand } from 'citty';
import { readFileSync } from 'fs';
import { findSimblDir, getSimblPaths, loadConfig } from '../../core/config.ts';
import { parseSimblFile, getAllTasks } from '../../core/parser.ts';
import { parseMarkdown } from '../../core/parser.ts';
import type { Task } from '../../core/task.ts';
import type { Heading } from 'mdast';

interface Issue {
  level: 'error' | 'warning';
  message: string;
  taskId?: string;
}

/**
 * Validate the tasks.md file structure
 */
function validateTasksFile(content: string, prefix: string): Issue[] {
  const issues: Issue[] = [];

  // Parse the raw markdown to check structure
  const ast = parseMarkdown(content);

  // Check H1 headings
  const h1Headings = ast.children.filter(
    (n): n is Heading => n.type === 'heading' && n.depth === 1
  );

  const h1Texts = h1Headings.map((h) =>
    h.children
      .map((c) => (c.type === 'text' ? c.value : ''))
      .join('')
      .toLowerCase()
  );

  if (!h1Texts.includes('backlog')) {
    issues.push({
      level: 'error',
      message: 'Missing required H1 heading "# Backlog"',
    });
  }

  if (!h1Texts.includes('done')) {
    issues.push({
      level: 'error',
      message: 'Missing required H1 heading "# Done"',
    });
  }

  const allowedH1 = ['backlog', 'done'];
  for (const text of h1Texts) {
    if (!allowedH1.includes(text)) {
      issues.push({
        level: 'error',
        message: `Unexpected H1 heading "# ${text}" - only "Backlog" and "Done" are allowed`,
      });
    }
  }

  // Parse tasks for further validation
  let file;
  try {
    file = parseSimblFile(content);
  } catch (e) {
    issues.push({
      level: 'error',
      message: `Failed to parse tasks file: ${e}`,
    });
    return issues;
  }

  const allTasks = getAllTasks(file);

  // Check task IDs
  const idPattern = new RegExp(`^${prefix}-\\d+$`);
  const seenIds = new Set<string>();

  for (const task of allTasks) {
    // Validate ID format
    if (!idPattern.test(task.id)) {
      issues.push({
        level: 'warning',
        message: `Task ID "${task.id}" doesn't match expected format "${prefix}-N"`,
        taskId: task.id,
      });
    }

    // Check for duplicate IDs
    if (seenIds.has(task.id)) {
      issues.push({
        level: 'error',
        message: `Duplicate task ID "${task.id}"`,
        taskId: task.id,
      });
    }
    seenIds.add(task.id);

    // Check priority tags
    const priorityTags = task.tags.filter((t) => /^p[1-9]$/.test(t));
    if (priorityTags.length > 1) {
      issues.push({
        level: 'error',
        message: `Task has multiple priority tags: ${priorityTags.join(', ')}`,
        taskId: task.id,
      });
    }

    // Check parent references
    if (task.reserved.parentId) {
      const parentExists = allTasks.some((t) => t.id === task.reserved.parentId);
      if (!parentExists) {
        issues.push({
          level: 'warning',
          message: `Parent task "${task.reserved.parentId}" not found`,
          taskId: task.id,
        });
      }
    }

    // Check dependency references
    for (const depId of task.reserved.dependsOn) {
      const depExists = allTasks.some((t) => t.id === depId);
      if (!depExists) {
        issues.push({
          level: 'warning',
          message: `Dependency task "${depId}" not found`,
          taskId: task.id,
        });
      }
    }
  }

  // Check for circular dependencies
  const circularDeps = findCircularDependencies(allTasks);
  for (const cycle of circularDeps) {
    issues.push({
      level: 'error',
      message: `Circular dependency detected: ${cycle.join(' -> ')}`,
    });
  }

  return issues;
}

/**
 * Find circular dependencies using DFS
 */
function findCircularDependencies(tasks: Task[]): string[][] {
  const cycles: string[][] = [];
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(taskId: string, path: string[]): boolean {
    if (recursionStack.has(taskId)) {
      // Found cycle
      const cycleStart = path.indexOf(taskId);
      cycles.push([...path.slice(cycleStart), taskId]);
      return true;
    }

    if (visited.has(taskId)) {
      return false;
    }

    visited.add(taskId);
    recursionStack.add(taskId);

    const task = taskMap.get(taskId);
    if (task) {
      const deps = [...task.reserved.dependsOn];
      if (task.reserved.parentId) {
        deps.push(task.reserved.parentId);
      }

      for (const depId of deps) {
        dfs(depId, [...path, taskId]);
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id, []);
    }
  }

  return cycles;
}

export const doctorCommand = defineCommand({
  meta: {
    name: 'doctor',
    description: 'Validate tasks.md structure and report issues',
  },
  args: {
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

    const config = loadConfig(simblDir);
    const paths = getSimblPaths(simblDir);

    let content: string;
    try {
      content = readFileSync(paths.tasks, 'utf-8');
    } catch {
      console.error('Could not read tasks.md');
      process.exit(1);
    }

    const issues = validateTasksFile(content, config.prefix);

    if (args.json) {
      console.log(JSON.stringify({ issues }, null, 2));
      return;
    }

    if (issues.length === 0) {
      console.log('✓ No issues found in tasks.md');
      return;
    }

    const errors = issues.filter((i) => i.level === 'error');
    const warnings = issues.filter((i) => i.level === 'warning');

    console.log(`Found ${issues.length} issue(s):\n`);

    for (const issue of errors) {
      const prefix = issue.taskId ? `[${issue.taskId}] ` : '';
      console.log(`  ✗ ERROR: ${prefix}${issue.message}`);
    }

    for (const issue of warnings) {
      const prefix = issue.taskId ? `[${issue.taskId}] ` : '';
      console.log(`  ⚠ WARNING: ${prefix}${issue.message}`);
    }

    console.log('');
    console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);

    if (errors.length > 0) {
      process.exit(1);
    }
  },
});
