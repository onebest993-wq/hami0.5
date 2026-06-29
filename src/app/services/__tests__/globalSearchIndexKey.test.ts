import { describe, expect, it } from 'vitest';
import { computeGlobalSearchIndexKey } from '@/app/services/globalSearchIndexPrepare';
import type { BuildGlobalSearchIndexInput } from '@/app/services/globalSearchIndex';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

function baseInput(overrides: Partial<BuildGlobalSearchIndexInput> = {}): BuildGlobalSearchIndexInput {
    return {
        files: [],
        executionFiles: [],
        globalNotes: [],
        cases: [],
        criminalCases: [],
        userId: 'lawyer-1',
        ...overrides,
    };
}

describe('computeGlobalSearchIndexKey — وعي بالمحتوى', () => {
    it('يتغيّر المفتاح عند تعديل اسم طرف رغم ثبات العدد والمعرّفات', () => {
        const fileA = {
            id: 1,
            type: 'lawsuit',
            status: 'active',
            caseNo: '1/2026',
            parties: [{ id: 'p1', name: 'أحمد', role: 'موكل', isClient: true }],
        } as unknown as FileData;
        const fileB = {
            ...fileA,
            parties: [{ id: 'p1', name: 'خالد', role: 'موكل', isClient: true }],
        } as unknown as FileData;

        const keyA = computeGlobalSearchIndexKey(baseInput({ files: [fileA] }));
        const keyB = computeGlobalSearchIndexKey(baseInput({ files: [fileB] }));
        expect(keyA).not.toEqual(keyB);
    });

    it('يتغيّر المفتاح عند تعديل عنوان ملاحظة عامة', () => {
        const keyA = computeGlobalSearchIndexKey(
            baseInput({ globalNotes: [{ id: 'g1', title: 'قديم', body: 'x' }] }),
        );
        const keyB = computeGlobalSearchIndexKey(
            baseInput({ globalNotes: [{ id: 'g1', title: 'جديد', body: 'x' }] }),
        );
        expect(keyA).not.toEqual(keyB);
    });

    it('يبقى المفتاح ثابتاً عند تطابق المحتوى تماماً (cache hit صحيح)', () => {
        const file = {
            id: 2,
            type: 'lawsuit',
            status: 'active',
            caseNo: '2/2026',
            parties: [{ id: 'p1', name: 'سارة', role: 'موكل', isClient: true }],
        } as unknown as FileData;
        const keyA = computeGlobalSearchIndexKey(baseInput({ files: [file] }));
        const keyB = computeGlobalSearchIndexKey(baseInput({ files: [{ ...file } as unknown as FileData] }));
        expect(keyA).toEqual(keyB);
    });
});
