import { existsSync, appendFileSync } from 'fs';
import { join } from 'path';

/**
 * Task Log parsing and manipulation utilities
 *
 * Log sections are stored at the end of task content using this format:
 *
 * ```markdown
 * ***
 *
 * task-log
 *
 * - 2025-12-17T14:32:00Z | Message here
 * - 2025-12-17T14:30:00Z | Another message
 * ```
 */

/**
 * A single log entry (legacy format, embedded in task content)
 */
export interface LogEntry {
  timestamp: Date;
  message: string;
}

/**
 * A log entry in the centralized log file (NDJSON format)
 */
export interface FileLogEntry {
  taskId: string;
  timestamp: Date;
  message: string;
}

/**
 * Log file name within .simbl directory
 */
const LOG_FILE = 'log.ndjson';

/**
 * Marker that identifies the start of the log section
 * Format: horizontal rule + blank line + "task-log" keyword
 */
const LOG_SECTION_MARKER = '***\n\ntask-log\n';

/**
 * Regex to find the log section marker
 * Handles both with and without leading newline (for tasks with no user content)
 */
const LOG_SECTION_REGEX = /(?:^|\n)\*\*\*\n\ntask-log\n/;

/**
 * Regex to parse a single log entry line
 * Format: "- 2025-12-17T14:32:00Z | Message here"
 */
const LOG_ENTRY_REGEX = /^- (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z) \| (.+)$/;

/**
 * Parse log entries from task content
 *
 * @param content - The full task content
 * @returns Array of log entries (newest first based on position)
 */
export function parseTaskLog(content: string): LogEntry[] {
  if (!content) return [];

  const markerIndex = content.search(LOG_SECTION_REGEX);
  if (markerIndex === -1) return [];

  // Get everything after the marker
  const logSection = content.slice(markerIndex).replace(LOG_SECTION_REGEX, '');

  const entries: LogEntry[] = [];
  const lines = logSection.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(LOG_ENTRY_REGEX);
    if (match) {
      entries.push({
        timestamp: new Date(match[1]),
        message: match[2],
      });
    }
  }

  return entries;
}

/**
 * Get user content without the log section
 *
 * @param content - The full task content
 * @returns Content with log section removed
 */
export function stripTaskLog(content: string): string {
  if (!content) return '';

  const markerIndex = content.search(LOG_SECTION_REGEX);
  if (markerIndex === -1) return content;

  // Return everything before the marker, trimmed
  return content.slice(0, markerIndex).trimEnd();
}

/**
 * Format a timestamp for log entries (ISO-8601 UTC)
 */
