import { defineCommand } from 'citty';
import { readFileSync, writeFileSync } from 'fs';
import { findSimblDir, getSimblPaths, loadConfig } from '../../core/config.ts';
import { parseSimblFile, serializeSimblFile } from '../../core/parser.ts';
import { generateNextId } from '../../utils/id.ts';
import { parseTagLine, parseReservedTags, deriveStatus, type Task } from '../../core/task.ts';
import { appendLogEntry } from '../../core/log.ts';

/**
 * Normalize heading levels in content.
 * Task content must use H3+ (H1 is for sections, H2 is for tasks).
 * This shifts all headings down by 2 levels.
 */
function normalizeHeadings(content: string): string {
  return content.replace(/^(#{1,6})\s/gm, (_match, hashes) => {
    const level = hashes.length;
    const newLevel = Math.min(level + 2, 6);
    return '#'.repeat(newLevel) + ' ';
  });
}

export const addCommand = defineCommand({
  meta: {
    name: 'add',
    description: 'Add a new task to the backlog',
  },
  args: {
    title: {
      type: 'positional',
      description: 'Task title',
      required: true,
    },
    tags: {
      type: 'string',
      alias: 't',
      description: 'Tags in bracket notation, e.g., "[p1][design]"',
    },
    content: {
      type: 'string',
      alias: 'c',
      description: 'Task content/description',
    },
    priority: {
      type: 'string',
      alias: 'p',
      description: 'Priority (1-9)',
    },
    project: {
      type: 'string',
      description: 'Project name',
    },
    json: {
      type: 'boolean',
      description: 'Output created task as JSON',
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

    // Read and parse current tasks
    const content = readFileSync(paths.tasks, 'utf-8');
    const file = parseSimblFile(content);

    // Generate new ID
    const id = generateNextId(config.prefix, simblDir);

    // Build tags array
    let tags: string[] = [];

    // Parse tags from --tags arg
    if (args.tags) {
      tags = parseTagLine(args.tags);
    }

    // Add priority tag if specified
    if (args.priority) {
      const p = parseInt(args.priority, 10);
      if (p >= 1 && p <= 9) {
        // Remove any existing priority tag
        tags = tags.filter((t) => !/^p[1-9]$/.test(t));
        tags.unshift(`p${p}`);
      }
    }

    // Add project tag if specified
    if (args.project) {
      // Remove any existing project tag
      tags = tags.filter((t) => !t.startsWith('project:'));
      tags.push(`project:${args.project}`);
    }

    // Build task content
    let taskContent = '';
    if (args.content) {
      const normalizedContent = normalizeHeadings(args.content);
      taskContent = `### Description\n\n${normalizedContent}`;
    }

    // Add "Task created" log entry
    taskContent = appendLogEntry(taskContent, 'Task created');

    // Create task object
    const reserved = parseReservedTags(tags);
    const task: Task = {
      id,
      title: args.title,
      tags,
      reserved,
      status: deriveStatus('backlog', reserved),
      content: taskContent,
      section: 'backlog',
    };

    // Add to backlog
    file.backlog.push(task);

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    if (args.json) {
      console.log(JSON.stringify(task, null, 2));
    } else {
      console.log(`Created ${id}: ${args.title}`);
      if (tags.length > 0) {
        console.log(`  Tags: ${tags.map((t) => `[${t}]`).join('')}`);
      }
    }
  },
});
