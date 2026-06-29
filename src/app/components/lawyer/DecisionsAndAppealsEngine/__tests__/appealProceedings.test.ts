import { describe, expect, it } from 'vitest';
import {
    buildAppealProceedingsForDecision,
    buildManualExecutorAppealProceedings,
    buildExecutorSideAppealCommitPatch,
    isExecutorSideAwaitingAppealEntry,
    isExecutorDecisionAppealFinal,
    resolveEffectiveAwaitingCassationParty,
    resolveCassationAppellantLabel,
    hubHasActiveAppealLedgerEntry,
    manualExecutorAppealPipelineActive,
    resolveCreditorDecisionEnforcementState,
    manualExecutorCassationPartyAfterGrievance,
    manualExecutorAwaitingCassationParty,
    buildManualExecutorGrievanceResolutionPatch,
    resolveManualExecutorGrievanceFiler,
    repairManualExecutorAppealAwaitingFields,
} from '../utils';
import type { Decision } from '../types';

function baseDecision(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'd1',
        title: 'طلب إحضار',
        body: '',
        date: '2026-01-01',
        appealStatus: 'pending',
        ...overrides,
    };
}

describe('buildAppealProceedingsForDecision', () => {
    it('parses grievance then cassation from timeline logs', () => {
        const row = baseDecision({
            appealTimelineLogs: [
                {
                    id: '1',
                    at: '2026-01-02T10:00:00.000Z',
                    message: 'تم تسجيل تظلم وكيل الدائن على القرار.',
                    tone: 'amber',
                },
                {
                    id: '2',
                    at: '2026-01-03T10:00:00.000Z',
                    message: 'النتيجة: قُبل التظلم — يتاح للطرف الآخر التمييز قبل نفاذ القرار نهائياً.',
                    tone: 'emerald',
                },
                {
                    id: '3',
                    at: '2026-01-04T10:00:00.000Z',
                    message: 'سُجِّل تمييز المدين على قرار المنفذ.',
                    tone: 'amber',
                },
                {
                    id: '4',
                    at: '2026-01-05T10:00:00.000Z',
                    message: 'رد اللائحة يعني تثبيت طلبنا',
                    tone: 'rose',
                },
            ],
            appealMethod: 'tamyeez',
            appealResult: 'تصديق القرار',
        });

        const steps = buildAppealProceedingsForDecision(row);
        expect(steps).toHaveLength(2);
        expect(steps[0]).toMatchObject({ stage: 'تظلم', appellant: 'الدائن', result: 'قبول التظلم' });
        expect(steps[1]).toMatchObject({ stage: 'تمييز', appellant: 'المدين', result: 'تصديق القرار' });
    });

    it('falls back to structured fields when logs are missing', () => {
        const row = baseDecision({
            appealRequestOrigin: 'creditor_side',
            appealBaseBranch: 'after_rejection',
            executorOutcome: 'rejected',
            appealActor: 'lawyer',
            appealMethod: 'tadhallum',
            appealPhase: 'grievance',
            appealStatus: 'tadhallum_filed',
            appealResult: 'قبول التظلم',
        });

        const steps = buildAppealProceedingsForDecision(row);
        expect(steps[0]).toMatchObject({
            stage: 'تظلم',
            appellant: 'الدائن',
            result: 'قبول التظلم',
        });
    });

    it('shows creditor as cassation appellant after debtor grievance accepted (not grievance filer)', () => {
        const row = baseDecision({
            appealRequestOrigin: 'creditor_side',
            appealBaseBranch: 'after_approval',
            executorOutcome: 'rejected',
            appealActor: 'debtor',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'نقض القرار',
            appealTimelineLogs: [
                {
                    id: '1',
                    at: '2026-01-02T10:00:00.000Z',
                    message: 'تم تسجيل تظلم المدين على القرار.',
                    tone: 'amber',
                },
                {
                    id: '2',
                    at: '2026-01-03T10:00:00.000Z',
                    message: 'النتيجة: قُبل التظلم — يتاح للطرف الآخر التمييز قبل نفاذ القرار نهائياً.',
                    tone: 'emerald',
                },
            ],
        });

        expect(resolveCassationAppellantLabel(row)).toBe('الدائن');
        const steps = buildAppealProceedingsForDecision(row);
        expect(steps).toHaveLength(2);
        expect(steps[0]).toMatchObject({ stage: 'تظلم', appellant: 'المدين', result: 'قبول التظلم' });
        expect(steps[1]).toMatchObject({ stage: 'تمييز', appellant: 'الدائن', result: 'نقض القرار' });
    });

    it('reconciles stale grievance log when appealResult is newer acceptance', () => {
        const row = baseDecision({
            appealRequestOrigin: 'creditor_side',
            appealBaseBranch: 'after_approval',
            executorOutcome: 'approved',
            appealActor: 'lawyer',
            appealMethod: 'tamyeez',
            appealStatus: 'tamyeez_filed',
            appealPhase: 'cassation',
            appealResult: 'قبول التظلم',
            awaitingCassationEntryBy: 'debtor',
            appealTimelineLogs: [
                {
                    id: '1',
                    at: '2026-01-02T10:00:00.000Z',
                    message: 'تم تسجيل تظلم وكيل الدائن على القرار.',
                    tone: 'amber',
                },
                {
                    id: '2',
                    at: '2026-01-03T10:00:00.000Z',
                    message: 'النتيجة: رُد التظلم.',
                    tone: 'rose',
                },
                {
                    id: '3',
                    at: '2026-01-04T10:00:00.000Z',
                    message: 'تم تسجيل تظلم موكّل المدين على القرار.',
                    tone: 'amber',
                },
            ],
        });

        const creditorSteps = buildAppealProceedingsForDecision(row);
        expect(creditorSteps.some((s) => s.stage === 'تظلم' && s.result === 'قبول التظلم')).toBe(
            true
        );
        const debtorSteps = buildAppealProceedingsForDecision(row, 'debtor_agent');
        const accepted = debtorSteps.filter((s) => s.stage === 'تظلم' && s.result === 'قبول التظلم');
        expect(accepted.length).toBeGreaterThan(0);
        expect(accepted[accepted.length - 1].appellant).toBe('موكّلنا');
    });

    it('drops superseded appeal cycles and shows current grievance only', () => {
        const row = baseDecision({
            appealRequestOrigin: 'creditor_side',
            appealBaseBranch: 'after_approval',
            executorOutcome: 'approved',
            appealActor: 'debtor',
            appealMethod: 'tamyeez',
            appealStatus: 'pending',
            appealPhase: 'grievance',
            appealResult: 'قبول التظلم',
            awaitingCassationEntryBy: 'lawyer',
            appealTimelineLogs: [
                {
                    id: '1',
                    at: '2026-01-02T10:00:00.000Z',
                    message: 'تم تسجيل تظلم وكيل الدائن على القرار.',
                    tone: 'amber',
                },
                {
                    id: '2',
                    at: '2026-01-03T10:00:00.000Z',
                    message: 'النتيجة: رُد التظلم.',
                    tone: 'rose',
                },
                {
                    id: '3',
                    at: '2026-01-04T10:00:00.000Z',
                    message: 'تم تسجيل تظلم موكّل المدين على القرار.',
                    tone: 'amber',
                },
                {
                    id: '4',
                    at: '2026-01-05T10:00:00.000Z',
                    message: 'النتيجة: قُبل التظلم — يتاح للطرف الآخر التمييز.',
                    tone: 'emerald',
                },
            ],
        });

        const steps = buildAppealProceedingsForDecision(row, 'debtor_agent');
        expect(steps).toHaveLength(2);
        expect(steps[0]).toMatchObject({
            stage: 'تظلم',
            appellant: 'موكّلنا',
            result: 'قبول التظلم',
        });
        expect(steps[1]).toMatchObject({
            stage: 'تمييز',
            appellant: '',
            result: 'بانتظار التسجيل',
        });
        expect(steps.some((s) => s.result === 'رد التظلم')).toBe(false);
    });

    it('dedupes duplicate grievance rows when cassation is final', () => {
        const row = baseDecision({
            appealRequestOrigin: 'creditor_side',
            appealBaseBranch: 'after_approval',
            executorOutcome: 'approved',
            appealActor: 'lawyer',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'نقض القرار',
            appealTimelineLogs: [
                {
                    id: '1',
                    at: '2026-01-02T10:00:00.000Z',
                    message: 'تم تسجيل تظلم المدين على القرار.',
                    tone: 'amber',
                },
                {
                    id: '2',
                    at: '2026-01-03T10:00:00.000Z',
                    message: 'النتيجة: قُبل التظلم — يتاح للطرف الآخر التمييز.',
                    tone: 'emerald',
                },
                {
                    id: '3',
                    at: '2026-01-04T10:00:00.000Z',
                    message: 'النتيجة: قُبل التظلم — إعادة تسجيل.',
                    tone: 'emerald',
                },
                {
                    id: '4',
                    at: '2026-01-05T10:00:00.000Z',
                    message: 'سُجِّل تمييز وكيل الدائن على قرار المنفذ.',
                    tone: 'amber',
                },
                {
                    id: '5',
                    at: '2026-01-06T10:00:00.000Z',
                    message: 'نقض القرار — إعادة المسار.',
                    tone: 'rose',
                },
            ],
        });

        const steps = buildAppealProceedingsForDecision(row);
        expect(steps.filter((s) => s.stage === 'تظلم')).toHaveLength(1);
        expect(steps).toHaveLength(2);
        expect(steps[0]).toMatchObject({ stage: 'تظلم', appellant: 'المدين', result: 'قبول التظلم' });
        expect(steps[1]).toMatchObject({ stage: 'تمييز', appellant: 'الدائن', result: 'نقض القرار' });
    });

    it('builds manual executor proceedings with multiple grievance appellants', () => {
        const row = baseDecision({
            manualExecutorLedgerEntry: true,
            appealRequestOrigin: 'executor_side',
            manualGrievanceAppellants: ['lawyer', 'debtor'],
            appealStatus: 'tadhallum_filed',
            appealPhase: 'grievance',
        });

        const steps = buildManualExecutorAppealProceedings(row);
        expect(steps).toHaveLength(1);
        expect(steps[0]).toMatchObject({
            stage: 'تظلم',
            appellant: 'الدائن، المدين',
            result: 'قيد النظر',
        });
    });

    it('builds appeal commit patch from card entry (grievance, both parties)', () => {
        const patch = buildExecutorSideAppealCommitPatch('grievance', ['debtor', 'lawyer']);
        expect(patch.manualGrievanceAppellants).toEqual(['debtor', 'lawyer']);
        expect(patch.appealActor).toBeNull();
        expect(patch.appealRequestOrigin).toBe('executor_side');
        expect(patch.appealMethod).toBe('tadhallum');
        expect(patch.appealStatus).toBe('tadhallum_filed');
    });

    it('builds appeal commit patch for creditor-only cassation', () => {
        const patch = buildExecutorSideAppealCommitPatch('cassation', ['lawyer']);
        expect(patch.manualCassationAppellants).toEqual(['lawyer']);
        expect(patch.appealActor).toBe('lawyer');
        expect(patch.appealRequestOrigin).toBe('creditor_side');
        expect(patch.appealStatus).toBe('tamyeez_filed');
    });

    it('uses manual appellants when executor ledger has no timeline logs', () => {
        const row = baseDecision({
            manualExecutorLedgerEntry: true,
            appealRequestOrigin: 'executor_side',
            manualCassationAppellants: ['lawyer'],
            appealStatus: 'tamyeez_filed',
            appealPhase: 'cassation',
        });

        const steps = buildAppealProceedingsForDecision(row);
        expect(steps).toHaveLength(1);
        expect(steps[0]).toMatchObject({ stage: 'تمييز', appellant: 'الدائن', result: 'قيد النظر' });
    });

    it('hides cassation appellant when grievance is accepted', () => {
        const row = baseDecision({
            appealRequestOrigin: 'debtor_side',
            appealBaseBranch: 'after_rejection',
            appealActor: 'debtor',
            appealMethod: 'tadhallum',
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        });

        const steps = buildAppealProceedingsForDecision(row);
        const cassation = steps.find((s) => s.stage === 'تمييز');
        expect(cassation).toBeDefined();
        expect(cassation?.appellant).toBe('');
        expect(cassation?.result).toBe('بانتظار التسجيل');
    });

    it('shows grievance filer as cassation appellant when grievance is rejected', () => {
        const row = baseDecision({
            appealRequestOrigin: 'debtor_side',
            appealBaseBranch: 'after_rejection',
            appealActor: 'debtor',
            appealMethod: 'tadhallum',
            appealResult: 'رد التظلم',
            appealStatus: 'pending',
            grievanceRejectedAwaitingTamyeez: true,
            awaitingCassationEntryBy: 'debtor',
        });

        const steps = buildAppealProceedingsForDecision(row);
        const cassation = steps.find((s) => s.stage === 'تمييز');
        expect(cassation?.appellant).toBe('المدين');
    });

    it('does not show awaiting cassation while grievance is still open', () => {
        const row = baseDecision({
            appealActor: 'debtor',
            appealMethod: 'tadhallum',
            appealStatus: 'tadhallum_filed',
            appealPhase: 'grievance',
        });
        expect(resolveEffectiveAwaitingCassationParty(row)).toBeNull();
    });

    it('does not open appeal entry on manual executor ledger cards', () => {
        const row = baseDecision({
            manualExecutorLedgerEntry: true,
            appealRequestOrigin: 'executor_side',
            manualExecutorBeneficiary: 'neutral',
            date: '2026-12-20',
            appealStatus: 'pending',
        });
        expect(isExecutorSideAwaitingAppealEntry(row)).toBe(false);
    });

    it('does not add unused cassation row for grievance-only state', () => {
        const row = baseDecision({
            appealActor: 'debtor',
            appealMethod: 'tadhallum',
            appealPhase: 'grievance',
            appealStatus: 'tadhallum_filed',
        });

        const steps = buildAppealProceedingsForDecision(row);
        expect(steps).toHaveLength(1);
        expect(steps.some((s) => s.stage === 'تمييز')).toBe(false);
    });
});

