import { describe, expect, it } from 'vitest';
import {
    isExecutorDecisionRowEffectivelyEnforced,
    isExecutorRowApprovedWorkflowActive,
    resolveExecutorRequestAppealSyncFromRow,
} from '@/app/utils/executorRequestAppealSync';

describe('executorRequestAppealSync', () => {
    it('blocks fieldwork for any approved request when debtor grievance is accepted (paused)', () => {
        const row = {
            id: 'seizure_third_1',
            requestKind: 'seizure',
            seizureSubtype: 'third_party',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        };
        const sync = resolveExecutorRequestAppealSyncFromRow(row, [row]);
        expect(sync.gate.kind).toBe('paused');
        expect(sync.blocksFieldwork).toBe(true);
        expect(sync.enforced).toBe(false);
        expect(isExecutorRowApprovedWorkflowActive(row, [row])).toBe(false);
    });

    it('blocks executor-order travel ban when grievance pauses enforcement', () => {
        const row = {
            id: 'travel_1',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'travel_ban',
            appealRequestOrigin: 'executor_side',
            activatedByExecutorOrder: true,
            executorOutcome: 'approved',
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        };
        const sync = resolveExecutorRequestAppealSyncFromRow(row, [row]);
        expect(sync.gate.kind).toBe('paused');
        expect(sync.blocksFieldwork).toBe(true);
        expect(isExecutorRowApprovedWorkflowActive(row, [row])).toBe(false);
    });

    it('blocks forced bring-in when grievance accepted on executor-order row', () => {
        const row = {
            id: 'forced_bring_1',
            title: 'طلب إحضار جبري',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'forced_bring_in',
            appealRequestOrigin: 'executor_side',
            activatedByExecutorOrder: true,
            executorOutcome: 'approved',
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        };
        const sync = resolveExecutorRequestAppealSyncFromRow(row, [row]);
        expect(sync.gate.kind).toBe('paused');
        expect(sync.blocksFieldwork).toBe(true);
        expect(sync.enforced).toBe(false);
        expect(isExecutorRowApprovedWorkflowActive(row, [row])).toBe(false);
    });

    it('revokes enforcement when grievance acceptance is final', () => {
        const row = {
            id: 'guarantor_1',
            title: 'طلب الكفيل',
            requestKind: 'seizure',
            seizureSubtype: 'guarantor',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            appealResult: 'قبول التظلم',
            appealStatus: 'final',
        };
        const sync = resolveExecutorRequestAppealSyncFromRow(row, [row]);
        expect(sync.gate.kind).toBe('revoked');
        expect(sync.cycleSuperseded).toBe(true);
        expect(sync.blocksFieldwork).toBe(false);
        expect(sync.enforced).toBe(false);
        expect(isExecutorRowApprovedWorkflowActive(row, [row])).toBe(false);
    });

    it('resets lifecycle after cassation naqd (lifecycle_reset)', () => {
        const row = {
            id: 'eviction_1',
            title: 'طلب إخلاء',
            requestKind: 'eviction_procedure',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            appealResult: 'نقض القرار',
            appealStatus: 'final',
            appealWorkflowState: 'REVOKED_BY_APPEAL',
        };
        const sync = resolveExecutorRequestAppealSyncFromRow(row, [row]);
        expect(sync.gate.kind).toBe('lifecycle_reset');
        expect(sync.cycleSuperseded).toBe(true);
        expect(isExecutorRowApprovedWorkflowActive(row, [row])).toBe(false);
    });

    it('keeps workflow active when no appeal blocks enforcement', () => {
        const row = {
            id: 'seizure_movable_1',
            title: 'طلب حجز منقولات',
            requestKind: 'seizure',
            seizureSubtype: 'movable',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
        };
        const sync = resolveExecutorRequestAppealSyncFromRow(row, [row]);
        expect(sync.gate.kind).toBe('continue');
        expect(sync.blocksFieldwork).toBe(false);
        expect(sync.enforced).toBe(true);
        expect(isExecutorDecisionRowEffectivelyEnforced(row, [row])).toBe(true);
        expect(isExecutorRowApprovedWorkflowActive(row, [row])).toBe(true);
    });

    it('scenario 1 — creditor naqd lifts blocksFieldwork after grievance pause', () => {
        const hub = {
            id: 'forced_bring_2',
            title: 'طلب إحضار جبري',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'forced_bring_in',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
        };
        const paused = {
            id: 'appeal_pause_fb',
            appealSourceDecisionId: 'forced_bring_2',
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        };
        const pausedSync = resolveExecutorRequestAppealSyncFromRow(hub, [hub, paused]);
        expect(pausedSync.blocksFieldwork).toBe(true);

        const naqd = {
            id: 'appeal_naqd_fb',
            appealSourceDecisionId: 'forced_bring_2',
            appealActor: 'lawyer',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'نقض القرار',
            executorOutcome: 'approved',
        };
        const naqdSync = resolveExecutorRequestAppealSyncFromRow(hub, [hub, naqd]);
        expect(naqdSync.gate.kind).toBe('continue');
        expect(naqdSync.blocksFieldwork).toBe(false);
        expect(naqdSync.enforced).toBe(true);
        expect(isExecutorRowApprovedWorkflowActive(hub, [hub, naqd])).toBe(true);
    });

    it('scenario 3 — debtor naqd terminates workflow on any request kind', () => {
        const row = {
            id: 'seizure_1',
            requestKind: 'seizure',
            seizureSubtype: 'movable',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            appealActor: 'debtor',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'نقض القرار',
        };
        const sync = resolveExecutorRequestAppealSyncFromRow(row, [row]);
        expect(sync.gate.kind).toBe('lifecycle_reset');
        expect(sync.cycleSuperseded).toBe(true);
        expect(isExecutorRowApprovedWorkflowActive(row, [row])).toBe(false);
    });

    it('rejected grievance does not block fieldwork', () => {
        const row = {
            id: 'travel_2',
            title: 'طلب منع سفر',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'travel_ban',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            appealActor: 'debtor',
            appealResult: 'رد التظلم',
            appealStatus: 'final',
        };
        const sync = resolveExecutorRequestAppealSyncFromRow(row, [row]);
        expect(sync.gate.kind).toBe('continue');
        expect(sync.blocksFieldwork).toBe(false);
        expect(sync.enforced).toBe(true);
        expect(isExecutorRowApprovedWorkflowActive(row, [row])).toBe(true);
    });

    it('treats dossier control request with paused grievance as blocked', () => {
        const row = {
            id: 'dossier_unify_1',
            title: 'طلب توحيد الأضابير',
            requestKind: 'special_followup',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        };
        const sync = resolveExecutorRequestAppealSyncFromRow(row, [row]);
        expect(sync.gate.kind).toBe('paused');
        expect(sync.followupBlock).not.toBeNull();
        expect(isExecutorRowApprovedWorkflowActive(row, [row])).toBe(false);
    });

    it('blocks forced bring-in via hub when appeal copy awaits creditor cassation', () => {
        const hub = {
            id: 'forced_bring_copy_hub',
            title: 'طلب إحضار جبري للمدين',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'forced_bring_in',
            appealRequestOrigin: 'executor_side',
            activatedByExecutorOrder: true,
            executorOutcome: 'approved',
            activeAppealCopyId: 'appeal_copy_1782416266873_1u7zxvu',
        };
        const copy = {
            id: 'appeal_copy_1782416266873_1u7zxvu',
            appealSourceDecisionId: 'forced_bring_copy_hub',
            title: 'طلب إحضار جبري للمدين',
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        };
        const all = [hub, copy];
        const sync = resolveExecutorRequestAppealSyncFromRow(hub, all);
        expect(sync.gate.kind).toBe('paused');
        expect(sync.enforced).toBe(false);
        expect(sync.blocksFieldwork).toBe(true);
        expect(isExecutorRowApprovedWorkflowActive(hub, all)).toBe(false);
    });

    it('restores enforcement on hub when appeal copy grievance is finally rejected', () => {
        const hub = {
            id: 'forced_bring_final_hub',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'forced_bring_in',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            activeAppealCopyId: 'appeal_copy_final',
        };
        const copy = {
            id: 'appeal_copy_final',
            appealSourceDecisionId: 'forced_bring_final_hub',
            appealActor: 'debtor',
            appealResult: 'رد التظلم',
            appealStatus: 'final',
        };
        const all = [hub, copy];
        const sync = resolveExecutorRequestAppealSyncFromRow(hub, all);
        expect(sync.gate.kind).toBe('continue');
        expect(sync.enforced).toBe(true);
        expect(isExecutorRowApprovedWorkflowActive(hub, all)).toBe(true);
    });
});
