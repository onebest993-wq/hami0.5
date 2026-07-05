import { describe, expect, it } from 'vitest';
import { sanitizePayload } from './sanitizer.ts';
describe('sanitizePayload', function () {
    it('strips script tags and keeps safe text', function () {
        var input = '<script>alert("xss")</script>Hello';
        var output = sanitizePayload(input);
        expect(output).toBe('Hello');
    });
    it('removes dangerous attributes/protocol payloads from html fragments', function () {
        var input = '<img src=x onerror=alert(1) /><a href="javascript:alert(1)">Click</a>';
        var output = sanitizePayload(input);
        expect(output).toContain('Click');
        expect(output).not.toContain('onerror');
        expect(output).not.toContain('javascript:');
        expect(output).not.toContain('<img');
        expect(output).not.toContain('<a');
    });
    it('sanitizes nested objects and arrays recursively', function () {
        var input = {
            name: '<b>Ali</b>',
            notes: ['<svg onload=alert(1)>x</svg>', 'safe'],
            nested: {
                text: '<iframe src="https://evil.test"></iframe>ok',
            },
        };
        var output = sanitizePayload(input);
        expect(output.name).toBe('Ali');
        expect(output.notes[0]).toBe('');
        expect(output.notes[0]).not.toContain('<svg');
        expect(output.nested.text).toBe('ok');
    });
    it('preserves non-string primitive values and null/undefined safely', function () {
        expect(sanitizePayload(123)).toBe(123);
        expect(sanitizePayload(true)).toBe(true);
        expect(sanitizePayload(null)).toBe(null);
        expect(sanitizePayload(undefined)).toBe(undefined);
    });
});