describe('manual executor grievance cassation entitlement', () => {
    it('after debtor grievance accepted — only creditor may cassate', () => {
        const row = baseDecision({
            manualExecutorLedgerEntry: true,
            appealRequestOrigin: 'debtor_side',
            manualGrievanceAppellants: ['debtor'],
            appealActor: 'debtor',
            appealStatus: 'pending',
            appealResult: 'قبول التظلم',
        });
        expect(resolveManualExecutorGrievanceFiler(row)).toBe('debtor');
        expect(manualExecutorCassationPartyAfterGrievance(row, true)).toBe('lawyer');
        expect(manualExecutorAwaitingCassationParty(row)).toBe('lawyer');
        const patch = buildManualExecutorGrievanceResolutionPatch(row, true);
        expect(patch.awaitingCassationEntryBy).toBe('lawyer');
    });

    it('after creditor grievance accepted — only debtor may cassate', () => {
        const row = baseDecision({
            manualExecutorLedgerEntry: true,
            appealRequestOrigin: 'creditor_side',
            manualGrievanceAppellants: ['lawyer'],
            appealActor: 'lawyer',
            appealStatus: 'pending',
            appealResult: 'قبول التظلم',
        });
        expect(manualExecutorCassationPartyAfterGrievance(row, true)).toBe('debtor');
        expect(manualExecutorAwaitingCassationParty(row)).toBe('debtor');
    });

    it('after grievance rejected — only grievance filer may cassate', () => {
        const row = baseDecision({
            manualExecutorLedgerEntry: true,
            appealRequestOrigin: 'debtor_side',
            manualGrievanceAppellants: ['debtor'],
            appealActor: 'debtor',
            appealStatus: 'pending',
            appealResult: 'رد التظلم',
            grievanceRejectedAwaitingTamyeez: true,
        });
        expect(manualExecutorCassationPartyAfterGrievance(row, false)).toBe('debtor');
        expect(manualExecutorAwaitingCassationParty(row)).toBe('debtor');
        const patch = buildManualExecutorGrievanceResolutionPatch(row, false);
        expect(patch.awaitingCassationEntryBy).toBe('debtor');
        expect(patch.grievanceRejectedAwaitingTamyeez).toBe(true);
    });

    it('ignores stale debtor awaiting flag after debtor grievance accepted on manual copy', () => {
        const hub = baseDecision({
            id: 'manual_hub',
            manualExecutorLedgerEntry: true,
            appealRequestOrigin: 'executor_side',
        });
        const copy = baseDecision({
            id: 'appeal_copy_1',
            appealSourceDecisionId: 'manual_hub',
            manualGrievanceAppellants: ['debtor'],
            appealActor: 'debtor',
            appealRequestOrigin: 'debtor_side',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'debtor',
            grievanceAcceptedAwaitingDebtorTamyeez: true,
            appealTimelineLogs: [
                {
                    id: 'log1',
                    at: '2026-06-12T10:00:00.000Z',
                    message: 'النتيجة: قُبل التظلم — يتاح للطرف الآخر التمييز قبل نفاذ القرار نهائياً.',
                    tone: 'emerald',
                },
            ],
        });
        const all = [hub, copy];
        expect(resolveEffectiveAwaitingCassationParty(copy, undefined, all)).toBe('lawyer');
        const repaired = repairManualExecutorAppealAwaitingFields(copy, all);
        expect(repaired.awaitingCassationEntryBy).toBe('lawyer');
        expect(repaired.appealResult).toBe('قبول التظلم');
    });

    it('proceedings show creditor as awaiting cassation after debtor grievance grant', () => {
        const row = baseDecision({
            manualExecutorLedgerEntry: true,
            manualGrievanceAppellants: ['debtor'],
            appealActor: 'debtor',
            appealStatus: 'pending',
            appealResult: 'قبول التظلم',
            awaitingCassationEntryBy: 'lawyer',
        });
        const steps = buildManualExecutorAppealProceedings(row);
        const cass = steps.find((s) => s.stage === 'تمييز');
        expect(cass?.appellant).toBe('الدائن');
        expect(cass?.result).toBe('بانتظار التسجيل');
    });
});

