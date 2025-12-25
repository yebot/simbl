/**
 * Sanitize a string for JSON output by escaping control characters.
 *
 * JSON.stringify should handle this, but some edge cases with binary data
 * or corrupted UTF-8 can cause issues. This provides a defensive layer.
 */
export function sanitizeForJson(value: string): string {
  // Replace control characters (0x00-0x1F except tab, newline, carriage return)
  // with their Unicode escape sequences
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, (char) => {
    return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
  });
}

/**
 * Recursively sanitize all string values in an object for JSON output.
 */
export function sanitizeObjectForJson<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeForJson(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectForJson) as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObjectForJson(value);
    }
    return result as T;
  }

  return obj;
}
