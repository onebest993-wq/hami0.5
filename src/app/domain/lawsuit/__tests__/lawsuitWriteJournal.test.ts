import { beforeEach, describe, expect, it } from 'vitest';
import type { FileData } from '../lawsuitFileTypes';
import {
    LAWSUIT_WRITE_JOURNAL_KEY,
    clearLawsuitWriteJournalForTests,
    hasUnverifiedLawsuitJournal,
    listLawsuitJournalEntries,
    mergeLawsuitJournalInto,
    pruneLawsuitJournalForFileIds,
    stageLawsuitJournalRecords,
} from '../lawsuitWriteJournal';

const file = (id: number): FileData =>
    ({
        id,
        type: 'lawsuit',
        status: 'active',
        caseNo: `j/${id}`,
        court: 'أحوال',
        parties: [],
        history: [],
        notes: [],
        images: [],
        date: '2026-01-01',
    }) as FileData;

describe('lawsuitWriteJournal', () => {
    beforeEach(() => {
        clearLawsuitWriteJournalForTests();
    });

    it('stages and merges journal entries in SecureStore and clears leftover localStorage', () => {
        localStorage.setItem(LAWSUIT_WRITE_JOURNAL_KEY, JSON.stringify([]));
        stageLawsuitJournalRecords([file(5)]);
        expect(hasUnverifiedLawsuitJournal()).toBe(true);
        expect(listLawsuitJournalEntries()).toHaveLength(1);
        expect(localStorage.getItem(LAWSUIT_WRITE_JOURNAL_KEY)).toBeNull();
        const merged = mergeLawsuitJournalInto([file(1)]);
        expect(merged.map((f) => Number(f.id)).sort((a, b) => a - b)).toEqual([1, 5]);
    });

    it('replaces same fileId and prunes after proof', () => {
        stageLawsuitJournalRecords([file(7)]);
        stageLawsuitJournalRecords([{ ...file(7), court: 'محدّث' } as FileData]);
        expect(listLawsuitJournalEntries()).toHaveLength(1);
        expect(listLawsuitJournalEntries()[0]?.file.court).toBe('محدّث');
        pruneLawsuitJournalForFileIds([7]);
        expect(hasUnverifiedLawsuitJournal()).toBe(false);
    });
});
