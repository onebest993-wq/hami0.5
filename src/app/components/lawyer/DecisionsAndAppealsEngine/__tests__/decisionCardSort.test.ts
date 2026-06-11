import { describe, expect, it } from 'vitest';
import type { Decision } from '../types';
import {
    compareDecisionsNewestFirst,
    resolveCreditorDecisionEnforcementState,
    resolveHarmedPartyAppealActor,
    resolveRequestFilerFromDebtorAgentView,
    sortDecisionsNewestFirst,
    resolveAppealWorkflowPhaseLabel,
} from '../utils';

function base(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'd1',
        title: 'طلب',
        body: '',
        date: '2026-06-01',
        appealStatus: 'pending',
        executorOutcome: 'approved',
        appealRequestOrigin: 'creditor_side',
        ...overrides,
    };
}

describe('decisionCardSort', () => {
    it('sorts newest resolvedAt first', () => {
        const list = [
            base({ id: 'old', resolvedAt: '2026-06-01T08:00:00.000Z' }),
            base({ id: 'new', resolvedAt: '2026-06-04T12:00:00.000Z' }),
            base({ id: 'mid', resolvedAt: '2026-06-02T10:00:00.000Z' }),
        ];
        expect(sortDecisionsNewestFirst(list).map((d) => d.id)).toEqual(['new', 'mid', 'old']);
    });

    it('uses appeal timeline when dates match', () => {
        const a = base({
            id: 'a',
            date: '2026-06-05',
            appealTimelineLogs: [
                { id: '1', at: '2026-06-05T09:00:00.000Z', message: 'قديم', tone: 'slate' },
            ],
        });
        const b = base({
            id: 'b',
            date: '2026-06-05',
            appealTimelineLogs: [
                { id: '2', at: '2026-06-05T18:00:00.000Z', message: 'أحدث', tone: 'slate' },
            ],
        });
        expect(compareDecisionsNewestFirst(a, b)).toBeGreaterThan(0);
    });
});

describe('resolveAppealWorkflowPhaseLabel', () => {
    it('labels awaiting creditor cassation for debtor agent', () => {
        const row = base({
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        });
        expect(resolveAppealWorkflowPhaseLabel(row, 'debtor_agent')).toBe('بانتظار تمييز الدائن');
    });
});

