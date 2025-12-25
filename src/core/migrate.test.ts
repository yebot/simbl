import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { join } from 'path';
import { mkdtemp, rm, exists } from 'fs/promises';
import { tmpdir } from 'os';

/**
 * Tests for log migration utility
 *
 * These tests verify the migration from embedded task logs (in task content)
 * to the centralized NDJSON log file format.
 *
 * TDD REQUIREMENT: These tests are written BEFORE implementation.
 * They should fail until the migration functions are implemented.
 */

// Import functions that don't exist yet (will cause test failures)
import { needsMigration, migrateTaskLogs, MigrationResult } from './migrate.js';

describe('Log Migration Utility', () => {
  let tempDir: string;
  let simblDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await mkdtemp(join(tmpdir(), 'simbl-migrate-test-'));
    simblDir = join(tempDir, '.simbl');

    // Create .simbl directory
    await Bun.write(join(simblDir, '.keep'), '');
  });

  afterEach(async () => {
    // Clean up temp directory after each test
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('needsMigration', () => {
    test('returns false for empty tasks.md', async () => {
      // Create empty tasks.md
      const tasksContent = `# Backlog

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config without logVersion
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      const result = await needsMigration(simblDir);
      expect(result).toBe(false);
    });

    test('returns false when logVersion is 2 (already migrated)', async () => {
      // Create tasks.md with embedded logs
      const tasksContent = `# Backlog

## smb-1 Test task

[p1]

### Description

Some content

***

task-log

- 2025-12-20T18:49:44Z | Task created

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config with logVersion: 2
      const configContent = `name: test
prefix: smb
logVersion: 2
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      const result = await needsMigration(simblDir);
      expect(result).toBe(false);
    });

    test('returns true when tasks have embedded logs and logVersion is not 2', async () => {
      // Create tasks.md with embedded logs
      const tasksContent = `# Backlog

## smb-1 Test task

[p1]

### Description

Some content

***

task-log

- 2025-12-20T18:49:44Z | Task created
- 2025-12-20T19:00:00Z | Priority set to [p1]

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config without logVersion
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      const result = await needsMigration(simblDir);
      expect(result).toBe(true);
    });

    test('returns true when tasks have embedded logs and logVersion is 1', async () => {
      // Create tasks.md with embedded logs
      const tasksContent = `# Backlog

## smb-1 Test task

[p1]

***

task-log

- 2025-12-20T18:49:44Z | Task created

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config with logVersion: 1
      const configContent = `name: test
prefix: smb
logVersion: 1
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      const result = await needsMigration(simblDir);
      expect(result).toBe(true);
    });

    test('returns false when no tasks have embedded logs (even if logVersion is not 2)', async () => {
      // Create tasks.md without embedded logs
      const tasksContent = `# Backlog

## smb-1 Test task

[p1]

### Description

Some content with no logs

## smb-2 Another task

[p2]

### Notes

More content, still no logs

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config without logVersion
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      const result = await needsMigration(simblDir);
      expect(result).toBe(false);
    });

    test('handles missing tasks.md gracefully', async () => {
      // Create only config
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      const result = await needsMigration(simblDir);
      expect(result).toBe(false);
    });

    test('handles missing config.yaml gracefully', async () => {
      // Create only tasks.md with embedded logs
      const tasksContent = `# Backlog

## smb-1 Test task

***

task-log

- 2025-12-20T18:49:44Z | Task created

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      const result = await needsMigration(simblDir);
      expect(result).toBe(true);
    });
  });

  describe('migrateTaskLogs', () => {
    test('migrates single task with embedded logs', async () => {
      // Create tasks.md with one task with embedded logs
      const tasksContent = `# Backlog

## smb-1 Test task

[p1]

### Description

Task content here

***

task-log

- 2025-12-20T18:49:44Z | Task created
- 2025-12-20T19:00:00Z | Priority set to [p1]

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      // Run migration
      const result = await migrateTaskLogs(simblDir);

      // Check result
      expect(result.tasksMigrated).toBe(1);
      expect(result.entriesMigrated).toBe(2);
      expect(result.errors).toEqual([]);

      // Verify log.ndjson was created with correct entries
      const logPath = join(simblDir, 'log.ndjson');
      const logExists = await exists(logPath);
      expect(logExists).toBe(true);

      const logContent = await Bun.file(logPath).text();
      const lines = logContent.trim().split('\n');
      expect(lines.length).toBe(2);

      const entry1 = JSON.parse(lines[0]);
      expect(entry1.taskId).toBe('smb-1');
      expect(entry1.timestamp).toBe('2025-12-20T18:49:44.000Z');
      expect(entry1.message).toBe('Task created');

      const entry2 = JSON.parse(lines[1]);
      expect(entry2.taskId).toBe('smb-1');
      expect(entry2.timestamp).toBe('2025-12-20T19:00:00.000Z');
      expect(entry2.message).toBe('Priority set to [p1]');

      // Verify tasks.md has log section stripped
      const updatedTasks = await Bun.file(join(simblDir, 'tasks.md')).text();
      expect(updatedTasks).not.toContain('task-log');
      expect(updatedTasks).toContain('Task content here');

      // Verify config has logVersion: 2
      const updatedConfig = await Bun.file(join(simblDir, 'config.yaml')).text();
      expect(updatedConfig).toContain('logVersion: 2');
    });

    test('migrates multiple tasks with embedded logs', async () => {
      // Create tasks.md with multiple tasks with embedded logs
      const tasksContent = `# Backlog

## smb-1 First task

[p1]

### Description

First task content

***

task-log

- 2025-12-20T10:00:00Z | Task created

## smb-2 Second task

[p2]

### Notes

Second task content

***

task-log

- 2025-12-20T11:00:00Z | Task created
- 2025-12-20T11:30:00Z | Content updated

# Done

## smb-3 Done task

[p3]

***

task-log

- 2025-12-20T12:00:00Z | Task created
- 2025-12-20T12:30:00Z | Marked as done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      // Run migration
      const result = await migrateTaskLogs(simblDir);

      // Check result
      expect(result.tasksMigrated).toBe(3);
      expect(result.entriesMigrated).toBe(5); // 1 + 2 + 2 = 5 total entries
      expect(result.errors).toEqual([]);

      // Verify log.ndjson has all entries
      const logPath = join(simblDir, 'log.ndjson');
      const logContent = await Bun.file(logPath).text();
      const lines = logContent.trim().split('\n');
      expect(lines.length).toBe(5);

      // Verify entries have correct taskIds
      const entries = lines.map((line) => JSON.parse(line));
      const task1Entries = entries.filter((e) => e.taskId === 'smb-1');
      const task2Entries = entries.filter((e) => e.taskId === 'smb-2');
      const task3Entries = entries.filter((e) => e.taskId === 'smb-3');

      expect(task1Entries.length).toBe(1);
      expect(task2Entries.length).toBe(2);
      expect(task3Entries.length).toBe(2);
    });

    test('preserves task content without log section', async () => {
      // Create task with rich content
      const tasksContent = `# Backlog

## smb-1 Test task with rich content

[p1][project:auth]

### Description

This is the task description.

It has multiple paragraphs.

### Acceptance Criteria

- Item 1
- Item 2
- Item 3

### Notes

Some notes here.

***

task-log

- 2025-12-20T18:49:44Z | Task created

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      // Run migration
      await migrateTaskLogs(simblDir);

      // Verify tasks.md preserves all content except log section
      const updatedTasks = await Bun.file(join(simblDir, 'tasks.md')).text();

      expect(updatedTasks).toContain('This is the task description.');
      expect(updatedTasks).toContain('It has multiple paragraphs.');
      expect(updatedTasks).toContain('### Acceptance Criteria');
      expect(updatedTasks).toContain('- Item 1');
      expect(updatedTasks).toContain('- Item 2');
      expect(updatedTasks).toContain('- Item 3');
      expect(updatedTasks).toContain('### Notes');
      expect(updatedTasks).toContain('Some notes here.');

      // But not the log section
      expect(updatedTasks).not.toContain('task-log');
      expect(updatedTasks).not.toContain('Task created');
    });

    test('creates log.ndjson with correct entry format', async () => {
      // Create task with embedded log
      const tasksContent = `# Backlog

## smb-1 Test task

***

task-log

- 2025-12-20T18:49:44Z | Task created with special chars: [p1] @user

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      // Run migration
      await migrateTaskLogs(simblDir);

      // Verify log entry format
      const logPath = join(simblDir, 'log.ndjson');
      const logContent = await Bun.file(logPath).text();
      const entry = JSON.parse(logContent.trim());

      expect(entry).toEqual({
        taskId: 'smb-1',
        timestamp: '2025-12-20T18:49:44.000Z',
        message: 'Task created with special chars: [p1] @user',
      });
    });

    test('sets config.logVersion to 2', async () => {
      // Create tasks.md with embedded logs
      const tasksContent = `# Backlog

## smb-1 Test task

***

task-log

- 2025-12-20T18:49:44Z | Task created

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config without logVersion
      const configContent = `name: test
prefix: smb
webPort: 3497
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      // Run migration
      await migrateTaskLogs(simblDir);

      // Verify config has logVersion: 2 and preserves other fields
      const updatedConfig = await Bun.file(join(simblDir, 'config.yaml')).text();
      expect(updatedConfig).toContain('logVersion: 2');
      expect(updatedConfig).toContain('name: test');
      expect(updatedConfig).toContain('prefix: smb');
      expect(updatedConfig).toContain('webPort: 3497');
    });

    test('is idempotent (running twice does not duplicate)', async () => {
      // Create tasks.md with embedded logs
      const tasksContent = `# Backlog

## smb-1 Test task

***

task-log

- 2025-12-20T18:49:44Z | Task created

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      // Run migration first time
      const result1 = await migrateTaskLogs(simblDir);
      expect(result1.tasksMigrated).toBe(1);
      expect(result1.entriesMigrated).toBe(1);

      // Get log content after first migration
      const logPath = join(simblDir, 'log.ndjson');
      const logContent1 = await Bun.file(logPath).text();

      // Run migration second time (should be a no-op since logVersion is now 2)
      const result2 = await migrateTaskLogs(simblDir);
      expect(result2.tasksMigrated).toBe(0);
      expect(result2.entriesMigrated).toBe(0);

      // Verify log.ndjson is unchanged
      const logContent2 = await Bun.file(logPath).text();
      expect(logContent2).toBe(logContent1);
    });

    test('handles tasks with no logs (leaves them unchanged)', async () => {
      // Create tasks.md with task that has no logs
      const tasksContent = `# Backlog

## smb-1 Task with no logs

[p1]

### Description

Just some content, no logs

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      // Run migration
      const result = await migrateTaskLogs(simblDir);

      // No tasks should be migrated
      expect(result.tasksMigrated).toBe(0);
      expect(result.entriesMigrated).toBe(0);

      // tasks.md should be unchanged
      const updatedTasks = await Bun.file(join(simblDir, 'tasks.md')).text();
      expect(updatedTasks).toContain('Just some content, no logs');

      // log.ndjson should not exist or be empty
      const logPath = join(simblDir, 'log.ndjson');
      const logExists = await exists(logPath);
      if (logExists) {
        const logContent = await Bun.file(logPath).text();
        expect(logContent.trim()).toBe('');
      }

      // Config should still have logVersion: 2
      const updatedConfig = await Bun.file(join(simblDir, 'config.yaml')).text();
      expect(updatedConfig).toContain('logVersion: 2');
    });

    test('handles mixed tasks (some with logs, some without)', async () => {
      // Create tasks.md with mixed tasks
      const tasksContent = `# Backlog

## smb-1 Task with logs

[p1]

### Description

Has logs

***

task-log

- 2025-12-20T10:00:00Z | Task created

## smb-2 Task without logs

[p2]

### Description

No logs here

## smb-3 Another task with logs

[p3]

***

task-log

- 2025-12-20T11:00:00Z | Task created
- 2025-12-20T11:30:00Z | Content updated

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      // Run migration
      const result = await migrateTaskLogs(simblDir);

      // Only tasks with logs should be migrated
      expect(result.tasksMigrated).toBe(2);
      expect(result.entriesMigrated).toBe(3); // 1 + 2 = 3

      // Verify tasks.md has logs stripped from tasks 1 and 3, but task 2 unchanged
      const updatedTasks = await Bun.file(join(simblDir, 'tasks.md')).text();
      expect(updatedTasks).toContain('Has logs');
      expect(updatedTasks).toContain('No logs here');
      expect(updatedTasks).toContain('smb-3');
      expect(updatedTasks).not.toContain('task-log');

      // Verify log.ndjson has entries only for tasks 1 and 3
      const logPath = join(simblDir, 'log.ndjson');
      const logContent = await Bun.file(logPath).text();
      const lines = logContent.trim().split('\n');
      expect(lines.length).toBe(3);

      const entries = lines.map((line) => JSON.parse(line));
      const taskIds = entries.map((e) => e.taskId);
      expect(taskIds).toContain('smb-1');
      expect(taskIds).toContain('smb-3');
      expect(taskIds).not.toContain('smb-2');
    });

    test('reports correct counts in result', async () => {
      // Create tasks.md with specific number of tasks and entries
      const tasksContent = `# Backlog

## smb-1 Task 1

***

task-log

- 2025-12-20T10:00:00Z | Entry 1
- 2025-12-20T10:30:00Z | Entry 2
- 2025-12-20T11:00:00Z | Entry 3

## smb-2 Task 2

***

task-log

- 2025-12-20T12:00:00Z | Entry 4

# Done

## smb-3 Task 3

***

task-log

- 2025-12-20T13:00:00Z | Entry 5
- 2025-12-20T13:30:00Z | Entry 6
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      // Run migration
      const result = await migrateTaskLogs(simblDir);

      // Verify counts
      expect(result.tasksMigrated).toBe(3);
      expect(result.entriesMigrated).toBe(6);
      expect(result.errors).toEqual([]);
    });

    test('handles tasks with only log section and no other content', async () => {
      // Create task with ONLY log section, no description
      const tasksContent = `# Backlog

## smb-1 Minimal task

***

task-log

- 2025-12-20T18:49:44Z | Task created

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      // Run migration
      const result = await migrateTaskLogs(simblDir);

      expect(result.tasksMigrated).toBe(1);
      expect(result.entriesMigrated).toBe(1);

      // Verify tasks.md still has the task but without log section
      const updatedTasks = await Bun.file(join(simblDir, 'tasks.md')).text();
      expect(updatedTasks).toContain('## smb-1 Minimal task');
      expect(updatedTasks).not.toContain('task-log');
      expect(updatedTasks).not.toContain('Task created');
    });

    test('preserves task formatting and spacing', async () => {
      // Create tasks.md with specific formatting
      const tasksContent = `# Backlog

## smb-1 Test task

[p1][project:auth]

### Description

Content here

More content

***

task-log

- 2025-12-20T18:49:44Z | Task created

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      // Run migration
      await migrateTaskLogs(simblDir);

      // Verify content is preserved (note: remark normalizes whitespace)
      const updatedTasks = await Bun.file(join(simblDir, 'tasks.md')).text();
      expect(updatedTasks).toContain('Content here');
      expect(updatedTasks).toContain('More content');
      expect(updatedTasks).not.toContain('***');
      expect(updatedTasks).not.toContain('task-log');
    });

    test('handles empty backlog and done sections', async () => {
      // Create empty tasks.md
      const tasksContent = `# Backlog

# Done
`;
      await Bun.write(join(simblDir, 'tasks.md'), tasksContent);

      // Create config
      const configContent = `name: test
prefix: smb
`;
      await Bun.write(join(simblDir, 'config.yaml'), configContent);

      // Run migration
      const result = await migrateTaskLogs(simblDir);

      expect(result.tasksMigrated).toBe(0);
      expect(result.entriesMigrated).toBe(0);
      expect(result.errors).toEqual([]);

      // Config should still be updated
      const updatedConfig = await Bun.file(join(simblDir, 'config.yaml')).text();
      expect(updatedConfig).toContain('logVersion: 2');
    });
  });

  describe('MigrationResult type checking', () => {
    test('MigrationResult should have required fields', () => {
      const result: MigrationResult = {
        tasksMigrated: 5,
        entriesMigrated: 10,
        errors: [],
      };

      expect(result.tasksMigrated).toBeDefined();
      expect(result.entriesMigrated).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('MigrationResult can contain errors', () => {
      const result: MigrationResult = {
        tasksMigrated: 2,
        entriesMigrated: 3,
        errors: ['Error parsing task smb-5', 'Failed to write log entry'],
      };

      expect(result.errors.length).toBe(2);
      expect(result.errors[0]).toBe('Error parsing task smb-5');
    });
  });
});
