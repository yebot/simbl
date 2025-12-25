import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { join } from 'path';
import { mkdtemp, rm, exists } from 'fs/promises';
import { tmpdir } from 'os';

/**
 * Tests for centralized log file operations
 *
 * These tests cover the new NDJSON-based log file system that will replace
 * embedded task logs. The log file lives at `.simbl/log.ndjson` and contains
 * one JSON object per line.
 */

// Import functions that don't exist yet (will cause test failures)
import {
  FileLogEntry,
  appendLogToFile,
  readLogFile,
  getTaskLog,
} from './log.js';

describe('Centralized Log File Operations', () => {
  let tempDir: string;
  let simblDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await mkdtemp(join(tmpdir(), 'simbl-test-'));
    simblDir = join(tempDir, '.simbl');

    // Create .simbl directory
    await Bun.write(join(simblDir, '.keep'), '');
  });

  afterEach(async () => {
    // Clean up temp directory after each test
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('appendLogToFile', () => {
    test('creates log file if it does not exist', async () => {
      const entry: FileLogEntry = {
        taskId: 'smb-1',
        timestamp: new Date('2025-12-20T18:49:44Z'),
        message: 'Task created',
      };

      await appendLogToFile(simblDir, entry);

      const logPath = join(simblDir, 'log.ndjson');
      const fileExists = await exists(logPath);
      expect(fileExists).toBe(true);
    });

    test('appends entry as valid NDJSON line', async () => {
      const entry: FileLogEntry = {
        taskId: 'smb-1',
        timestamp: new Date('2025-12-20T18:49:44Z'),
        message: 'Task created',
      };

      await appendLogToFile(simblDir, entry);

      const logPath = join(simblDir, 'log.ndjson');
      const content = await Bun.file(logPath).text();
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(1);

      const parsed = JSON.parse(lines[0]);
      expect(parsed.taskId).toBe('smb-1');
      expect(parsed.timestamp).toBe('2025-12-20T18:49:44.000Z');
      expect(parsed.message).toBe('Task created');
    });

    test('multiple appends create multiple lines', async () => {
      const entry1: FileLogEntry = {
        taskId: 'smb-1',
        timestamp: new Date('2025-12-20T18:49:44Z'),
        message: 'Task created',
      };

      const entry2: FileLogEntry = {
        taskId: 'smb-2',
        timestamp: new Date('2025-12-20T19:00:00Z'),
        message: 'Another task created',
      };

      await appendLogToFile(simblDir, entry1);
      await appendLogToFile(simblDir, entry2);

      const logPath = join(simblDir, 'log.ndjson');
      const content = await Bun.file(logPath).text();
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);

      const parsed1 = JSON.parse(lines[0]);
      expect(parsed1.taskId).toBe('smb-1');

      const parsed2 = JSON.parse(lines[1]);
      expect(parsed2.taskId).toBe('smb-2');
    });

    test('entry has correct taskId, timestamp, message format', async () => {
      const timestamp = new Date('2025-12-20T18:49:44.123Z');
      const entry: FileLogEntry = {
        taskId: 'smb-123',
        timestamp,
        message: 'Test message with special chars: [p1] @user',
      };

      await appendLogToFile(simblDir, entry);

      const logPath = join(simblDir, 'log.ndjson');
      const content = await Bun.file(logPath).text();
      const parsed = JSON.parse(content.trim());

      expect(parsed).toEqual({
        taskId: 'smb-123',
        timestamp: timestamp.toISOString(),
        message: 'Test message with special chars: [p1] @user',
      });
    });

    test('handles concurrent writes atomically', async () => {
      // This test ensures that multiple simultaneous writes don't corrupt the file
      const entries: FileLogEntry[] = Array.from({ length: 10 }, (_, i) => ({
        taskId: `smb-${i}`,
        timestamp: new Date(`2025-12-20T18:${i.toString().padStart(2, '0')}:00Z`),
        message: `Concurrent write ${i}`,
      }));

      // Write all entries concurrently
      await Promise.all(entries.map((entry) => appendLogToFile(simblDir, entry)));

      const logPath = join(simblDir, 'log.ndjson');
      const content = await Bun.file(logPath).text();
      const lines = content.trim().split('\n');

      // All 10 entries should be present
      expect(lines.length).toBe(10);

      // Each line should be valid JSON
      lines.forEach((line) => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });
  });

  describe('readLogFile', () => {
    test('returns empty array for non-existent file', async () => {
      const entries = await readLogFile(simblDir);
      expect(entries).toEqual([]);
    });

    test('parses single entry correctly', async () => {
      const logPath = join(simblDir, 'log.ndjson');
      const timestamp = new Date('2025-12-20T18:49:44.000Z');

      await Bun.write(
        logPath,
        JSON.stringify({
          taskId: 'smb-1',
          timestamp: timestamp.toISOString(),
          message: 'Task created',
        }) + '\n'
      );

      const entries = await readLogFile(simblDir);

      expect(entries.length).toBe(1);
      expect(entries[0].taskId).toBe('smb-1');
      expect(entries[0].timestamp).toEqual(timestamp);
      expect(entries[0].message).toBe('Task created');
    });

    test('parses multiple entries correctly', async () => {
      const logPath = join(simblDir, 'log.ndjson');
      const timestamp1 = new Date('2025-12-20T18:49:44.000Z');
      const timestamp2 = new Date('2025-12-20T19:00:00.000Z');
      const timestamp3 = new Date('2025-12-20T19:15:00.000Z');

      const lines = [
        JSON.stringify({ taskId: 'smb-1', timestamp: timestamp1.toISOString(), message: 'First' }),
        JSON.stringify({ taskId: 'smb-2', timestamp: timestamp2.toISOString(), message: 'Second' }),
        JSON.stringify({ taskId: 'smb-1', timestamp: timestamp3.toISOString(), message: 'Third' }),
      ];

      await Bun.write(logPath, lines.join('\n') + '\n');

      const entries = await readLogFile(simblDir);

      expect(entries.length).toBe(3);
      expect(entries[0].taskId).toBe('smb-1');
      expect(entries[0].message).toBe('First');
      expect(entries[1].taskId).toBe('smb-2');
      expect(entries[1].message).toBe('Second');
      expect(entries[2].taskId).toBe('smb-1');
      expect(entries[2].message).toBe('Third');
    });

    test('skips malformed lines without throwing', async () => {
      const logPath = join(simblDir, 'log.ndjson');
      const timestamp = new Date('2025-12-20T18:49:44.000Z');

      const lines = [
        JSON.stringify({ taskId: 'smb-1', timestamp: timestamp.toISOString(), message: 'Valid' }),
        'not json at all',
        JSON.stringify({ taskId: 'incomplete', message: 'Missing timestamp' }),
        '',
        JSON.stringify({ taskId: 'smb-2', timestamp: timestamp.toISOString(), message: 'Also valid' }),
      ];

      await Bun.write(logPath, lines.join('\n') + '\n');

      const entries = await readLogFile(simblDir);

      // Should only parse the two valid entries
      expect(entries.length).toBe(2);
      expect(entries[0].taskId).toBe('smb-1');
      expect(entries[1].taskId).toBe('smb-2');
    });

    test('returns entries in file order', async () => {
      const logPath = join(simblDir, 'log.ndjson');

      // Write entries with different timestamps but in specific file order
      const lines = [
        JSON.stringify({ taskId: 'smb-1', timestamp: '2025-12-20T12:00:00.000Z', message: 'First in file' }),
        JSON.stringify({ taskId: 'smb-2', timestamp: '2025-12-20T10:00:00.000Z', message: 'Second in file' }),
        JSON.stringify({ taskId: 'smb-3', timestamp: '2025-12-20T14:00:00.000Z', message: 'Third in file' }),
      ];

      await Bun.write(logPath, lines.join('\n') + '\n');

      const entries = await readLogFile(simblDir);

      // Should maintain file order, not sort by timestamp
      expect(entries[0].message).toBe('First in file');
      expect(entries[1].message).toBe('Second in file');
      expect(entries[2].message).toBe('Third in file');
    });

    test('handles empty file', async () => {
      const logPath = join(simblDir, 'log.ndjson');
      await Bun.write(logPath, '');

      const entries = await readLogFile(simblDir);
      expect(entries).toEqual([]);
    });

    test('handles file with only whitespace', async () => {
      const logPath = join(simblDir, 'log.ndjson');
      await Bun.write(logPath, '\n\n  \n\n');

      const entries = await readLogFile(simblDir);
      expect(entries).toEqual([]);
    });
  });

  describe('getTaskLog', () => {
    test('returns empty array for non-existent file', async () => {
      const entries = await getTaskLog(simblDir, 'smb-1');
      expect(entries).toEqual([]);
    });

    test('returns only entries matching taskId', async () => {
      const logPath = join(simblDir, 'log.ndjson');

      const lines = [
        JSON.stringify({ taskId: 'smb-1', timestamp: '2025-12-20T10:00:00.000Z', message: 'Task 1 entry 1' }),
        JSON.stringify({ taskId: 'smb-2', timestamp: '2025-12-20T11:00:00.000Z', message: 'Task 2 entry' }),
        JSON.stringify({ taskId: 'smb-1', timestamp: '2025-12-20T12:00:00.000Z', message: 'Task 1 entry 2' }),
        JSON.stringify({ taskId: 'smb-3', timestamp: '2025-12-20T13:00:00.000Z', message: 'Task 3 entry' }),
        JSON.stringify({ taskId: 'smb-1', timestamp: '2025-12-20T14:00:00.000Z', message: 'Task 1 entry 3' }),
      ];

      await Bun.write(logPath, lines.join('\n') + '\n');

      const entries = await getTaskLog(simblDir, 'smb-1');

      expect(entries.length).toBe(3);
      expect(entries.every((e) => e.taskId === 'smb-1')).toBe(true);
      // All three entries should be present (order tested in 'returns entries sorted newest first')
      const messages = entries.map((e) => e.message);
      expect(messages).toContain('Task 1 entry 1');
      expect(messages).toContain('Task 1 entry 2');
      expect(messages).toContain('Task 1 entry 3');
    });

    test('returns entries sorted newest first', async () => {
      const logPath = join(simblDir, 'log.ndjson');

      // Write entries in chronological order (oldest to newest)
      const lines = [
        JSON.stringify({ taskId: 'smb-1', timestamp: '2025-12-20T10:00:00.000Z', message: 'Oldest' }),
        JSON.stringify({ taskId: 'smb-1', timestamp: '2025-12-20T12:00:00.000Z', message: 'Middle' }),
        JSON.stringify({ taskId: 'smb-1', timestamp: '2025-12-20T14:00:00.000Z', message: 'Newest' }),
      ];

      await Bun.write(logPath, lines.join('\n') + '\n');

      const entries = await getTaskLog(simblDir, 'smb-1');

      // Should be returned newest-first
      expect(entries[0].message).toBe('Newest');
      expect(entries[1].message).toBe('Middle');
      expect(entries[2].message).toBe('Oldest');
    });

    test('returns empty array if no matches', async () => {
      const logPath = join(simblDir, 'log.ndjson');

      const lines = [
        JSON.stringify({ taskId: 'smb-2', timestamp: '2025-12-20T10:00:00.000Z', message: 'Task 2' }),
        JSON.stringify({ taskId: 'smb-3', timestamp: '2025-12-20T11:00:00.000Z', message: 'Task 3' }),
      ];

      await Bun.write(logPath, lines.join('\n') + '\n');

      const entries = await getTaskLog(simblDir, 'smb-1');
      expect(entries).toEqual([]);
    });

    test('handles task IDs that are prefixes of others', async () => {
      const logPath = join(simblDir, 'log.ndjson');

      const lines = [
        JSON.stringify({ taskId: 'smb-1', timestamp: '2025-12-20T10:00:00.000Z', message: 'Task 1' }),
        JSON.stringify({ taskId: 'smb-10', timestamp: '2025-12-20T11:00:00.000Z', message: 'Task 10' }),
        JSON.stringify({ taskId: 'smb-100', timestamp: '2025-12-20T12:00:00.000Z', message: 'Task 100' }),
      ];

      await Bun.write(logPath, lines.join('\n') + '\n');

      const entries = await getTaskLog(simblDir, 'smb-1');

      expect(entries.length).toBe(1);
      expect(entries[0].taskId).toBe('smb-1');
      expect(entries[0].message).toBe('Task 1');
    });
  });

  describe('FileLogEntry type checking', () => {
    test('FileLogEntry should have required fields', () => {
      const entry: FileLogEntry = {
        taskId: 'smb-1',
        timestamp: new Date(),
        message: 'Test',
      };

      expect(entry.taskId).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.message).toBeDefined();
    });
  });

  describe('NDJSON format validation', () => {
    test('each line in log file is valid JSON', async () => {
      const entries: FileLogEntry[] = [
        { taskId: 'smb-1', timestamp: new Date('2025-12-20T10:00:00Z'), message: 'First entry' },
        { taskId: 'smb-2', timestamp: new Date('2025-12-20T11:00:00Z'), message: 'Second entry' },
        { taskId: 'smb-3', timestamp: new Date('2025-12-20T12:00:00Z'), message: 'Third entry' },
      ];

      for (const entry of entries) {
        await appendLogToFile(simblDir, entry);
      }

      const logPath = join(simblDir, 'log.ndjson');
      const content = await Bun.file(logPath).text();
      const lines = content.split('\n').filter((line) => line.trim() !== '');

      expect(lines.length).toBe(3);

      // Each line must be valid JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty('taskId');
        expect(parsed).toHaveProperty('timestamp');
        expect(parsed).toHaveProperty('message');
      }
    });

    test('log entries contain only expected fields', async () => {
      const entry: FileLogEntry = {
        taskId: 'smb-1',
        timestamp: new Date('2025-12-20T10:00:00Z'),
        message: 'Test entry',
      };

      await appendLogToFile(simblDir, entry);

      const logPath = join(simblDir, 'log.ndjson');
      const content = await Bun.file(logPath).text();
      const parsed = JSON.parse(content.trim());

      // Should only have these three fields
      const keys = Object.keys(parsed);
      expect(keys).toEqual(['taskId', 'timestamp', 'message']);
    });

    test('timestamps are in ISO 8601 format', async () => {
      const entry: FileLogEntry = {
        taskId: 'smb-1',
        timestamp: new Date('2025-12-20T18:49:44.123Z'),
        message: 'Test entry',
      };

      await appendLogToFile(simblDir, entry);

      const logPath = join(simblDir, 'log.ndjson');
      const content = await Bun.file(logPath).text();
      const parsed = JSON.parse(content.trim());

      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('special characters in messages are properly escaped', async () => {
      const entry: FileLogEntry = {
        taskId: 'smb-1',
        timestamp: new Date('2025-12-20T10:00:00Z'),
        message: 'Message with "quotes", newline\n, tab\t, and backslash\\',
      };

      await appendLogToFile(simblDir, entry);

      const logPath = join(simblDir, 'log.ndjson');
      const content = await Bun.file(logPath).text();

      // Should be valid JSON
      expect(() => JSON.parse(content.trim())).not.toThrow();

      const parsed = JSON.parse(content.trim());
      expect(parsed.message).toBe('Message with "quotes", newline\n, tab\t, and backslash\\');
    });
  });

  describe('concurrent writes (stress test)', () => {
    test('handles 50 concurrent writes without corruption', async () => {
      const entries: FileLogEntry[] = Array.from({ length: 50 }, (_, i) => ({
        taskId: `smb-${i}`,
        timestamp: new Date(`2025-12-20T${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`),
        message: `Concurrent write ${i} with some content to make the line longer`,
      }));

      // Write all entries concurrently
      await Promise.all(entries.map((entry) => appendLogToFile(simblDir, entry)));

      const logPath = join(simblDir, 'log.ndjson');
      const content = await Bun.file(logPath).text();
      const lines = content.split('\n').filter((line) => line.trim() !== '');

      // All 50 entries should be present
      expect(lines.length).toBe(50);

      // Each line should be valid JSON with correct structure
      const parsedEntries: Array<{ taskId: string; timestamp: string; message: string }> = [];
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
        parsedEntries.push(JSON.parse(line));
      }

      // Verify all task IDs are present (order may vary due to concurrency)
      const taskIds = new Set(parsedEntries.map((e) => e.taskId));
      expect(taskIds.size).toBe(50);
    });

    test('handles rapid sequential writes', async () => {
      const entries: FileLogEntry[] = Array.from({ length: 100 }, (_, i) => ({
        taskId: 'smb-1',
        timestamp: new Date(Date.now() + i),
        message: `Sequential write ${i}`,
      }));

      // Write entries sequentially as fast as possible
      for (const entry of entries) {
        await appendLogToFile(simblDir, entry);
      }

      const logPath = join(simblDir, 'log.ndjson');
      const content = await Bun.file(logPath).text();
      const lines = content.split('\n').filter((line) => line.trim() !== '');

      expect(lines.length).toBe(100);

      // All lines should be valid JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });
  });

  describe('large log file performance', () => {
    test('handles 1000+ entries without timeout', async () => {
      const logPath = join(simblDir, 'log.ndjson');

      // Generate 1000 log entries
      const lines: string[] = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(
          JSON.stringify({
            taskId: `smb-${i % 100}`, // 100 different tasks
            timestamp: new Date(`2025-12-${String(1 + Math.floor(i / 50)).padStart(2, '0')}T${String(Math.floor(i / 60) % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00.000Z`).toISOString(),
            message: `Log entry number ${i} with some additional text content`,
          })
        );
      }

      await Bun.write(logPath, lines.join('\n') + '\n');

      // Measure read performance
      const startRead = performance.now();
      const entries = await readLogFile(simblDir);
      const readDuration = performance.now() - startRead;

      expect(entries.length).toBe(1000);
      // Should complete in under 1 second
      expect(readDuration).toBeLessThan(1000);
    });

    test('getTaskLog filters efficiently from large file', async () => {
      const logPath = join(simblDir, 'log.ndjson');

      // Generate 1000 log entries, 10 for each of 100 tasks
      const lines: string[] = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(
          JSON.stringify({
            taskId: `smb-${i % 100}`,
            timestamp: new Date(`2025-12-20T${String(Math.floor(i / 60) % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00.000Z`).toISOString(),
            message: `Entry ${i}`,
          })
        );
      }

      await Bun.write(logPath, lines.join('\n') + '\n');

      // Measure filter performance
      const startFilter = performance.now();
      const taskEntries = await getTaskLog(simblDir, 'smb-42');
      const filterDuration = performance.now() - startFilter;

      // Should have exactly 10 entries for task smb-42
      expect(taskEntries.length).toBe(10);
      expect(taskEntries.every((e) => e.taskId === 'smb-42')).toBe(true);

      // Should complete in under 500ms
      expect(filterDuration).toBeLessThan(500);
    });

    test('appending to large file is efficient', async () => {
      const logPath = join(simblDir, 'log.ndjson');

      // Create initial large file
      const lines: string[] = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(
          JSON.stringify({
            taskId: `smb-${i}`,
            timestamp: new Date().toISOString(),
            message: `Entry ${i}`,
          })
        );
      }
      await Bun.write(logPath, lines.join('\n') + '\n');

      // Measure append performance
      const startAppend = performance.now();
      await appendLogToFile(simblDir, {
        taskId: 'smb-new',
        timestamp: new Date(),
        message: 'New entry appended to large file',
      });
      const appendDuration = performance.now() - startAppend;

      // Should complete in under 100ms (append should be O(1))
      expect(appendDuration).toBeLessThan(100);

      // Verify entry was added
      const content = await Bun.file(logPath).text();
      const allLines = content.split('\n').filter((line) => line.trim() !== '');
      expect(allLines.length).toBe(1001);
    });
  });

  describe('date filtering (for log command)', () => {
    test('filters entries by since date', async () => {
      const logPath = join(simblDir, 'log.ndjson');

      const lines = [
        JSON.stringify({ taskId: 'smb-1', timestamp: '2025-12-18T10:00:00.000Z', message: 'Old entry' }),
        JSON.stringify({ taskId: 'smb-2', timestamp: '2025-12-19T10:00:00.000Z', message: 'Yesterday' }),
        JSON.stringify({ taskId: 'smb-3', timestamp: '2025-12-20T10:00:00.000Z', message: 'Today' }),
        JSON.stringify({ taskId: 'smb-4', timestamp: '2025-12-21T10:00:00.000Z', message: 'Tomorrow' }),
      ];

      await Bun.write(logPath, lines.join('\n') + '\n');

      const entries = await readLogFile(simblDir);

      // Filter since 2025-12-20
      const sinceDate = new Date('2025-12-20');
      sinceDate.setHours(0, 0, 0, 0);
      const filtered = entries.filter((e) => e.timestamp >= sinceDate);

      expect(filtered.length).toBe(2);
      expect(filtered.map((e) => e.message)).toContain('Today');
      expect(filtered.map((e) => e.message)).toContain('Tomorrow');
    });

    test('filters entries by until date', async () => {
      const logPath = join(simblDir, 'log.ndjson');

      const lines = [
        JSON.stringify({ taskId: 'smb-1', timestamp: '2025-12-18T10:00:00.000Z', message: 'Old entry' }),
        JSON.stringify({ taskId: 'smb-2', timestamp: '2025-12-19T10:00:00.000Z', message: 'Yesterday' }),
        JSON.stringify({ taskId: 'smb-3', timestamp: '2025-12-20T10:00:00.000Z', message: 'Today' }),
        JSON.stringify({ taskId: 'smb-4', timestamp: '2025-12-21T10:00:00.000Z', message: 'Tomorrow' }),
      ];

      await Bun.write(logPath, lines.join('\n') + '\n');

      const entries = await readLogFile(simblDir);

      // Filter until 2025-12-19
      const untilDate = new Date('2025-12-19');
      untilDate.setHours(23, 59, 59, 999);
      const filtered = entries.filter((e) => e.timestamp <= untilDate);

      expect(filtered.length).toBe(2);
      expect(filtered.map((e) => e.message)).toContain('Old entry');
      expect(filtered.map((e) => e.message)).toContain('Yesterday');
    });

    test('filters entries by date range', async () => {
      const logPath = join(simblDir, 'log.ndjson');

      const lines = [
        JSON.stringify({ taskId: 'smb-1', timestamp: '2025-12-18T10:00:00.000Z', message: 'Too old' }),
        JSON.stringify({ taskId: 'smb-2', timestamp: '2025-12-19T10:00:00.000Z', message: 'In range 1' }),
        JSON.stringify({ taskId: 'smb-3', timestamp: '2025-12-20T10:00:00.000Z', message: 'In range 2' }),
        JSON.stringify({ taskId: 'smb-4', timestamp: '2025-12-21T10:00:00.000Z', message: 'Too new' }),
      ];

      await Bun.write(logPath, lines.join('\n') + '\n');

      const entries = await readLogFile(simblDir);

      // Filter 2025-12-19 to 2025-12-20
      const sinceDate = new Date('2025-12-19');
      sinceDate.setHours(0, 0, 0, 0);
      const untilDate = new Date('2025-12-20');
      untilDate.setHours(23, 59, 59, 999);

      const filtered = entries.filter((e) => e.timestamp >= sinceDate && e.timestamp <= untilDate);

      expect(filtered.length).toBe(2);
      expect(filtered.map((e) => e.message)).toContain('In range 1');
      expect(filtered.map((e) => e.message)).toContain('In range 2');
    });

    test('handles edge case with entries at exact boundary times', async () => {
      const logPath = join(simblDir, 'log.ndjson');

      const lines = [
        JSON.stringify({ taskId: 'smb-1', timestamp: '2025-12-20T00:00:00.000Z', message: 'Start of day' }),
        JSON.stringify({ taskId: 'smb-2', timestamp: '2025-12-20T12:00:00.000Z', message: 'Middle of day' }),
        JSON.stringify({ taskId: 'smb-3', timestamp: '2025-12-20T23:59:59.999Z', message: 'End of day' }),
      ];

      await Bun.write(logPath, lines.join('\n') + '\n');

      const entries = await readLogFile(simblDir);

      // Filter for exactly 2025-12-20
      const sinceDate = new Date('2025-12-20T00:00:00.000Z');
      const untilDate = new Date('2025-12-20T23:59:59.999Z');

      const filtered = entries.filter((e) => e.timestamp >= sinceDate && e.timestamp <= untilDate);

      expect(filtered.length).toBe(3);
    });
  });

  describe('no log markers in tasks.md', () => {
    test('log file operations do not create task-log markers', async () => {
      const tasksPath = join(simblDir, 'tasks.md');
      const tasksContent = `# Backlog

## smb-1 Test task

[p1]

### Description

Task content here

# Done
`;
      await Bun.write(tasksPath, tasksContent);

      // Perform log operations
      await appendLogToFile(simblDir, {
        taskId: 'smb-1',
        timestamp: new Date(),
        message: 'Task created',
      });

      await appendLogToFile(simblDir, {
        taskId: 'smb-1',
        timestamp: new Date(),
        message: 'Content updated',
      });

      // Read back tasks.md
      const updatedContent = await Bun.file(tasksPath).text();

      // Should NOT contain any log markers
      expect(updatedContent).not.toContain('***');
      expect(updatedContent).not.toContain('task-log');
      expect(updatedContent).not.toContain('Task created');
      expect(updatedContent).not.toContain('Content updated');

      // Original content should be preserved
      expect(updatedContent).toContain('Test task');
      expect(updatedContent).toContain('Task content here');
    });

    test('centralized log is separate from tasks.md', async () => {
      const tasksPath = join(simblDir, 'tasks.md');
      const logPath = join(simblDir, 'log.ndjson');

      const tasksContent = `# Backlog

## smb-1 Test task

[p1]

# Done
`;
      await Bun.write(tasksPath, tasksContent);

      // Add log entries
      await appendLogToFile(simblDir, {
        taskId: 'smb-1',
        timestamp: new Date('2025-12-20T10:00:00Z'),
        message: 'First log entry',
      });

      await appendLogToFile(simblDir, {
        taskId: 'smb-1',
        timestamp: new Date('2025-12-20T11:00:00Z'),
        message: 'Second log entry',
      });

      // Verify log.ndjson has the entries
      const logContent = await Bun.file(logPath).text();
      expect(logContent).toContain('First log entry');
      expect(logContent).toContain('Second log entry');

      // Verify tasks.md is unchanged
      const tasksAfter = await Bun.file(tasksPath).text();
      expect(tasksAfter).toBe(tasksContent);
    });
  });
});
