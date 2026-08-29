import { describe, expect, it } from 'vitest';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import {
    filterVaultDocs,
    formatFileSize,
    formatVaultDate,
    inferDocType,
    inferTags,
    vaultDocMatchesSearch,
} from '@/app/services/vault/vaultDocUtils';

const baseDoc = (overrides: Partial<SmartVaultDoc> = {}): SmartVaultDoc => ({
    id: 'd1',
    title: 'عقد إيجار',
    type: 'pdf',
    tags: ['عقود'],
    authorId: 'u1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileSize: 2048,
    fileName: 'contract.pdf',
    mimeType: 'application/pdf',
    storagePath: 'idb:vault:u1:d1',
    signedUrl: null,
    boundDossierId: null,
    ...overrides,
});

describe('vaultDocUtils', () => {
    it('infers doc type from mime or extension', () => {
        expect(inferDocType('image/jpeg', 'photo.jpg')).toBe('image');
        expect(inferDocType('application/pdf', 'file.pdf')).toBe('pdf');
        expect(inferDocType('image/svg+xml', 'logo.svg')).not.toBe('image');
        expect(inferDocType('image/png', 'scan.png')).toBe('image');
    });

    it('infers Arabic tags from title', () => {
        expect(inferTags('عقد إيجار شقة')).toContain('عقود');
        expect(inferTags('مذكرة بحث')).toContain('بحث قانوني');
    });

    it('formats file size', () => {
        expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('formats relative vault dates', () => {
        const today = new Date().toISOString();
        expect(formatVaultDate(today)).toBe('اليوم');
    });

    it('matches search across metadata fields', () => {
        expect(vaultDocMatchesSearch(baseDoc(), 'عقد')).toBe(true);
        expect(vaultDocMatchesSearch(baseDoc({ lawyerNote: 'ملاحظة سرية' }), 'سرية')).toBe(true);
        expect(vaultDocMatchesSearch(baseDoc(), 'xyz')).toBe(false);
    });

    it('folds Arabic alef and Indic digits in vault search', () => {
        expect(vaultDocMatchesSearch(baseDoc({ title: 'عقد أحمد' }), 'احمد')).toBe(true);
        expect(
            vaultDocMatchesSearch(baseDoc({ title: 'مستند', fileName: 'ملف-٢٠٢٤.pdf' }), '2024'),
        ).toBe(true);
    });

    it('filters by category and search', () => {
        const docs = [
            baseDoc(),
            baseDoc({ id: 'd2', title: 'طابو', customCategory: 'طابو', tags: ['طابو'] }),
        ];
        expect(filterVaultDocs(docs, 'الكل', '').length).toBe(2);
        expect(filterVaultDocs(docs, 'طابو', '').length).toBe(1);
        expect(filterVaultDocs(docs, 'الكل', 'عقد').length).toBe(1);
    });
});
