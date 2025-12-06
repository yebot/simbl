import { defineCommand } from 'citty';
import { readFileSync, writeFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, serializeSimblFile, findTaskById, getAllTasks } from '../../core/parser.ts';
import { parseReservedTags, deriveStatus } from '../../core/task.ts';

/**
 * Check for circular dependencies using DFS
 */
function wouldCreateCycle(
  taskId: string,
  targetId: string,
  allTasks: ReturnType<typeof getAllTasks>
): boolean {
  const taskMap = new Map(allTasks.map((t) => [t.id, t]));
  const visited = new Set<string>();

  function hasCycle(currentId: string): boolean {
    if (currentId === taskId) {
      return true; // Found a cycle back to the original task
    }
    if (visited.has(currentId)) {
      return false;
    }
    visited.add(currentId);

    const task = taskMap.get(currentId);
    if (!task) return false;

    // Check parent relationship
    if (task.reserved.parentId && hasCycle(task.reserved.parentId)) {
      return true;
    }

    // Check dependency relationships
    for (const depId of task.reserved.dependsOn) {
      if (hasCycle(depId)) {
        return true;
      }
    }

    return false;
  }

  // Start from the target and see if we can reach back to taskId
  return hasCycle(targetId);
}

export const relateCommand = defineCommand({
  meta: {
    name: 'relate',
    description: 'Create relationships between tasks',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID to add relationship to',
      required: true,
    },
    parent: {
      type: 'string',
      description: 'Set parent task ID (creates child-of relationship)',
    },
    'depends-on': {
      type: 'string',
      description: 'Add dependency on task ID',
    },
  },
  async run({ args }) {
    const simblDir = findSimblDir();

    if (!simblDir) {
      console.error('No .simbl directory found. Run `simbl init` first.');
      process.exit(1);
    }

    if (!args.parent && !args['depends-on']) {
      console.error('Provide --parent or --depends-on to create a relationship.');
      process.exit(1);
    }

    const paths = getSimblPaths(simblDir);
    const content = readFileSync(paths.tasks, 'utf-8');
    const file = parseSimblFile(content);
    const allTasks = getAllTasks(file);

    const task = findTaskById(file, args.id);
    if (!task) {
      console.error(`Task "${args.id}" not found.`);
      process.exit(1);
    }

    const changes: string[] = [];

    // Handle parent relationship
    if (args.parent) {
      const parentTask = findTaskById(file, args.parent);
      if (!parentTask) {
        console.error(`Parent task "${args.parent}" not found.`);
        process.exit(1);
      }

      if (args.parent === args.id) {
        console.error('A task cannot be its own parent.');
        process.exit(1);
      }

      // Check for circular dependency
      if (wouldCreateCycle(args.id, args.parent, allTasks)) {
        console.error(`Cannot set parent: would create circular dependency.`);
        process.exit(1);
      }

      // Remove existing parent tag if any
      task.tags = task.tags.filter((t) => !t.startsWith('child-of-'));

      // Add new parent tag
      task.tags.push(`child-of-${args.parent}`);
      changes.push(`parent: ${args.parent}`);
    }

    // Handle depends-on relationship
    if (args['depends-on']) {
      const depId = args['depends-on'];
      const depTask = findTaskById(file, depId);
      if (!depTask) {
        console.error(`Dependency task "${depId}" not found.`);
        process.exit(1);
      }

      if (depId === args.id) {
        console.error('A task cannot depend on itself.');
        process.exit(1);
      }

      // Check if already depends on this task
      if (task.reserved.dependsOn.includes(depId)) {
        console.error(`Task "${args.id}" already depends on "${depId}".`);
        process.exit(1);
      }

      // Check for circular dependency
      if (wouldCreateCycle(args.id, depId, allTasks)) {
        console.error(`Cannot add dependency: would create circular dependency.`);
        process.exit(1);
      }

      // Add dependency tag
      task.tags.push(`depends-on-${depId}`);
      changes.push(`depends-on: ${depId}`);
    }

    // Reparse reserved tags
    task.reserved = parseReservedTags(task.tags);
    task.status = deriveStatus(task.section, task.reserved);

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    console.log(`✓ Updated "${args.id}": ${changes.join(', ')}`);
  },
});
