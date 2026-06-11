import { describe, expect, it } from 'vitest';
import { resolveEvictionAppealSync } from '@/app/utils/evictionAppealSync';

function fieldVisitHub(overrides: Record<string, unknown> = {}) {
    return {
        id: 'eviction_req_field_1',
        title: 'طلب تحديد موعد الخروج الميداني',
        requestKind: 'eviction_procedure',
        evictionWorkflowKey: 'field_visit_or_grace',
        appealRequestOrigin: 'creditor_side',
        executorOutcome: 'approved',
        appealStatus: 'pending',
        appealResult: 'قبول التظلم',
        awaitingCassationEntryBy: 'lawyer',
        appealPhase: 'grievance',
        ...overrides,
    };
}

describe('resolveEvictionAppealSync', () => {
    it('pauses field visit fieldwork when grievance accepted awaiting cassation', () => {
        const hub = fieldVisitHub();
        const sync = resolveEvictionAppealSync({
            executionId: 'ex-ev-1',
            branch: 'Field Visit Date',
            allDecisions: [hub],
        });
        expect(sync.blocked).toBe(true);
        expect(sync.blocksFieldwork).toBe(true);
        expect(sync.blocksSubmit).toBe(true);
        expect(sync.followupBlock?.kind).toBe('paused');
    });

    it('revoked after final grievance without cassation', () => {
        const hub = fieldVisitHub({
            noAppealChosen: true,
            appealStatus: 'final',
            executorOutcome: 'rejected',
        });
        const sync = resolveEvictionAppealSync({
            executionId: 'ex-ev-2',
            branch: 'Field Visit Date',
            allDecisions: [hub],
        });
        expect(sync.cycleSuperseded).toBe(true);
        expect(sync.followupBlock).toBeNull();
        expect(sync.blocksFieldwork).toBe(false);
        expect(sync.blocksSubmit).toBe(false);
    });
});
