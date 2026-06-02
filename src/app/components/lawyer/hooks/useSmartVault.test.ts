import { describe, expect, it } from 'vitest';
import { matchesFilter, formatFileSize, inferTags } from './useSmartVault';
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
        expect(matchesFilter(baseDoc({ tags: ['عقود'] }), 'الكل')).toBe(true);
    });

    it('filters contracts', () => {
        expect(matchesFilter(baseDoc({ tags: ['عقد إيجار'] }), 'عقود')).toBe(true);
        expect(matchesFilter(baseDoc({ tags: ['أخرى'] }), 'عقود')).toBe(false);
    });

    it('filters empty tags as أخرى', () => {
        expect(matchesFilter(baseDoc({ tags: [] }), 'أخرى')).toBe(true);
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
