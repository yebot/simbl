import { defineCommand } from 'citty';
import { readFileSync, writeFileSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, serializeSimblFile, findTaskById } from '../../core/parser.ts';

/**
 * Acceptance Criterion data structure
 */
interface AcceptanceCriterion {
  index: number;       // 1-based index
  text: string;        // The criterion text
  met: boolean;        // Whether it's checked [x] or unchecked [ ]
}

/**
 * Standard header for acceptance criteria section
 * Uses H5 (####) because task content headers start at H3 level,
 * and AC is typically nested under other sections
 */
const AC_HEADER = '##### Acceptance Criteria';

/**
 * Find the acceptance criteria section in task content
 * Returns the start index (after header) and end index, or null if not found
 */
function findACSection(content: string): { start: number; end: number } | null {
  const lines = content.split('\n');
  let headerIndex = -1;

  // Find the AC header (H5 or H6)
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '##### Acceptance Criteria' || trimmed === '###### Acceptance Criteria') {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return null;

  // Find where AC section ends (next heading or end of content)
  let endIndex = lines.length;
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    // Stop at next heading (any level) or horizontal rule
    if (line.startsWith('#') || line === '***' || line === '---' || line === '___') {
      endIndex = i;
      break;
    }
  }

  return { start: headerIndex, end: endIndex };
}

/**
 * Parse acceptance criteria from task content
 */
function parseAcceptanceCriteria(content: string): AcceptanceCriterion[] {
  const section = findACSection(content);
  if (!section) return [];

  const lines = content.split('\n');
  const criteria: AcceptanceCriterion[] = [];
  let index = 1;

  for (let i = section.start + 1; i < section.end; i++) {
    const line = lines[i];
    // Match checkbox items: - [ ] or - [x] or - [X]
    const match = line.match(/^- \[([ xX])\] (.+)$/);
    if (match) {
      criteria.push({
        index,
        text: match[2],
        met: match[1].toLowerCase() === 'x',
      });
      index++;
    }
  }

  return criteria;
}

/**
 * Serialize acceptance criteria to markdown
 */
function serializeAcceptanceCriteria(criteria: AcceptanceCriterion[]): string {
  if (criteria.length === 0) return '';

  const lines = [AC_HEADER, ''];
  for (const c of criteria) {
    const checkbox = c.met ? '[x]' : '[ ]';
    lines.push(`- ${checkbox} ${c.text}`);
  }
  return lines.join('\n');
}

/**
 * Update task content with new acceptance criteria
 * Creates the section if it doesn't exist
 */
function updateTaskContent(content: string, criteria: AcceptanceCriterion[]): string {
  const section = findACSection(content);
  const acText = serializeAcceptanceCriteria(criteria);

  if (!section) {
    // No existing section - add at the end
    if (criteria.length === 0) return content;

    // Add with proper spacing
    const trimmed = content.trimEnd();
    if (trimmed.length === 0) {
      return acText;
    }
    return trimmed + '\n\n' + acText;
  }

  // Replace existing section
  const lines = content.split('\n');
  const before = lines.slice(0, section.start);
  const after = lines.slice(section.end);

  // Build new content
  const parts: string[] = [];

  if (before.length > 0) {
    // Trim trailing empty lines from before
    while (before.length > 0 && before[before.length - 1].trim() === '') {
      before.pop();
    }
    parts.push(before.join('\n'));
  }

  if (criteria.length > 0) {
    if (parts.length > 0) {
      parts.push(''); // Add blank line separator
    }
    parts.push(acText);
  }

  if (after.length > 0) {
    // Trim leading empty lines from after
    while (after.length > 0 && after[0].trim() === '') {
      after.shift();
    }
    if (after.length > 0) {
      if (parts.length > 0) {
        parts.push(''); // Add blank line separator
      }
      parts.push(after.join('\n'));
    }
  }

  return parts.join('\n');
}

/**
 * Format criteria for display (text output)
 */
