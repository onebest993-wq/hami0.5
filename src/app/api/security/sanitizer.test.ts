import { describe, expect, it } from 'vitest';
import { isJsonObjectRecord, sanitizePayload } from './sanitizer.ts';

describe('sanitizePayload', () => {
  it('strips script tags and keeps safe text', () => {
    const input = '<script>alert("xss")</script>Hello';
    const output = sanitizePayload(input);
    expect(output).toBe('Hello');
  });

  it('removes dangerous attributes/protocol payloads from html fragments', () => {
    const input = '<img src=x onerror=alert(1) /><a href="javascript:alert(1)">Click</a>';
    const output = sanitizePayload(input);
    expect(output).toContain('Click');
    expect(output).not.toContain('onerror');
    expect(output).not.toContain('javascript:');
    expect(output).not.toContain('<img');
    expect(output).not.toContain('<a');
  });

  it('sanitizes nested objects and arrays recursively', () => {
    const input = {
      name: '<b>Ali</b>',
      notes: ['<svg onload=alert(1)>x</svg>', 'safe'],
      nested: {
        text: '<iframe src="https://evil.test"></iframe>ok',
      },
    };

    const output = sanitizePayload(input);
    expect(output.name).toBe('Ali');
    expect(output.notes[0]).toBe('');
    expect(output.notes[0]).not.toContain('<svg');
    expect(output.nested.text).toBe('ok');
  });

    it('preserves non-string primitive values and null/undefined safely', () => {
    expect(sanitizePayload(123)).toBe(123);
    expect(sanitizePayload(true)).toBe(true);
    expect(sanitizePayload(null)).toBe(null);
    expect(sanitizePayload(undefined)).toBe(undefined);
  });

  it('drops prototype-pollution keys and does not pollute Object.prototype', () => {
    const poisoned = JSON.parse('{"__proto__":{"polluted":true},"ok":"yes","constructor":{"pro":1}}') as Record<
      string,
      unknown
    >;
    const output = sanitizePayload(poisoned) as Record<string, unknown>;
    expect(output.ok).toBe('yes');
    expect(Object.prototype.hasOwnProperty.call(output, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(output, 'constructor')).toBe(false);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('rejects arrays as JSON object records', () => {
    expect(isJsonObjectRecord([])).toBe(false);
    expect(isJsonObjectRecord(null)).toBe(false);
    expect(isJsonObjectRecord({ a: 1 })).toBe(true);
  });
});
