import { describe, expect, it } from 'vitest';
import {
    buildExecutorSideAppealCommitPatch,
    isSettledExecutorQueueRequest,
    resolveHarmedPartyAppealActor,
    EXECUTOR_QUEUE_REQUEST_KINDS,
} from '../utils';
import type { Decision } from '../types';

function base(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'd1',
        title: 'طلب',
        body: '',
        date: '2026-06-01',
        appealStatus: 'pending',
        ...overrides,
    };
}

describe('appeal entry paths — من له حق الطعن', () => {
    it('طلب دائن مُقبول → المدين هو الطاعن', () => {
        const row = base({
            requestKind: 'personal_coercive',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
        });
        expect(isSettledExecutorQueueRequest(row)).toBe(true);
        expect(resolveHarmedPartyAppealActor(row, 'creditor_agent')).toBe('debtor');
    });

    it('طلب دائن مرفوض → الدائن هو الطاعن', () => {
        const row = base({
            requestKind: 'personal_coercive',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'rejected',
        });
        expect(resolveHarmedPartyAppealActor(row, 'creditor_agent')).toBe('lawyer');
    });

    it('قرار منفذ مباشر — لا يُستنتج طاعن تلقائياً', () => {
        const row = base({ appealRequestOrigin: 'executor_side', executorOutcome: 'approved' });
        expect(resolveHarmedPartyAppealActor(row, 'creditor_agent')).toBeNull();
    });

    it('تنفيذ جبري بقرار المنفذ — المدين هو الطاعن', () => {
        const row = base({
            requestKind: 'personal_coercive',
            appealRequestOrigin: 'executor_side',
            executorOutcome: 'approved',
            activatedByExecutorOrder: true,
        });
        expect(isSettledExecutorQueueRequest(row)).toBe(true);
        expect(resolveHarmedPartyAppealActor(row, 'creditor_agent')).toBe('debtor');
    });

    it('executor_side patch لا يُستخدم لطلبات queue', () => {
        expect(EXECUTOR_QUEUE_REQUEST_KINDS).toContain('personal_coercive');
        const patch = buildExecutorSideAppealCommitPatch('grievance', ['lawyer']);
        expect(patch.executorOutcome).toBe('rejected');
        expect(patch.appealBaseBranch).toBe('after_rejection');
        expect(patch.appealActor).toBe('lawyer');
    });
});
