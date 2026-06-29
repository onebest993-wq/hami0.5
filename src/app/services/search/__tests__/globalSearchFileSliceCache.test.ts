import { describe, expect, it } from 'vitest';
import {
    fileSearchIndexSignature,
    getCachedFileSearchEntries,
    rememberFileSearchEntries,
    invalidateFileSearchSliceCache,
} from '@/app/services/search/globalSearchFileSliceCache';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';

describe('globalSearchFileSliceCache', () => {
    it('يعيد slice عند تطابق التوقيع', () => {
        invalidateFileSearchSliceCache();
        const file = { id: 1, type: 'lawsuit', status: 'active', caseNo: '1/2026' } as FileData;
        const entries = [
            {
                id: 'file-1',
                category: 'lawsuit',
                title: 'اختبار',
                subtitle: 's',
                lifecycle: 'active',
                _searchStr: 'x',
                navigate: { type: 'file', fileId: 1 },
            },
        ] satisfies GlobalSearchEntry[];

        expect(getCachedFileSearchEntries(file)).toBeNull();
        rememberFileSearchEntries(file, entries);
        expect(getCachedFileSearchEntries(file)).toEqual(entries);
        expect(fileSearchIndexSignature(file)).toContain('1');
    });

    it('يتغيّر التوقيع عند تعديل اسم الطرف (مصدر العنوان) دون تغيّر العدد', () => {
        const base = {
            id: 7,
            type: 'lawsuit',
            status: 'active',
            caseNo: '7/2026',
            parties: [{ id: 'p1', name: 'أحمد', role: 'موكل', isClient: true }],
        } as unknown as FileData;
        const renamed = {
            ...base,
            parties: [{ id: 'p1', name: 'محمد', role: 'موكل', isClient: true }],
        } as unknown as FileData;

        expect(fileSearchIndexSignature(base)).not.toEqual(fileSearchIndexSignature(renamed));
    });

    it('يتغيّر التوقيع عند تعديل نص ملاحظة دون تغيّر العدد', () => {
        const base = {
            id: 8,
            type: 'lawsuit',
            status: 'active',
            notes: [{ id: 'n1', text: 'قديم' }],
        } as unknown as FileData;
        const edited = {
            ...base,
            notes: [{ id: 'n1', text: 'جديد' }],
        } as unknown as FileData;

        expect(fileSearchIndexSignature(base)).not.toEqual(fileSearchIndexSignature(edited));
    });

    it('لا يعيد slice قديماً بعد تعديل المحتوى (تطابق التوقيع يفشل)', () => {
        invalidateFileSearchSliceCache();
        const file = {
            id: 9,
            type: 'lawsuit',
            status: 'active',
            parties: [{ id: 'p1', name: 'سارة', role: 'موكل', isClient: true }],
        } as unknown as FileData;
        const stale = [
            {
                id: 'file-9',
                category: 'lawsuit',
                title: 'سارة',
                subtitle: 's',
                lifecycle: 'active',
                _searchStr: 'x',
                navigate: { type: 'file', fileId: 9 },
            },
        ] satisfies GlobalSearchEntry[];

        rememberFileSearchEntries(file, stale);
        expect(getCachedFileSearchEntries(file)).toEqual(stale);

        const renamed = {
            ...file,
            parties: [{ id: 'p1', name: 'ليلى', role: 'موكل', isClient: true }],
        } as unknown as FileData;
        expect(getCachedFileSearchEntries(renamed)).toBeNull();
    });
});