describe('resolveCreditorDecisionEnforcementState', () => {
    it('marks paused grievance as paused not enforced', () => {
        const hub = base({
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        });
        const state = resolveCreditorDecisionEnforcementState(hub, hub, {
            hubTab: 'previous',
            appealLegallyFinal: false,
            needsExecutor: false,
        });
        expect(state.visual).toBe('paused');
        expect(state.enforced).toBe(false);
    });

    it('marks debtor cassation naqd as lifecycle reset not نافذ', () => {
        const hub = base({ executorOutcome: 'approved' });
        const pipe = base({
            appealActor: 'debtor',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'نقض القرار',
            executorOutcome: 'rejected',
            appealWorkflowState: 'REVOKED_BY_APPEAL',
        });
        const state = resolveCreditorDecisionEnforcementState(hub, pipe, {
            hubTab: 'previous',
            appealLegallyFinal: true,
            needsExecutor: false,
        });
        expect(state.visual).toBe('lifecycle_reset');
        expect(state.pillLabel).toBe('أُعيدت الدورة');
        expect(state.enforced).toBe(false);
    });

    it('marks debtor rad laheeza as enforced نافذ', () => {
        const hub = base({ executorOutcome: 'approved' });
        const pipe = base({
            appealActor: 'debtor',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'رد اللائحة',
            executorOutcome: 'approved',
        });
        const state = resolveCreditorDecisionEnforcementState(hub, pipe, {
            hubTab: 'previous',
            appealLegallyFinal: true,
            needsExecutor: false,
        });
        expect(state.visual).toBe('enforced');
        expect(state.pillLabel).toBe('القرار نافذ');
        expect(state.enforced).toBe(true);
    });

    it('shows debtor-agent harm label with neutral card when creditor request approved', () => {
        const hub = base({
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
        });
        const state = resolveCreditorDecisionEnforcementState(hub, hub, {
            hubTab: 'previous',
            appealLegallyFinal: false,
            needsExecutor: false,
            appealPerspective: 'debtor_agent',
        });
        expect(state.visual).toBe('neutral');
        expect(state.pillLabel).toBe('ضد موكّلنا — قبول المنفذ');
        expect(state.pillTone).toBe('red');
        expect(state.enforced).toBe(true);
    });

    it('shows debtor-agent favorable label when creditor request rejected', () => {
        const hub = base({
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'rejected',
        });
        const state = resolveCreditorDecisionEnforcementState(hub, hub, {
            hubTab: 'previous',
            appealLegallyFinal: false,
            needsExecutor: false,
            appealPerspective: 'debtor_agent',
        });
        expect(state.visual).toBe('neutral');
        expect(state.pillLabel).toBe('لصالح موكّلنا — رفض المنفذ');
        expect(state.pillTone).toBe('emerald');
    });

    it('treats creditor mirror rows as creditor-filed despite debtor_side tag', () => {
        const hub = base({
            appealRequestOrigin: 'debtor_side',
            requestKind: 'special_followup',
            executorOutcome: 'approved',
            body: 'تقدّم وكيل الدائن بـ«متابعة» — متابعة من جانب موكّل المدين.',
            payloadJson: JSON.stringify({ source: 'debtor_agent_creditor_mirror' }),
        });
        expect(resolveRequestFilerFromDebtorAgentView(hub)).toBe('creditor');
        const state = resolveCreditorDecisionEnforcementState(hub, hub, {
            hubTab: 'appeals',
            appealLegallyFinal: false,
            needsExecutor: false,
            appealPerspective: 'debtor_agent',
            allDecisions: [hub],
        });
        expect(state.pillLabel).toBe('ضد موكّلنا — قبول المنفذ');
        expect(state.pillTone).toBe('red');
    });

    it('shows appeal workflow pill on appeal copy for debtor grievance', () => {
        const original = base({
            id: 'orig_1',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            activeAppealCopyId: 'appeal_copy_1',
        });
        const copy = base({
            id: 'appeal_copy_1',
            appealSourceDecisionId: 'orig_1',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            appealActor: 'debtor',
            appealMethod: 'tadhallum',
            appealStatus: 'tadhallum_filed',
            appealPhase: 'grievance',
            appealWorkflowState: 'PENDING_APPEAL_DEBTOR',
        });
        const state = resolveCreditorDecisionEnforcementState(copy, copy, {
            hubTab: 'appeals',
            appealLegallyFinal: false,
            needsExecutor: false,
            appealPerspective: 'debtor_agent',
            allDecisions: [original, copy],
        });
        expect(state.pillLabel).toBe('طعن موكّلنا — تظلم');
        expect(state.pillTone).toBe('amber');
    });

    it('assigns debtor as harmed appeal actor on creditor mirror when executor approved', () => {
        const hub = base({
            appealRequestOrigin: 'debtor_side',
            requestKind: 'special_followup',
            executorOutcome: 'approved',
            body: 'تقدّم وكيل الدائن بـ«متابعة» — متابعة من جانب موكّل المدين.',
            payloadJson: JSON.stringify({ source: 'debtor_agent_creditor_mirror' }),
        });
        expect(resolveHarmedPartyAppealActor(hub, 'debtor_agent')).toBe('debtor');
        expect(resolveHarmedPartyAppealActor(hub, 'creditor_agent')).toBe('lawyer');
    });

    it('pauses enforceability on creditor mirror when debtor files grievance', () => {
        const hub = base({
            appealRequestOrigin: 'debtor_side',
            requestKind: 'special_followup',
            executorOutcome: 'approved',
            body: 'تقدّم وكيل الدائن بـ«متابعة»',
            payloadJson: JSON.stringify({ source: 'debtor_agent_creditor_mirror' }),
        });
        const pipe = base({
            appealActor: 'debtor',
            appealMethod: 'tadhallum',
            appealStatus: 'tadhallum_filed',
            appealPhase: 'grievance',
            appealWorkflowState: 'PENDING_APPEAL_DEBTOR',
        });
        const state = resolveCreditorDecisionEnforcementState(hub, pipe, {
            hubTab: 'previous',
            appealLegallyFinal: false,
            needsExecutor: false,
            appealPerspective: 'debtor_agent',
            allDecisions: [hub, pipe],
        });
        expect(state.enforced).toBe(false);
        expect(state.pillLabel).toBe('طعن موكّلنا — تظلم');
    });
});
