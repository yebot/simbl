import { describe, test, expect } from 'bun:test';
import { sanitizeForJson, sanitizeObjectForJson } from './sanitize';

describe('sanitizeForJson', () => {
  test('passes through normal strings unchanged', () => {
    expect(sanitizeForJson('hello world')).toBe('hello world');
    expect(sanitizeForJson('')).toBe('');
    expect(sanitizeForJson('with\nnewlines\tand\ttabs')).toBe(
      'with\nnewlines\tand\ttabs'
    );
  });

  test('escapes null character', () => {
    expect(sanitizeForJson('hello\x00world')).toBe('hello\\u0000world');
  });

  test('escapes other control characters', () => {
    expect(sanitizeForJson('test\x01value')).toBe('test\\u0001value');
    expect(sanitizeForJson('test\x1Fvalue')).toBe('test\\u001fvalue');
  });

  test('preserves allowed whitespace (tab, newline, carriage return)', () => {
    expect(sanitizeForJson('line1\nline2')).toBe('line1\nline2');
    expect(sanitizeForJson('col1\tcol2')).toBe('col1\tcol2');
    expect(sanitizeForJson('win\r\nlines')).toBe('win\r\nlines');
  });

  test('escapes form feed and vertical tab', () => {
    expect(sanitizeForJson('test\x0Cvalue')).toBe('test\\u000cvalue'); // form feed
    expect(sanitizeForJson('test\x0Bvalue')).toBe('test\\u000bvalue'); // vertical tab
  });

  test('handles multiple control characters', () => {
    expect(sanitizeForJson('\x00\x01\x02')).toBe('\\u0000\\u0001\\u0002');
  });

  test('sanitized output is valid JSON', () => {
    const problematic = 'content\x00with\x01control\x1Fchars';
    const sanitized = sanitizeForJson(problematic);
    // Should not throw
    const json = JSON.stringify({ value: sanitized });
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe('sanitizeObjectForJson', () => {
  test('sanitizes string values', () => {
    const obj = { title: 'hello\x00world' };
    expect(sanitizeObjectForJson(obj)).toEqual({ title: 'hello\\u0000world' });
  });

  test('sanitizes nested objects', () => {
    const obj = {
      task: {
        title: 'test\x01name',
        content: 'body\x02text',
      },
    };
    expect(sanitizeObjectForJson(obj)).toEqual({
      task: {
        title: 'test\\u0001name',
        content: 'body\\u0002text',
      },
    });
  });

  test('sanitizes arrays', () => {
    const arr = ['normal', 'has\x00null', { nested: 'value\x01here' }];
    expect(sanitizeObjectForJson(arr)).toEqual([
      'normal',
      'has\\u0000null',
      { nested: 'value\\u0001here' },
    ]);
  });

  test('preserves non-string values', () => {
    const obj = {
      count: 42,
      active: true,
      empty: null,
      tags: ['a', 'b'],
    };
    expect(sanitizeObjectForJson(obj)).toEqual(obj);
  });

  test('handles complex task structure', () => {
    const task = {
      id: 'task-1',
      title: 'Test\x00Task',
      content: 'Description\x01with\x02issues',
      tags: ['tag1', 'tag\x00bad'],
      reserved: {
        priority: 1,
        project: 'test\x1Fproject',
      },
    };

    const sanitized = sanitizeObjectForJson(task);
    expect(sanitized.title).toBe('Test\\u0000Task');
    expect(sanitized.content).toBe('Description\\u0001with\\u0002issues');
    expect(sanitized.tags[1]).toBe('tag\\u0000bad');
    expect(sanitized.reserved.project).toBe('test\\u001fproject');

    // Verify it produces valid JSON
    const json = JSON.stringify(sanitized);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
