import { describe, expect, it } from 'vitest';
import type { Decision } from '../types';
import {
    buildGrievanceResolutionPatch,
    grievancePetitionGranted,
    petitionGrantedAfterCassation,
} from '../utils';
import { DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE } from '@/app/utils/otherPartyManualTrackDecisionSync';

function baseDecision(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'req_1',
        title: 'طلب إخلاء',
        body: '',
        date: '2026-06-01',
        appealStatus: 'tadhallum_filed',
        appealRequestOrigin: 'creditor_side',
        executorOutcome: 'rejected',
        appealBaseBranch: 'after_rejection',
        appealActor: 'lawyer',
        appealMethod: 'tadhallum',
        appealPhase: 'grievance',
        ...overrides,
    };
}

describe('grievanceResolution', () => {
    it('lawyer grievance after executor rejection: accept → approved + debtor cassation window', () => {
        const d = baseDecision();
        expect(grievancePetitionGranted(d, true)).toBe(true);
        const patch = buildGrievanceResolutionPatch(d, true);
        expect(patch.appealStatus).toBe('pending');
        expect(patch.executorOutcome).toBe('approved');
        expect(patch.appealResult).toBe('قبول التظلم');
        expect(patch.awaitingCassationEntryBy).toBe('debtor');
        expect(patch.grievanceAcceptedAwaitingDebtorTamyeez).toBe(true);
        expect(patch.appealWorkflowState).toBe('PENDING_APPEAL_DEBTOR');
    });

    it('lawyer grievance after executor rejection: reject → rejected pending cassation', () => {
        const d = baseDecision();
        expect(grievancePetitionGranted(d, false)).toBe(false);
        const patch = buildGrievanceResolutionPatch(d, false);
        expect(patch.appealStatus).toBe('pending');
        expect(patch.executorOutcome).toBe('rejected');
        expect(patch.appealResult).toBe('رد التظلم');
        expect(patch.grievanceRejectedAwaitingTamyeez).toBe(true);
        expect(patch.awaitingCassationEntryBy).toBe('lawyer');
    });

    it('debtor grievance after approval: accept → approval kept + creditor cassation window', () => {
        const d = baseDecision({
            executorOutcome: 'approved',
            appealBaseBranch: 'after_approval',
            appealActor: 'debtor',
            status: 'accepted',
        });
        const patch = buildGrievanceResolutionPatch(d, true);
        expect(patch.appealStatus).toBe('pending');
        expect(patch.executorOutcome).toBe('approved');
        expect(patch.appealResult).toBe('قبول التظلم');
        expect(patch.awaitingCassationEntryBy).toBe('lawyer');
    });

    it('debtor grievance after approval: reject grievance → debtor cassation window', () => {
        const d = baseDecision({
            executorOutcome: 'approved',
            appealBaseBranch: 'after_approval',
            appealActor: 'debtor',
            status: 'accepted',
        });
        const patch = buildGrievanceResolutionPatch(d, false);
        expect(patch.appealStatus).toBe('pending');
        expect(patch.executorOutcome).toBe('approved');
        expect(patch.appealWorkflowState).toBe('PENDING_APPEAL_DEBTOR');
        expect(patch.grievanceRejectedAwaitingTamyeez).toBe(true);
        expect(patch.awaitingCassationEntryBy).toBe('debtor');
    });

    it('creditor mirror row (debtor_side): debtor grievance accepted → lawyer cassation window', () => {
        const d = baseDecision({
            appealRequestOrigin: 'debtor_side',
            payloadJson: JSON.stringify({ source: DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE }),
            executorOutcome: 'approved',
            appealBaseBranch: 'after_approval',
            appealActor: 'debtor',
            status: 'accepted',
        });
        const patch = buildGrievanceResolutionPatch(d, true);
        expect(patch.awaitingCassationEntryBy).toBe('lawyer');
        expect(patch.appealResult).toBe('قبول التظلم');
    });

    it('creditor mirror row: treats as creditor request not debtor_side origin', () => {
        const d = baseDecision({
            appealRequestOrigin: 'debtor_side',
            payloadJson: JSON.stringify({ source: DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE }),
            executorOutcome: 'approved',
            appealBaseBranch: 'after_approval',
            appealActor: 'lawyer',
            appealMethod: 'tamyeez',
            appealStatus: 'tamyeez_filed',
            appealPhase: 'cassation',
        });
        expect(petitionGrantedAfterCassation(d, 'rad_laheeza')).toBe(false);
        expect(petitionGrantedAfterCassation(d, 'naqd')).toBe(true);
    });
});
