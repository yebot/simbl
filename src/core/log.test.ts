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
});
