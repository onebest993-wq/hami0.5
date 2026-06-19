import { describe, expect, it } from 'vitest';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import {
    applyLawsuitArchive,
    applyLawsuitPermanentDelete,
    applyLawsuitRestoreFromTrash,
    applyLawsuitTrash,
    stripStaleMockLawsuitFile,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';

const file = (id: number, status: FileData['status'] = 'active'): FileData => ({
    id,
    type: 'lawsuit',
    status,
    caseNo: `2026/ب/${id}`,
    court: 'بداءة الكرخ',
    parties: [],
    history: [],
    notes: [],
    images: [],
    date: '2026-01-01',
});

describe('lawsuitFilesRepository', () => {
    it('stripStaleMockLawsuitFile removes known mock', () => {
        const mock = [{ ...file(1), caseNo: '2025/ب/522' }];
        expect(stripStaleMockLawsuitFile(mock)).toEqual([]);
        expect(stripStaleMockLawsuitFile([file(2)])).toHaveLength(1);
    });

    it('applyLawsuitTrash marks deleted with timestamp', () => {
        const next = applyLawsuitTrash([file(1), file(2)], 1);
        expect(next[0].status).toBe('deleted');
        expect(next[0].deletedAt).toBeTypeOf('number');
        expect(next[1].status).toBe('active');
    });

    it('applyLawsuitRestoreFromTrash clears deletedAt', () => {
        const trashed = applyLawsuitTrash([file(1)], 1);
        const restored = applyLawsuitRestoreFromTrash(trashed, 1);
        expect(restored[0].status).toBe('active');
        expect(restored[0].deletedAt).toBeUndefined();
    });

    it('applyLawsuitArchive and permanent delete', () => {
        const archived = applyLawsuitArchive([file(1), file(2)], 1);
        expect(archived[0].status).toBe('archived');
        const remaining = applyLawsuitPermanentDelete(archived, [2]);
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe(1);
    });
});
