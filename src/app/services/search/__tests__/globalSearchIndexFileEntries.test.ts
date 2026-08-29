import { describe, expect, it } from 'vitest';
import { fileToEntry } from '@/app/services/search/globalSearchIndexFileEntries';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

describe('fileToEntry — معاملات الملف', () => {
    it('يبقى تصنيفاً transaction ويفتح الإضبارة مع عنوان فرعي يوضح الوجهة', () => {
        const file = {
            id: 3,
            type: 'transaction',
            status: 'active',
            caseNo: 'مع-1',
            court: 'بغداد',
            parties: [{ id: 1, name: 'سامي', role: 'موكل', isClient: true }],
            history: [],
            notes: [],
            images: [],
            date: '',
            tasks: [],
        } as FileData;

        const main = fileToEntry(file).find((e) => e.id === 'file-3');
        expect(fileToEntry(file)).toHaveLength(1);
        expect(main?.category).toBe('transaction');
        expect(main?.subtitle).toBe('إضبارة · مع-1');
        expect(main?.navigate).toEqual({ type: 'file', fileId: 3 });
    });

    it('وثيقة Fuse واحدة لكل ملف مع بقاء نص الطرف والملاحظة في haystack', () => {
        const file = {
            id: 9,
            type: 'lawsuit',
            status: 'active',
            caseNo: 'ق-9',
            court: 'الكرخ',
            parties: [
                { id: 1, name: 'ليلى الموكلة', role: 'مدعي', isClient: true },
                { id: 2, name: 'حسام الخصم', role: 'مدعى عليه', isClient: false },
            ],
            history: [],
            notes: [{ id: 1, text: 'موعد مع الخبير غدا', meta: '', stageCtx: '', date: '' }],
            images: [],
            date: '',
            tasks: [{ id: 1, title: 'تصوير القرار', details: '' }],
        } as FileData;

        const entries = fileToEntry(file);
        expect(entries).toHaveLength(1);
        expect(entries[0]?._searchStr).toMatch(/ليلى|ليلي/);
        expect(entries[0]?._searchStr).toMatch(/حسام/);
        expect(entries[0]?._searchStr).toMatch(/الخبير/);
        expect(entries[0]?._searchStr).toMatch(/تصوير/);
    });
});