describe('executor manual ledger hub routing', () => {
    it('keeps manual hub in previous tab during appeal pipeline (flag 2)', () => {
        const hub = baseDecision({
            manualExecutorLedgerEntry: true,
            appealRequestOrigin: 'executor_side',
            executorDecisionStatusFlag: 2,
            manualExecutorWorkflowPhase: 'grievance_pending',
            manualExecutorAppealKind: 'tadhallum',
        });
        expect(hubHasActiveAppealLedgerEntry(hub)).toBe(false);
        expect(manualExecutorAppealPipelineActive(hub)).toBe(true);
    });

    it('keeps settled manual hub in previous tab when no appeal is open', () => {
        const hub = baseDecision({
            manualExecutorLedgerEntry: true,
            appealRequestOrigin: 'executor_side',
            executorDecisionStatusFlag: 1,
            activeAppealCopyId: 'appeal_copy_1',
        });
        expect(hubHasActiveAppealLedgerEntry(hub)).toBe(false);
    });

    it('shows three-state labels on manual executor hub', () => {
        const active = baseDecision({
            manualExecutorLedgerEntry: true,
            appealRequestOrigin: 'executor_side',
            status: 'accepted',
            executorDecisionStatusFlag: 1,
        });
        const grievancePending = baseDecision({
            ...active,
            executorDecisionStatusFlag: 2,
            manualExecutorWorkflowPhase: 'grievance_pending',
            manualExecutorAppealKind: 'tadhallum',
        });
        expect(
            resolveCreditorDecisionEnforcementState(active, active, {
                hubTab: 'previous',
                appealLegallyFinal: false,
                needsExecutor: false,
            }).pillLabel
        ).toBe('قرار ساري ومُنتج لآثاره');
        expect(
            resolveCreditorDecisionEnforcementState(grievancePending, grievancePending, {
                hubTab: 'previous',
                appealLegallyFinal: false,
                needsExecutor: false,
            }).pillLabel
        ).toBe('التنفيذ موقوف لحين البت في التظلم');
    });
});
