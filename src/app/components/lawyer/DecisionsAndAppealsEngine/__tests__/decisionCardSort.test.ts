import { describe, expect, it } from 'vitest';
import type { Decision } from '../types';
import {
    compareDecisionsNewestFirst,
    compareDecisionsAppealActivityNewestFirst,
    resolveCreditorDecisionEnforcementState,
    resolveHarmedPartyAppealActor,
    resolveRequestFilerFromDebtorAgentView,
    sortDecisionsNewestFirst,
    sortDecisionsAppealActivityNewestFirst,
    resolveAppealWorkflowPhaseLabel,
    resolveAppealHubProponentCategory,
    resolveAppealsHubFilterOptions,
    resolveManualExecutorLedgerEnforcementState,
    purgeManualExecutorAppealArtifacts,
    canArchiveExecutorDecisionCard,
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

    it('sorts appeal registry by latest appeal activity not original date only', () => {
        const olderDecisionDate = base({
            id: 'appeal_copy_1781257000000_x',
            date: '2026-06-01',
            appealSourceDecisionId: 'hub_old',
            appealTimelineLogs: [
                { id: '1', at: '2026-06-10T12:00:00.000Z', message: 'تمييز', tone: 'amber' },
            ],
        });
        const newerDecisionDate = base({
            id: 'appeal_copy_1781256000000_y',
            date: '2026-06-20',
            appealSourceDecisionId: 'hub_new',
            appealTimelineLogs: [
                { id: '2', at: '2026-06-05T08:00:00.000Z', message: 'تظلم', tone: 'amber' },
            ],
        });
        expect(
            sortDecisionsAppealActivityNewestFirst([newerDecisionDate, olderDecisionDate]).map(
                (d) => d.id
            )
        ).toEqual(['appeal_copy_1781257000000_x', 'appeal_copy_1781256000000_y']);
        expect(compareDecisionsAppealActivityNewestFirst(olderDecisionDate, newerDecisionDate)).toBeLessThan(
            0
        );
    });
});

describe('appeals hub proponent filters', () => {
    it('hides filters when only one proponent category exists', () => {
        const cards = [
            base({ id: 'a1', appealSourceDecisionId: 'h1' }),
            base({ id: 'a2', appealSourceDecisionId: 'h2' }),
        ];
        const all = [
            base({ id: 'h1', appealRequestOrigin: 'creditor_side', requestKind: 'seizure' }),
            base({ id: 'h2', appealRequestOrigin: 'creditor_side', requestKind: 'eviction_procedure' }),
        ];
        expect(resolveAppealsHubFilterOptions(cards, all)).toEqual([]);
    });

    it('shows creditor and debtor filters without executor when no manual cards', () => {
        const cards = [
            base({ id: 'a1', appealSourceDecisionId: 'h1' }),
            base({ id: 'a2', appealSourceDecisionId: 'h2' }),
        ];
        const all = [
            base({ id: 'h1', appealRequestOrigin: 'creditor_side', requestKind: 'seizure' }),
            base({ id: 'h2', appealRequestOrigin: 'debtor_side', requestKind: 'guarantor_request' }),
        ];
        expect(resolveAppealsHubFilterOptions(cards, all)).toEqual([
            'all',
            'creditor',
            'debtor',
        ]);
    });

    it('includes executor filter only when manual ledger hub exists', () => {
        const cards = [
            base({ id: 'a1', appealSourceDecisionId: 'manual_hub' }),
            base({ id: 'a2', appealSourceDecisionId: 'cred_hub' }),
        ];
        const all = [
            base({
                id: 'manual_hub',
                manualExecutorLedgerEntry: true,
                appealRequestOrigin: 'executor_side',
            }),
            base({ id: 'cred_hub', appealRequestOrigin: 'creditor_side', requestKind: 'seizure' }),
        ];
        expect(resolveAppealHubProponentCategory(cards[0]!, all)).toBe('executor');
        expect(resolveAppealsHubFilterOptions(cards, all)).toEqual([
            'all',
            'creditor',
            'executor',
        ]);
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

describe('manual executor ledger (إضافة قرار)', () => {
    it('shows نافذ / غير نافذ only', () => {
        const notEnforced = resolveManualExecutorLedgerEnforcementState(
            base({ manualExecutorLedgerEntry: true, manualExecutorEnforced: false })
        );
        expect(notEnforced.pillLabel).toBe('غير نافذ');
        expect(notEnforced.enforced).toBe(false);

        const enforced = resolveManualExecutorLedgerEnforcementState(
            base({ manualExecutorLedgerEntry: true, manualExecutorEnforced: true })
        );
        expect(enforced.pillLabel).toBe('القرار نافذ');
        expect(enforced.enforced).toBe(true);
    });

    it('allows archive in previous tab without appeal path', () => {
        const hub = base({
            manualExecutorLedgerEntry: true,
            manualExecutorEnforced: true,
            appealStatus: 'tadhallum_filed',
            activeAppealCopyId: 'appeal_copy_old',
        });
        expect(
            canArchiveExecutorDecisionCard(hub, hub, {
                hubTab: 'previous',
                settled: true,
                appealLegallyFinal: false,
            })
        ).toBe(true);
    });

    it('purges appeal copies linked to manual hubs', () => {
        const hub = base({
            id: 'manual_hub',
            manualExecutorLedgerEntry: true,
            activeAppealCopyId: 'appeal_copy_1',
            appealActor: 'lawyer',
            appealMethod: 'tadhallum',
            appealStatus: 'tadhallum_filed',
        });
        const copy = base({
            id: 'appeal_copy_1',
            appealSourceDecisionId: 'manual_hub',
            appealStatus: 'tadhallum_filed',
        });
        const { rows, mutated } = purgeManualExecutorAppealArtifacts([hub, copy]);
        expect(mutated).toBe(true);
        expect(rows).toHaveLength(1);
        expect(rows[0]!.id).toBe('manual_hub');
        expect(rows[0]!.activeAppealCopyId).toBeNull();
        expect(rows[0]!.appealStatus).toBe('pending');
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