function formatCriteriaList(criteria: AcceptanceCriterion[]): string {
  if (criteria.length === 0) {
    return 'No acceptance criteria';
  }

  return criteria.map(c => {
    const status = c.met ? '✓' : '○';
    return `  ${c.index}. ${status} ${c.text}`;
  }).join('\n');
}

/**
 * Format criteria for JSON output
 */
function criteriaToJson(criteria: AcceptanceCriterion[]): object[] {
  return criteria.map(c => ({
    index: c.index,
    text: c.text,
    met: c.met,
  }));
}

// ============== SUBCOMMANDS ==============

const addCommand = defineCommand({
  meta: {
    name: 'add',
    description: 'Add acceptance criteria to a task',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID',
      required: true,
    },
    criteria: {
      type: 'positional',
      description: 'Acceptance criterion text (can specify multiple)',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args, rawArgs }) {
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

    // Gather all positional arguments after the task ID
    // rawArgs includes all arguments passed
    const taskIdIndex = rawArgs.indexOf(args.id);
    const criteriaTexts: string[] = [];

    // Get all non-flag arguments after the task ID
    for (let i = taskIdIndex + 1; i < rawArgs.length; i++) {
      const arg = rawArgs[i];
      if (arg === '--json') continue;
      if (arg.startsWith('-')) continue;
      criteriaTexts.push(arg);
    }

    if (criteriaTexts.length === 0) {
      console.error('At least one acceptance criterion is required.');
      process.exit(1);
    }

    // Parse existing criteria
    const criteria = parseAcceptanceCriteria(task.content);

    // Add new criteria
    for (const text of criteriaTexts) {
      criteria.push({
        index: criteria.length + 1,
        text,
        met: false,
      });
    }

    // Re-index
    criteria.forEach((c, i) => { c.index = i + 1; });

    // Update task content
    task.content = updateTaskContent(task.content, criteria);

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    if (args.json) {
      console.log(JSON.stringify({
        taskId: task.id,
        criteria: criteriaToJson(criteria),
      }, null, 2));
      return;
    }

    const added = criteriaTexts.length === 1 ? 'criterion' : 'criteria';
    console.log(`✓ Added ${criteriaTexts.length} acceptance ${added} to "${args.id}"`);
    console.log('');
    console.log(formatCriteriaList(criteria));
  },
});

const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List acceptance criteria for a task',
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

    const criteria = parseAcceptanceCriteria(task.content);

    if (args.json) {
      console.log(JSON.stringify({
        taskId: task.id,
        criteria: criteriaToJson(criteria),
      }, null, 2));
      return;
    }

    console.log(`Acceptance criteria for "${args.id}":`);
    console.log('');
    console.log(formatCriteriaList(criteria));
  },
});

const meetsCommand = defineCommand({
  meta: {
    name: 'meets',
    description: 'Mark an acceptance criterion as met',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID',
      required: true,
    },
    index: {
      type: 'positional',
      description: 'Criterion number (1-based)',
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

    const criteria = parseAcceptanceCriteria(task.content);
    const idx = parseInt(args.index, 10);

    if (isNaN(idx) || idx < 1 || idx > criteria.length) {
      console.error(`Invalid criterion index "${args.index}". Task has ${criteria.length} criteria.`);
      process.exit(1);
    }

    const criterion = criteria[idx - 1];

    if (criterion.met) {
      if (args.json) {
        console.log(JSON.stringify({
          taskId: task.id,
          criteria: criteriaToJson(criteria),
        }, null, 2));
        return;
      }
      console.log(`Criterion #${idx} is already marked as met.`);
      console.log('');
      console.log(formatCriteriaList(criteria));
      return;
    }

    criterion.met = true;

    // Update task content
    task.content = updateTaskContent(task.content, criteria);

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    if (args.json) {
      console.log(JSON.stringify({
        taskId: task.id,
        criteria: criteriaToJson(criteria),
      }, null, 2));
      return;
    }

    console.log(`✓ Marked criterion #${idx} as met for "${args.id}"`);
    console.log('');
    console.log(formatCriteriaList(criteria));
  },
});

