import { describe, expect, it } from 'vitest';
import { matchesFilter, formatFileSize, inferTags, inferDocType } from './useSmartVault';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';

const baseDoc = (overrides: Partial<SmartVaultDoc> = {}): SmartVaultDoc => ({
    id: '1',
    title: 'test',
    type: 'pdf',
    tags: [],
    authorId: 'u1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileSize: 1024,
    fileName: 'test.pdf',
    mimeType: 'application/pdf',
    storagePath: 'path',
    signedUrl: null,
    isProcessing: false,
    boundDossierId: null,
    ...overrides,
});

describe('matchesFilter', () => {
    it('returns all docs for الكل', () => {
        expect(matchesFilter(baseDoc({ customCategory: 'موكل' }), 'الكل')).toBe(true);
    });

    it('filters by custom category', () => {
        expect(matchesFilter(baseDoc({ customCategory: 'موكل أحمد' }), 'موكل أحمد')).toBe(true);
        expect(matchesFilter(baseDoc({ customCategory: 'موكل أحمد' }), 'جلسات')).toBe(false);
    });

    it('ignores legacy auto tags without customCategory', () => {
        expect(matchesFilter(baseDoc({ tags: ['عقود'] }), 'عقود')).toBe(false);
    });
});

describe('formatFileSize', () => {
    it('formats kilobytes', () => {
        expect(formatFileSize(2048)).toContain('KB');
    });
});

describe('inferTags', () => {
    it('detects contract titles', () => {
        expect(inferTags('عقد إيجار شقة')).toContain('عقود');
    });
});

describe('inferDocType', () => {
    it('detects images from extension when mime is empty', () => {
        expect(inferDocType('', 'photo.jpg')).toBe('image');
    });
});