function formatTimestamp(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Format a single log entry line
 */
function formatLogEntry(timestamp: Date, message: string): string {
  return `- ${formatTimestamp(timestamp)} | ${message}`;
}

/**
 * Append a log entry to task content
 * Creates the log section if it doesn't exist
 *
 * @param content - The full task content
 * @param message - The log message to add
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns Updated content with new log entry
 */
export function appendLogEntry(
  content: string,
  message: string,
  timestamp: Date = new Date()
): string {
  const userContent = stripTaskLog(content);
  const existingEntries = parseTaskLog(content);

  // Add new entry at the beginning (newest first)
  const newEntry = formatLogEntry(timestamp, message);

  // Build log section
  const entryLines = [newEntry];
  for (const entry of existingEntries) {
    entryLines.push(formatLogEntry(entry.timestamp, entry.message));
  }

  // Combine user content + log section
  const logSection = `\n${LOG_SECTION_MARKER}\n${entryLines.join('\n')}`;

  if (userContent) {
    return userContent + logSection;
  }
  return LOG_SECTION_MARKER.trimStart() + '\n' + entryLines.join('\n');
}

/**
 * Check if two messages are of the same "type" for batching purposes
 * Messages are considered same type if they have the same prefix before any specific details
 *
 * Examples:
 * - "Content updated" and "Content updated" -> same type
 * - "Title updated" and "Title updated" -> same type
 * - "Added tag [foo]" and "Added tag [bar]" -> NOT same type (different details)
 */
function isSameMessageType(msg1: string, msg2: string): boolean {
  // For now, only batch identical messages
  // This covers "Content updated" and "Title updated" cases
  return msg1 === msg2;
}

/**
 * Append or batch a log entry
 *
 * If the most recent entry has the same message type and is within the batch window,
 * update that entry's timestamp instead of adding a new one.
 *
 * @param content - The full task content
 * @param message - The log message to add
 * @param batchMinutes - Minutes window for batching (default: 30)
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns Updated content
 */
export function appendOrBatchLogEntry(
  content: string,
  message: string,
  batchMinutes: number = 30,
  timestamp: Date = new Date()
): string {
  const existingEntries = parseTaskLog(content);

  // If no existing entries, just append
  if (existingEntries.length === 0) {
    return appendLogEntry(content, message, timestamp);
  }

  const mostRecent = existingEntries[0];
  const timeDiff = timestamp.getTime() - mostRecent.timestamp.getTime();
  const minutesDiff = timeDiff / (1000 * 60);

  // Check if we should batch
  if (minutesDiff < batchMinutes && isSameMessageType(mostRecent.message, message)) {
    // Update the most recent entry's timestamp
    const userContent = stripTaskLog(content);

    // Rebuild entries with updated timestamp for the most recent
    const entryLines: string[] = [];
    entryLines.push(formatLogEntry(timestamp, message));

    // Add remaining entries (skip the first since we're replacing it)
    for (let i = 1; i < existingEntries.length; i++) {
      entryLines.push(formatLogEntry(existingEntries[i].timestamp, existingEntries[i].message));
    }

    // Combine user content + log section
    const logSection = `\n${LOG_SECTION_MARKER}\n${entryLines.join('\n')}`;

    if (userContent) {
      return userContent + logSection;
    }
    return LOG_SECTION_MARKER.trimStart() + '\n' + entryLines.join('\n');
  }

  // No batching, just append normally
  return appendLogEntry(content, message, timestamp);
}

/**
 * Serialize log entries to markdown format
 * Used for displaying or exporting log data
 *
 * @param entries - Array of log entries
 * @returns Formatted markdown string
 */
export function serializeLogEntries(entries: LogEntry[]): string {
  if (entries.length === 0) return '';

  return entries.map((e) => formatLogEntry(e.timestamp, e.message)).join('\n');
}

/**
 * Format log entries for human-readable display
 *
 * @param entries - Array of log entries
 * @returns Formatted display string with relative or absolute timestamps
 */
export function formatLogEntriesForDisplay(entries: LogEntry[]): string {
  if (entries.length === 0) return 'No log entries';

  return entries
    .map((e, i) => {
      const dateStr = e.timestamp.toLocaleString();
      return `  ${i + 1}. ${dateStr} - ${e.message}`;
    })
    .join('\n');
}

// ============================================================================
// Centralized Log File Operations (NDJSON format)
// ============================================================================

/**
 * Append a log entry to the centralized log file
 *
 * @param simblDir - Path to .simbl directory
 * @param entry - Log entry to append
 */
export async function appendLogToFile(simblDir: string, entry: FileLogEntry): Promise<void> {
  const logPath = join(simblDir, LOG_FILE);

  const line =
    JSON.stringify({
      taskId: entry.taskId,
      timestamp: entry.timestamp.toISOString(),
      message: entry.message,
    }) + '\n';

  // Use synchronous append for atomic operation
  appendFileSync(logPath, line, 'utf-8');
}

/**
 * Read all log entries from the centralized log file
 *
 * @param simblDir - Path to .simbl directory
 * @returns Array of log entries in file order
 */
export async function readLogFile(simblDir: string): Promise<FileLogEntry[]> {
  const logPath = join(simblDir, LOG_FILE);

  if (!existsSync(logPath)) {
    return [];
  }

  const file = Bun.file(logPath);
  const content = await file.text();

  if (!content.trim()) {
    return [];
  }

  const entries: FileLogEntry[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed = JSON.parse(trimmed);

      // Validate required fields
      if (
        typeof parsed.taskId === 'string' &&
        typeof parsed.timestamp === 'string' &&
        typeof parsed.message === 'string'
      ) {
        entries.push({
          taskId: parsed.taskId,
          timestamp: new Date(parsed.timestamp),
          message: parsed.message,
        });
      }
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}

/**
 * Get log entries for a specific task, sorted newest-first
 *
 * @param simblDir - Path to .simbl directory
 * @param taskId - Task ID to filter by
 * @returns Array of log entries for the task, newest first
 */
export async function getTaskLog(simblDir: string, taskId: string): Promise<FileLogEntry[]> {
  const allEntries = await readLogFile(simblDir);

  // Filter by exact taskId match
  const taskEntries = allEntries.filter((e) => e.taskId === taskId);

  // Sort newest first (descending by timestamp)
  taskEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return taskEntries;
}
