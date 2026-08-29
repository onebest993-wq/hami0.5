import { describe, expect, it } from 'vitest';
import type { FileData } from '../lawsuitFileTypes';
import {
    assertLawsuitFileMutable,
    isLawsuitFileMutationBlocked,
    rejectLawsuitFileMutation,
} from '../lawsuitFileMutationGuard';
import { isLawsuitArchived } from '@/app/utils/lawsuitTrash';
import { emptyLawsuitFileSegments, persistLawsuitActiveRecord } from '../lawsuitFilesRepository';

describe('lawsuitFileMutationGuard', () => {
    it('blocks archived and deleted files', () => {
        expect(isLawsuitArchived({ status: 'archived' })).toBe(true);
        expect(isLawsuitFileMutationBlocked({ status: 'archived' })).toBe(true);
        expect(isLawsuitFileMutationBlocked({ status: 'deleted' })).toBe(true);
        expect(isLawsuitFileMutationBlocked({ status: 'active' })).toBe(false);
    });

    it('returns Arabic rejection messages', () => {
        expect(rejectLawsuitFileMutation({ status: 'archived' })).toContain('مؤرشفة');
        expect(rejectLawsuitFileMutation({ status: 'deleted' })).toContain('المحذوفات');
        expect(rejectLawsuitFileMutation({ status: 'active' })).toBeNull();
    });

    it('persistLawsuitActiveRecord يرفض كتابة إضبارة مؤرشفة/محذوفة في active', () => {
        const segments = emptyLawsuitFileSegments();
        const archived = { id: 'a1', status: 'archived' } as FileData;
        expect(() => persistLawsuitActiveRecord(archived, segments)).toThrow(/مؤرشفة/);
        expect(() =>
            persistLawsuitActiveRecord({ id: 'd1', status: 'deleted' } as FileData, segments),
        ).toThrow(/المحذوفات/);
        expect(() =>
            persistLawsuitActiveRecord({ id: 'ok', status: 'active' } as FileData, segments),
        ).not.toThrow();
        expect(assertLawsuitFileMutable({ status: 'active' }).status).toBe('active');
    });
});
