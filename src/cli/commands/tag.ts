import { defineCommand } from 'citty';
import { readFileSync, writeFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, serializeSimblFile, findTaskById } from '../../core/parser.ts';
import { parseReservedTags, deriveStatus } from '../../core/task.ts';
import { appendLogEntry } from '../../core/log.ts';

/**
 * Check if a tag is a priority tag (p1-p9)
 */
function isPriorityTag(tag: string): boolean {
  return /^p[1-9]$/.test(tag);
}

const addTagCommand = defineCommand({
  meta: {
    name: 'add',
    description: 'Add a tag to a task',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID',
      required: true,
    },
    tag: {
      type: 'positional',
      description: 'Tag to add (without brackets)',
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

    // Clean tag (remove brackets if user included them)
    const tag = args.tag.replace(/^\[|\]$/g, '');

    if (task.tags.includes(tag)) {
      if (args.json) {
        console.log(JSON.stringify(task, null, 2));
        return;
      }
      console.log(`Task "${args.id}" already has tag [${tag}].`);
      return;
    }

    // If adding a priority tag, remove any existing priority tag first
    // (A task can have only zero or one priority tag)
    let removedPriority: string | null = null;
    if (isPriorityTag(tag)) {
      const existingPriority = task.tags.find(isPriorityTag);
      if (existingPriority) {
        task.tags = task.tags.filter((t) => t !== existingPriority);
        removedPriority = existingPriority;
      }
    }

    // Add tag
    task.tags.push(tag);

    // Reparse reserved tags and update status
    task.reserved = parseReservedTags(task.tags);
    task.status = deriveStatus(task.section, task.reserved);

    // Add log entry
    if (removedPriority) {
      task.content = appendLogEntry(task.content, `Priority changed from [${removedPriority}] to [${tag}]`);
    } else {
      task.content = appendLogEntry(task.content, `Added tag [${tag}]`);
    }

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    if (args.json) {
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    if (removedPriority) {
      console.log(`✓ Added [${tag}] to "${args.id}" (replaced [${removedPriority}])`);
    } else {
      console.log(`✓ Added [${tag}] to "${args.id}"`);
    }
  },
});

const removeTagCommand = defineCommand({
  meta: {
    name: 'remove',
    description: 'Remove a tag from a task',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID',
      required: true,
    },
    tag: {
      type: 'positional',
      description: 'Tag to remove (without brackets)',
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

    // Clean tag (remove brackets if user included them)
    const tag = args.tag.replace(/^\[|\]$/g, '');

    if (!task.tags.includes(tag)) {
      if (args.json) {
        console.log(JSON.stringify(task, null, 2));
        return;
      }
      console.log(`Task "${args.id}" doesn't have tag [${tag}].`);
      return;
    }

    // Remove tag
    task.tags = task.tags.filter((t) => t !== tag);

    // Reparse reserved tags and update status
    task.reserved = parseReservedTags(task.tags);
    task.status = deriveStatus(task.section, task.reserved);

    // Add log entry
    task.content = appendLogEntry(task.content, `Removed tag [${tag}]`);

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    if (args.json) {
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    console.log(`✓ Removed [${tag}] from "${args.id}"`);
  },
});

export const tagCommand = defineCommand({
  meta: {
    name: 'tag',
    description: 'Manage task tags',
  },
  subCommands: {
    add: addTagCommand,
    remove: removeTagCommand,
  },
});
