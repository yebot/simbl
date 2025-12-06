import { readFileSync, existsSync } from 'fs';
import { parseSimblFile, getAllTasks } from '../core/parser.ts';
import { getSimblPaths } from '../core/config.ts';

/**
 * Extract numeric suffix from a task ID
 * Example: "task-42" -> 42, "abc-1" -> 1
 */
export function extractIdNumber(id: string): number | null {
  const match = id.match(/-(\d+)$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Find the highest ID number used in a list of task IDs
 */
export function findMaxIdNumber(ids: string[]): number {
  let max = 0;
  for (const id of ids) {
    const num = extractIdNumber(id);
    if (num !== null && num > max) {
      max = num;
    }
  }
  return max;
}

/**
 * Generate the next task ID based on existing tasks
 */
export function generateNextId(prefix: string, simblDir: string): string {
  const paths = getSimblPaths(simblDir);
  const allIds: string[] = [];

  // Read tasks from tasks.md
  if (existsSync(paths.tasks)) {
    try {
      const content = readFileSync(paths.tasks, 'utf-8');
      const file = parseSimblFile(content);
      const tasks = getAllTasks(file);
      allIds.push(...tasks.map((t) => t.id));
    } catch {
      // Ignore parse errors
    }
  }

  // Read tasks from archive
  if (existsSync(paths.archive)) {
    try {
      const content = readFileSync(paths.archive, 'utf-8');
      // Archive might have different structure, try to extract IDs
      const idMatches = content.matchAll(/^## ([a-zA-Z0-9-]+)/gm);
      for (const match of idMatches) {
        allIds.push(match[1]);
      }
    } catch {
      // Ignore parse errors
    }
  }

  const maxNum = findMaxIdNumber(allIds);
  return `${prefix}-${maxNum + 1}`;
}

/**
 * Validate that an ID matches the expected format
 */
export function isValidId(id: string, prefix?: string): boolean {
  if (prefix) {
    const regex = new RegExp(`^${prefix}-\\d+$`);
    return regex.test(id);
  }
  // Generic format: word-number
  return /^[a-zA-Z][a-zA-Z0-9]*-\d+$/.test(id);
}

/**
 * Update all task IDs in a file to use a new prefix
 */
export function updateIdPrefix(
  content: string,
  oldPrefix: string,
  newPrefix: string
): string {
  const regex = new RegExp(`(^## )${oldPrefix}-(\\d+)`, 'gm');
  return content.replace(regex, `$1${newPrefix}-$2`);
}
