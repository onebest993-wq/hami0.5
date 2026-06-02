import { describe, expect, it } from 'vitest';
import { mergeHighlightSegments, sanitizeContentHighlights } from './statementContentHighlights';

describe('statementContentHighlights', () => {
    it('sanitizes invalid ranges', () => {
        const hl = sanitizeContentHighlights(
            [
                { start: -1, end: 5, color: 'red' },
                { start: 2, end: 10, color: 'blue' },
            ],
            6,
        );
        expect(hl).toEqual([
            { start: 0, end: 5, color: 'red' },
            { start: 2, end: 6, color: 'blue' },
        ]);
    });

    it('merges segments for display', () => {
        const parts = mergeHighlightSegments('abcdef', [{ start: 1, end: 3, color: 'yellow' }]);
        expect(parts).toEqual([
            { text: 'a' },
            { text: 'bc', color: 'yellow' },
            { text: 'def' },
        ]);
    });
});
