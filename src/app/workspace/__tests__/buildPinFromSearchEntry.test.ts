import { describe, expect, it } from 'vitest';
import { buildPinFromSearchEntry } from '../buildPinFromSearchEntry';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';

describe('buildPinFromSearchEntry', () => {
    it('يبني تثبيتاً من نتيجة دعوى', () => {
        const entry = {
            id: 'file-1',
            category: 'lawsuit' as const,
            title: 'دعوى',
            subtitle: '',
            lifecycle: 'active' as const,
            _searchStr: '',
            navigate: { type: 'file' as const, fileId: 'law-1' },
        } satisfies GlobalSearchEntry;

        const pin = buildPinFromSearchEntry(entry, {
            files: [
                {
                    id: 'law-1',
                    type: 'lawsuit',
                    caseNo: '2026/ولائي/456',
                    parties: [{ name: 'موكل', isClient: true }],
                },
            ],
            executionFiles: [],
            notes: [],
            tasks: [],
            urgentCases: [],
        });

        expect(pin?.type).toBe('lawsuit');
        expect(pin?.id).toBe('law-1');
        expect(pin?.caseNumber).toContain('2026');
    });

    it('يبني تثبيتاً لإضبارة تنفيذ', () => {
        const entry = {
            id: 'file-ex',
            category: 'execution' as const,
            title: 'تنفيذ',
            subtitle: '',
            lifecycle: 'active' as const,
            _searchStr: '',
            navigate: { type: 'file' as const, fileId: 'ex-1' },
        } satisfies GlobalSearchEntry;

        const pin = buildPinFromSearchEntry(entry, {
            files: [],
            executionFiles: [
                {
                    id: 'ex-1',
                    fileNumber: '7890',
                    year: 2026,
                    creditor: 'سارة علي',
                },
            ],
            notes: [],
            tasks: [],
            urgentCases: [],
        });

        expect(pin?.type).toBe('execution');
        expect(pin?.id).toBe('ex-1');
    });
});
