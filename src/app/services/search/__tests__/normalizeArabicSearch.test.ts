import { describe, expect, it } from 'vitest';
import {
    archiveTextMatchesQuery,
    normalizeArabicSearch,
} from '@/app/services/search/normalizeArabicSearch';

describe('normalizeArabicSearch unit suite', () => {
    it('is stable for empty input', () => {
        expect(normalizeArabicSearch('')).toBe('');
        expect(normalizeArabicSearch(null as unknown as string)).toBe('');
    });

    it('is idempotent after first pass for common Arabic', () => {
        const once = normalizeArabicSearch('إِبْرَاهِيمٌ');
        expect(normalizeArabicSearch(once)).toBe(once);
    });

    it('archiveTextMatchesQuery is false for non-matching needle', () => {
        expect(archiveTextMatchesQuery('محكمة البداءة', 'تمييز')).toBe(false);
    });
});