const failsCommand = defineCommand({
  meta: {
    name: 'fails',
    description: 'Mark an acceptance criterion as not met',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID',
      required: true,
    },
    index: {
      type: 'positional',
      description: 'Criterion number (1-based)',
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

    const criteria = parseAcceptanceCriteria(task.content);
    const idx = parseInt(args.index, 10);

    if (isNaN(idx) || idx < 1 || idx > criteria.length) {
      console.error(`Invalid criterion index "${args.index}". Task has ${criteria.length} criteria.`);
      process.exit(1);
    }

    const criterion = criteria[idx - 1];

    if (!criterion.met) {
      if (args.json) {
        console.log(JSON.stringify({
          taskId: task.id,
          criteria: criteriaToJson(criteria),
        }, null, 2));
        return;
      }
      console.log(`Criterion #${idx} is already marked as not met.`);
      console.log('');
      console.log(formatCriteriaList(criteria));
      return;
    }

    criterion.met = false;

    // Update task content
    task.content = updateTaskContent(task.content, criteria);

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    if (args.json) {
      console.log(JSON.stringify({
        taskId: task.id,
        criteria: criteriaToJson(criteria),
      }, null, 2));
      return;
    }

    console.log(`✓ Marked criterion #${idx} as not met for "${args.id}"`);
    console.log('');
    console.log(formatCriteriaList(criteria));
  },
});

const updateCommand = defineCommand({
  meta: {
    name: 'update',
    description: 'Update the text of an acceptance criterion',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID',
      required: true,
    },
    index: {
      type: 'positional',
      description: 'Criterion number (1-based)',
      required: true,
    },
    text: {
      type: 'positional',
      description: 'New criterion text',
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

    const criteria = parseAcceptanceCriteria(task.content);
    const idx = parseInt(args.index, 10);

    if (isNaN(idx) || idx < 1 || idx > criteria.length) {
      console.error(`Invalid criterion index "${args.index}". Task has ${criteria.length} criteria.`);
      process.exit(1);
    }

    const criterion = criteria[idx - 1];
    criterion.text = args.text;

    // Update task content
    task.content = updateTaskContent(task.content, criteria);

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    if (args.json) {
      console.log(JSON.stringify({
        taskId: task.id,
        criteria: criteriaToJson(criteria),
      }, null, 2));
      return;
    }

    console.log(`✓ Updated criterion #${idx} for "${args.id}"`);
    console.log('');
    console.log(formatCriteriaList(criteria));
  },
});

const deleteCommand = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete an acceptance criterion',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task ID',
      required: true,
    },
    index: {
      type: 'positional',
      description: 'Criterion number (1-based)',
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

    const criteria = parseAcceptanceCriteria(task.content);
    const idx = parseInt(args.index, 10);

    if (isNaN(idx) || idx < 1 || idx > criteria.length) {
      console.error(`Invalid criterion index "${args.index}". Task has ${criteria.length} criteria.`);
      process.exit(1);
    }

    // Remove the criterion
    criteria.splice(idx - 1, 1);

    // Re-index remaining criteria
    criteria.forEach((c, i) => { c.index = i + 1; });

    // Update task content
    task.content = updateTaskContent(task.content, criteria);

    // Write back
    const newContent = serializeSimblFile(file);
    writeFileSync(paths.tasks, newContent, 'utf-8');

    if (args.json) {
      console.log(JSON.stringify({
        taskId: task.id,
        criteria: criteriaToJson(criteria),
      }, null, 2));
      return;
    }

    console.log(`✓ Deleted criterion #${idx} from "${args.id}"`);
    console.log('');
    console.log(formatCriteriaList(criteria));
  },
});

// ============== MAIN COMMAND ==============

export const acCommand = defineCommand({
  meta: {
    name: 'ac',
    description: 'Manage task acceptance criteria',
  },
  subCommands: {
    add: addCommand,
    list: listCommand,
    meets: meetsCommand,
    fails: failsCommand,
    update: updateCommand,
    delete: deleteCommand,
  },
});

// Export helpers for doctor validation
export { parseAcceptanceCriteria, AC_HEADER };
