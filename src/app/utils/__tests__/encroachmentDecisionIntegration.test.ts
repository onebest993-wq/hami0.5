import { describe, expect, it } from 'vitest';
import { inferDecisionAppealRequestOrigin } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    evictionProcedureRowsMatch,
    getGoverningEncroachmentProcedureRowForMatch,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowWorkflowComplete,
} from '@/app/utils/executorSeizureDecisionQueue';
import { ENCROACHMENT_SURVEYOR_REQUEST_TITLE } from '@/app/utils/encroachmentRemovalRequests';

describe('encroachment decision integration', () => {
    it('matches encroachment rows by encroachmentWorkflowKey', () => {
        const row = {
            id: 'enc_req_1',
            requestKind: 'eviction_procedure',
            encroachmentWorkflowKey: 'surveyor_appointment',
            title: ENCROACHMENT_SURVEYOR_REQUEST_TITLE,
        };
        expect(
            evictionProcedureRowsMatch(row, { encroachmentWorkflowKey: 'surveyor_appointment' })
        ).toBe(true);
        expect(
            evictionProcedureRowsMatch(row, { encroachmentWorkflowKey: 'machinery_entry_permit' })
        ).toBe(false);
    });

    it('treats approved encroachment workflow incomplete until details are saved', () => {
        const approved = {
            id: 'enc_req_2',
            requestKind: 'eviction_procedure',
            encroachmentWorkflowKey: 'surveyor_appointment',
            executorOutcome: 'approved',
            appealRequestOrigin: 'creditor_side',
        };
        expect(isEvictionProcedureRowWorkflowComplete(approved)).toBe(false);
        expect(isEvictionProcedureRowActive(approved, [approved])).toBe(true);

        const saved = {
            ...approved,
            encroachmentRequestSavedAt: new Date().toISOString(),
        };
        expect(isEvictionProcedureRowWorkflowComplete(saved)).toBe(true);
        expect(isEvictionProcedureRowActive(saved, [saved])).toBe(false);
    });

    it('returns governing hub row for encroachment branch', () => {
        const older = {
            id: 'enc_req_old',
            requestKind: 'eviction_procedure',
            encroachmentWorkflowKey: 'machinery_entry_permit',
            executorOutcome: 'rejected',
            appealStatus: 'final',
            appealResult: 'تصديق القرار',
            date: '2026-01-01',
            requestCycleSuperseded: true,
            isArchived: true,
        };
        const newer = {
            id: 'enc_req_new',
            requestKind: 'eviction_procedure',
            encroachmentWorkflowKey: 'machinery_entry_permit',
            executorOutcome: 'pending',
            date: '2026-06-01',
        };
        const governing = getGoverningEncroachmentProcedureRowForMatch(
            [older, newer],
            'machinery_entry_permit'
        );
        expect(governing?.id).toBe('enc_req_new');
    });

    it('infers creditor origin for enc_req ids without explicit origin', () => {
        expect(
            inferDecisionAppealRequestOrigin({
                id: 'enc_req_abc',
                requestKind: 'eviction_procedure',
                title: ENCROACHMENT_SURVEYOR_REQUEST_TITLE,
            } as any)
        ).toBe('creditor_side');
    });
});
