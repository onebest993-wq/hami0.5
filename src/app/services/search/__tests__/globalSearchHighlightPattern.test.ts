import { describe, expect, it } from 'vitest';
import {
    buildSafeHighlightPattern,
    HIGHLIGHT_QUERY_MAX_LENGTH,
    tokenizeHighlightQuery,
} from '@/app/services/search/globalSearchHighlightPattern';

describe('globalSearchHighlightPattern', () => {
    it('returns null for empty query', () => {
        expect(buildSafeHighlightPattern('')).toBeNull();
        expect(buildSafeHighlightPattern('   ')).toBeNull();
    });

    it('escapes regex metacharacters', () => {
        const pattern = buildSafeHighlightPattern('hello.world');
        expect(pattern).not.toBeNull();
        expect(pattern!.source).toContain('\\.');
    });

    it('clamps query length before tokenization', () => {
        const long = 'ا'.repeat(HIGHLIGHT_QUERY_MAX_LENGTH + 20);
        const tokens = tokenizeHighlightQuery(long);
        expect(tokens.join('').length).toBeLessThanOrEqual(HIGHLIGHT_QUERY_MAX_LENGTH);
        const pattern = buildSafeHighlightPattern(long);
        expect(pattern).not.toBeNull();
        /* التوسيع العربي يزيد طول المصدر بعد الـ clamp — لا يُقارن بالطول الخام */
        expect(pattern!.source.length).toBeGreaterThan(0);
    });

    it('does not throw on adversarial input', () => {
        const samples = ['(?=a)', '[a-z]', '{{{{', '\\', '.*.*.*'];
        for (const sample of samples) {
            expect(() => buildSafeHighlightPattern(sample)).not.toThrow();
        }
    });
});
