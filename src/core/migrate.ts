/**
 * Log Migration Utility
 *
 * Migrates from embedded task logs (in task content) to centralized NDJSON log file.
 */

import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';
import { loadConfig, saveConfig, FILES } from './config.ts';
import { parseSimblFile, serializeSimblFile } from './parser.ts';
import { parseTaskLog, stripTaskLog, appendLogToFile, FileLogEntry } from './log.ts';

/**
 * Result of a migration operation
 */
export interface MigrationResult {
  tasksMigrated: number;
  entriesMigrated: number;
  errors: string[];
  backupPath?: string;
}

/**
 * Create a timestamped backup of tasks.md
 */
function createBackup(tasksPath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = `${tasksPath}.backup.${timestamp}`;
  copyFileSync(tasksPath, backupPath);
  return backupPath;
}

/**
 * Log section marker for detection
 */
const LOG_SECTION_MARKER = '***\n\ntask-log\n';

/**
 * Check if migration is needed
 *
 * Returns true if:
 * - Any task has embedded logs AND config.logVersion !== 2
 *
 * Returns false if:
 * - logVersion is 2 (already migrated)
 * - No tasks have embedded logs
 */
export async function needsMigration(simblDir: string): Promise<boolean> {
  // Check config for logVersion
  const config = loadConfig(simblDir);
  if (config.logVersion === 2) {
    return false;
  }

  // Check if tasks.md exists
  const tasksPath = join(simblDir, FILES.tasks);
  if (!existsSync(tasksPath)) {
    return false;
  }

  // Check if any task has embedded logs
  const content = readFileSync(tasksPath, 'utf-8');
  return content.includes(LOG_SECTION_MARKER) || content.includes('\n***\n\ntask-log\n');
}

/**
 * Migrate all embedded task logs to centralized log file
 *
 * This function:
 * 1. Parses tasks.md to find tasks with embedded logs
 * 2. Extracts log entries and writes them to log.ndjson
 * 3. Strips log sections from task content
 * 4. Updates config.yaml with logVersion: 2
 */
export async function migrateTaskLogs(simblDir: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    tasksMigrated: 0,
    entriesMigrated: 0,
    errors: [],
  };

  // Check if migration is needed
  const config = loadConfig(simblDir);
  if (config.logVersion === 2) {
    // Already migrated, return early
    return result;
  }

  // Check if tasks.md exists
  const tasksPath = join(simblDir, FILES.tasks);
  if (!existsSync(tasksPath)) {
    // No tasks to migrate, just update config
    config.logVersion = 2;
    saveConfig(simblDir, config);
    return result;
  }

  // Create backup before any modifications
  result.backupPath = createBackup(tasksPath);

  // Parse tasks file
  const content = readFileSync(tasksPath, 'utf-8');
  const simblFile = parseSimblFile(content);

  // Process all tasks (backlog + done)
  const allTasks = [...simblFile.backlog, ...simblFile.done];
  let tasksModified = false;

  for (const task of allTasks) {
    // Check if task has embedded logs
    if (!task.content.includes('task-log')) {
      continue;
    }

    // Parse embedded logs
    const logEntries = parseTaskLog(task.content);
    if (logEntries.length === 0) {
      continue;
    }

    // Write entries to log.ndjson in file order
    // (getTaskLog will sort them by timestamp when reading)
    for (const entry of logEntries) {
      const fileEntry: FileLogEntry = {
        taskId: task.id,
        timestamp: entry.timestamp,
        message: entry.message,
      };
      await appendLogToFile(simblDir, fileEntry);
      result.entriesMigrated++;
    }

    // Strip log section from task content
    task.content = stripTaskLog(task.content);
    tasksModified = true;
    result.tasksMigrated++;
  }

  // Write updated tasks.md if any tasks were modified
  if (tasksModified) {
    const updatedContent = serializeSimblFile(simblFile);
    writeFileSync(tasksPath, updatedContent, 'utf-8');
  }

  // Update config with logVersion: 2
  config.logVersion = 2;
  saveConfig(simblDir, config);

  return result;
}
