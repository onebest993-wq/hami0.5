import { describe, expect, it } from 'vitest';
import {
    clampGlobalSearchQuery,
    clampRecentSearchLabel,
    globalSearchRecentStorageKey,
    GLOBAL_SEARCH_MAX_QUERY_LENGTH,
    GLOBAL_SEARCH_MAX_RECENT_COUNT,
    GLOBAL_SEARCH_MAX_RECENT_LABEL_LENGTH,
    sanitizeRecentSearchLabels,
} from '@/app/services/search/globalSearchQuerySecurity';

describe('globalSearchQuerySecurity', () => {
    it('scopes recent storage key per user', () => {
        expect(globalSearchRecentStorageKey(null)).toBeNull();
        expect(globalSearchRecentStorageKey('  ')).toBeNull();
        expect(globalSearchRecentStorageKey('lawyer-1')).toBe('lawyer_recent_searches:lawyer-1');
    });

    it('clamps query length', () => {
        const long = 'ا'.repeat(GLOBAL_SEARCH_MAX_QUERY_LENGTH + 40);
        expect(clampGlobalSearchQuery(long)).toHaveLength(GLOBAL_SEARCH_MAX_QUERY_LENGTH);
    });

    it('strips control characters from query', () => {
        expect(clampGlobalSearchQuery('دعوى\u0000\u0007 سرية')).toBe('دعوى سرية');
    });

    it('strips bidi overrides and HTML tags from query', () => {
        expect(clampGlobalSearchQuery('دعوى\u202Esecret')).toBe('دعوىsecret');
        expect(clampGlobalSearchQuery('<b>دعوى</b>')).toBe('دعوى');
    });

    it('clamps recent label length', () => {
        const long = 'ب'.repeat(GLOBAL_SEARCH_MAX_RECENT_LABEL_LENGTH + 20);
        expect(clampRecentSearchLabel(long)).toHaveLength(GLOBAL_SEARCH_MAX_RECENT_LABEL_LENGTH);
    });

    it('sanitizes recent labels from storage', () => {
        const raw = [
            '  دعوى  ',
            '',
            42,
            'دعوى',
            'x'.repeat(200),
            ...Array.from({ length: 20 }, (_, i) => `item-${i}`),
        ];
        const out = sanitizeRecentSearchLabels(raw);
        expect(out.length).toBeLessThanOrEqual(GLOBAL_SEARCH_MAX_RECENT_COUNT);
        expect(out[0]).toBe('دعوى');
        expect(out.filter((s) => s === 'دعوى')).toHaveLength(1);
        expect(out.every((s) => s.length <= GLOBAL_SEARCH_MAX_RECENT_LABEL_LENGTH)).toBe(true);
    });
});
