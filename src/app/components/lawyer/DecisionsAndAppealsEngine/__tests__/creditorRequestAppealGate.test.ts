import { describe, expect, it } from 'vitest';
import type { Decision } from '../types';
import {
    buildAppealProceedingsForDecision,
    resolveEffectiveAppealActor,
    resolveEffectiveAwaitingCassationParty,
    buildGrievanceResolutionPatch,
    effectiveExecutorOutcomeForCreditorHubPill,
    inferAppealMethodsUsed,
    isCreditorRequestFlowContinues,
    isExecutorRequestAppealCycleSuperseded,
    resolveCreditorDecisionHubStatusPill,
    resolveCreditorRequestAppealGate,
    resolveCreditorDecisionEnforcementState,
    resolveCreditorAppealPauseGate,
    resolveHarmedPartyAppealActor,
    creditorAgentDebtorIsSoleAppellant,
    inferDecisionAppealRequestOrigin,
    isCreditorExecutorAppealSubject,
    isExecutorRequestFollowupBlocked,
    resolveExecutorRequestFollowupBlockFromRecord,
} from '../utils';
import {
    getGoverningEvictionProcedureRowForBranch,
    getGoverningEvictionProcedureRowForNewRequest,
    getNewestEvictionProcedureRowForBranch,
    isEvictionBranchBlockingNewRequest,
    isEvictionBranchResendBlocked,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowPending,
    isEvictionProcedureRowWorkflowComplete,
    normalizeEvictionProcedureTitle,
} from '@/app/utils/executorSeizureDecisionQueue';

function baseDecision(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'req_1',
        title: 'طلب إخلاء',
        body: '',
        date: '2026-06-01',
        appealStatus: 'pending',
        appealRequestOrigin: 'creditor_side',
        executorOutcome: 'approved',
        ...overrides,
    };
}

describe('creditorRequestAppealGate', () => {
    it('does not infer cassation from grievance-only appealResult', () => {
        const row = baseDecision({
            appealActor: 'debtor',
            appealMethod: 'tadhallum',
            appealPhase: 'grievance',
            appealStatus: 'tadhallum_filed',
            appealResult: 'قبول التظلم',
        });
        expect(inferAppealMethodsUsed(row)).toEqual({ tadhallum: true, tamyeez: false });
        expect(buildAppealProceedingsForDecision(row)).toHaveLength(1);
        expect(buildAppealProceedingsForDecision(row)[0].stage).toBe('تظلم');
    });

    it('detects pause when grievance accepted even if appealActor is missing on row', () => {
        const hub = baseDecision({
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        });
        const pipe = baseDecision({
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        });
        expect(resolveCreditorRequestAppealGate(hub, pipe).kind).toBe('paused');
        expect(resolveCreditorAppealPauseGate(hub, [hub])).not.toBeNull();
    });

    it('pauses when grievance is filed even without appealActor on row', () => {
        const hub = baseDecision({
            appealPhase: 'grievance',
            appealStatus: 'tadhallum_filed',
        });
        expect(resolveCreditorRequestAppealGate(hub, hub).kind).toBe('paused');
        expect(isExecutorRequestFollowupBlocked(hub, [hub])).toBe(true);
        const linkedHub = baseDecision({ id: 'req_forced_1' });
        const linkedPipe = baseDecision({
            id: 'appeal_copy_forced_1',
            appealSourceDecisionId: 'req_forced_1',
            appealPhase: 'grievance',
            appealStatus: 'tadhallum_filed',
        });
        expect(isExecutorRequestFollowupBlocked(linkedHub, [linkedHub, linkedPipe])).toBe(true);
    });

    it('pauses approved seizure third-party request after debtor grievance without lifecycle reset', () => {
        const hub = baseDecision({
            id: 'seizure_req_third_party_1',
            title: 'طلب حجز مال المدين لدى الغير',
            requestKind: 'seizure',
            seizureSubtype: 'third_party',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            appealBaseBranch: 'after_approval',
            activeAppealCopyId: 'appeal_copy_seizure_1',
        });
        const pipe = baseDecision({
            id: 'appeal_copy_seizure_1',
            appealSourceDecisionId: hub.id,
            appealStatus: 'tadhallum_filed',
            appealPhase: 'grievance',
            appealMethod: 'tadhallum',
            appealActor: undefined,
        });
        const patch = buildGrievanceResolutionPatch(pipe, true);
        expect(patch.appealStatus).toBe('pending');
        expect(patch.awaitingCassationEntryBy).toBe('lawyer');
        expect(patch.appealWorkflowState).not.toBe('REVOKED_BY_APPEAL');

        const mergedPipe = { ...pipe, ...patch };
        const gate = resolveCreditorRequestAppealGate(hub, mergedPipe);
        expect(gate.kind).toBe('paused');
        expect(isExecutorRequestAppealCycleSuperseded(hub, [hub, mergedPipe])).toBe(false);
        expect(isExecutorRequestFollowupBlocked(hub, [hub, mergedPipe])).toBe(true);
        const block = resolveExecutorRequestFollowupBlockFromRecord(hub, [hub, mergedPipe]);
        expect(block?.kind).toBe('paused');
    });

    it('pauses request flow when debtor grievance is accepted awaiting creditor cassation', () => {
        const hub = baseDecision();
        const pipe = baseDecision({
            appealActor: 'debtor',
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        });
        const gate = resolveCreditorRequestAppealGate(hub, pipe);
        expect(gate.kind).toBe('paused');
        if (gate.kind === 'paused') {
            expect(gate.showWaiveCassation).toBe(true);
        }
        const debtorGate = resolveCreditorRequestAppealGate(hub, pipe, 'debtor_agent');
        expect(debtorGate.kind).toBe('paused');
        if (debtorGate.kind === 'paused') {
            expect(debtorGate.showWaiveCassation).toBe(false);
            expect(debtorGate.message).toContain('موكّلنا');
        }
        expect(effectiveExecutorOutcomeForCreditorHubPill(hub, pipe)).toBe('approved');
        expect(isCreditorRequestFlowContinues(hub, pipe)).toBe(false);
    });

    it('treats lawyer cassation rad_laheeza after grievance as lifecycle reset', () => {
        const hub = baseDecision();
        const pipe = baseDecision({
            appealActor: 'lawyer',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'رد اللائحة',
            executorOutcome: 'rejected',
        });
        expect(resolveCreditorRequestAppealGate(hub, pipe).kind).toBe('lifecycle_reset');
        expect(effectiveExecutorOutcomeForCreditorHubPill(hub, pipe)).toBe('rejected');
    });

    it('treats debtor cassation naqd as lifecycle reset not enforced effective', () => {
        const hub = baseDecision();
        const pipe = baseDecision({
            appealActor: 'debtor',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'نقض القرار',
            executorOutcome: 'rejected',
            appealWorkflowState: 'REVOKED_BY_APPEAL',
        });
        expect(resolveCreditorRequestAppealGate(hub, pipe).kind).toBe('lifecycle_reset');
        expect(effectiveExecutorOutcomeForCreditorHubPill(hub, pipe)).toBe('rejected');
    });

    it('shows non-final pill when grievance accepted on approved creditor request', () => {
        const hub = baseDecision();
        const pipe = baseDecision({
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        });
        const pill = resolveCreditorDecisionHubStatusPill(hub, pipe, {
            hubTab: 'previous',
            appealLegallyFinal: false,
            phys: 'approved',
        });
        expect(pill).toEqual({ label: 'غير نافذ — مؤقتاً', tone: 'amber' });
    });

    it('keeps approval effective when debtor cassation is rad_laheeza', () => {
        const hub = baseDecision();
        const pipe = baseDecision({
            appealActor: 'debtor',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'رد اللائحة',
            executorOutcome: 'approved',
        });
        expect(resolveCreditorRequestAppealGate(hub, pipe).kind).toBe('continue');
        expect(effectiveExecutorOutcomeForCreditorHubPill(hub, pipe)).toBe('approved');
    });

    it('treats lawyer rad_laheeza as lifecycle reset when appealActor is missing', () => {
        const hub = baseDecision();
        const pipe = baseDecision({
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'رد اللائحة',
            executorOutcome: 'rejected',
        });
        expect(resolveCreditorRequestAppealGate(hub, pipe).kind).toBe('lifecycle_reset');
        expect(effectiveExecutorOutcomeForCreditorHubPill(hub, pipe)).toBe('rejected');
    });

    it('infers creditor origin for legacy eviction rows without appealRequestOrigin', () => {
        const hub = baseDecision({
            id: 'eviction_req_test',
            requestKind: 'eviction_procedure',
            appealRequestOrigin: undefined,
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        });
        expect(inferDecisionAppealRequestOrigin(hub)).toBe('creditor_side');
        expect(isExecutorRequestFollowupBlocked(hub, [hub])).toBe(true);
    });

    it('returns continue for null hub rows without throwing', () => {
        expect(isExecutorRequestFollowupBlocked(null, [])).toBe(false);
        expect(resolveExecutorRequestFollowupBlockFromRecord(null, [])).toBeNull();
    });

    it('ends followup panel after debtor cassation naqd on inferred creditor eviction row', () => {
        const hub = baseDecision({
            id: 'eviction_req_naqd',
            requestKind: 'eviction_procedure',
            appealRequestOrigin: undefined,
        });
        const pipe = baseDecision({
            id: 'appeal_copy_1',
            appealSourceDecisionId: hub.id,
            appealActor: 'debtor',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'نقض القرار',
            executorOutcome: 'rejected',
        });
        expect(isExecutorRequestAppealCycleSuperseded(hub, [hub, pipe])).toBe(true);
        expect(isExecutorRequestFollowupBlocked(hub, [hub, pipe])).toBe(false);
        expect(resolveExecutorRequestFollowupBlockFromRecord(hub, [hub, pipe])).toBeNull();
    });

    it('treats debtor naqd as lifecycle reset even when executorOutcome stays approved on pipe', () => {
        const hub = baseDecision();
        const pipe = baseDecision({
            appealActor: 'debtor',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'نقض القرار',
            executorOutcome: 'approved',
        });
        expect(resolveCreditorRequestAppealGate(hub, pipe).kind).toBe('lifecycle_reset');
        expect(effectiveExecutorOutcomeForCreditorHubPill(hub, pipe)).toBe('rejected');
        expect(isCreditorRequestFlowContinues(hub, pipe)).toBe(false);
    });

    it('marks rejected creditor request superseded after final cassation affirm', () => {
        const hub = baseDecision({
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'executive_dossier_presentation',
            executorOutcome: 'rejected',
            appealStatus: 'final',
            appealResult: 'تصديق القرار',
            appealMethod: 'tamyeez',
            appealActor: 'lawyer',
        });
        expect(isExecutorRequestAppealCycleSuperseded(hub, [hub])).toBe(true);
    });

    it('marks appeal cycle superseded after lifecycle reset or waive cassation', () => {
        const mergedAfterNaqd = baseDecision({
            id: 'eviction_1',
            requestKind: 'eviction_procedure',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'نقض القرار',
            executorOutcome: 'rejected',
        });
        expect(isExecutorRequestAppealCycleSuperseded(mergedAfterNaqd, [mergedAfterNaqd])).toBe(true);

        const waivedHub = baseDecision({
            noAppealChosen: true,
            appealStatus: 'final',
            appealResult: 'قبول التظلم',
            executorOutcome: 'rejected',
        });
        expect(isExecutorRequestAppealCycleSuperseded(waivedHub, [waivedHub])).toBe(true);
        const waivedGate = resolveCreditorRequestAppealGate(waivedHub, waivedHub);
        expect(waivedGate.kind).toBe('revoked');
        if (waivedGate.kind === 'revoked') {
            expect(waivedGate.showAppealsShortcut).toBe(false);
        }
        expect(effectiveExecutorOutcomeForCreditorHubPill(waivedHub, waivedHub)).toBe('rejected');
        expect(isCreditorRequestFlowContinues(waivedHub, waivedHub)).toBe(false);

        const pausedHub = baseDecision({
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        });
        expect(isExecutorRequestAppealCycleSuperseded(pausedHub, [pausedHub])).toBe(false);
    });

    it('allows new eviction field visit after appeal cycle superseded', () => {
        const hub = {
            id: 'eviction_1',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'rejected',
            appealStatus: 'final',
            appealResult: 'نقض القرار',
            appealMethod: 'tamyeez',
        } as Record<string, unknown>;
        const all = [hub];
        expect(isEvictionProcedureRowActive(hub, all)).toBe(false);
    });

    it('does not block new field visit when newest row is executor-rejected', () => {
        const hub = {
            id: 'eviction_rejected',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'rejected',
            date: '2026-06-04',
        } as Record<string, unknown>;
        expect(isEvictionProcedureRowActive(hub, [hub])).toBe(false);
        expect(
            isEvictionBranchBlockingNewRequest([hub], { branch: 'Field Visit Date' })
        ).toBe(false);
    });

    it('does not treat stale naqd appealResult on rejected row as active workflow', () => {
        const hub = {
            id: 'eviction_stale_naqd',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            executorOutcome: 'rejected',
            appealStatus: 'final',
            appealResult: 'نقض القرار',
            date: '2026-06-04',
        } as Record<string, unknown>;
        expect(isEvictionProcedureRowActive(hub, [hub])).toBe(false);
        expect(
            isEvictionBranchBlockingNewRequest([hub], { branch: 'Field Visit Date' })
        ).toBe(false);
    });

    it('blocks only from newest row when older approved row is stale', () => {
        const olderApproved = {
            id: 'eviction_old',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            executorOutcome: 'approved',
            date: '2026-06-01',
        } as Record<string, unknown>;
        const newerRejected = {
            id: 'eviction_new',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            executorOutcome: 'rejected',
            date: '2026-06-04',
        } as Record<string, unknown>;
        const all = [olderApproved, newerRejected];
        expect(isEvictionProcedureRowActive(olderApproved, all)).toBe(true);
        expect(
            isEvictionBranchBlockingNewRequest(all, { branch: 'Field Visit Date' })
        ).toBe(false);
    });

    it('does not treat appeal copy as pending when hub row is rejected', () => {
        const hub = {
            id: 'eviction_hub',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            executorOutcome: 'rejected',
            resolvedAt: '2026-06-04T15:00:00.000Z',
            date: '2026-06-04',
        } as Record<string, unknown>;
        const appealCopy = {
            id: 'appeal_copy_1',
            appealSourceDecisionId: 'eviction_hub',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            executorOutcome: 'pending',
            date: '2026-06-04',
        } as Record<string, unknown>;
        const all = [hub, appealCopy];
        expect(getNewestEvictionProcedureRowForBranch(all, 'Field Visit Date')?.id).toBe('eviction_hub');
        const governing = getGoverningEvictionProcedureRowForBranch(all, 'Field Visit Date');
        expect(governing?.id).toBe('eviction_hub');
        expect(isEvictionProcedureRowPending(governing)).toBe(false);
        expect(isEvictionBranchBlockingNewRequest(all, { branch: 'Field Visit Date' })).toBe(false);
    });

    it('governing row prefers active pending hub over newer rejected hub by sort key', () => {
        const rejected = {
            id: 'eviction_rejected',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            executorOutcome: 'rejected',
            resolvedAt: '2026-06-05T12:00:00.000Z',
            date: '2026-06-05',
        } as Record<string, unknown>;
        const pending = {
            id: 'eviction_pending',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            executorOutcome: 'pending',
            date: '2026-06-04',
        } as Record<string, unknown>;
        const all = [rejected, pending];
        expect(getNewestEvictionProcedureRowForBranch(all, 'Field Visit Date')?.id).toBe('eviction_rejected');
        expect(getGoverningEvictionProcedureRowForBranch(all, 'Field Visit Date')?.id).toBe('eviction_pending');
        expect(isEvictionBranchBlockingNewRequest(all, { branch: 'Field Visit Date' })).toBe(false);
    });

    it('still blocks duplicate eviction while grievance pause is open', () => {
        const hub = {
            id: 'eviction_2',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        } as Record<string, unknown>;
        expect(isEvictionProcedureRowActive(hub, [hub])).toBe(true);
    });

    it('allows lifecycle resubmit after workflow-complete field visit', () => {
        const hub = {
            id: 'eviction_done',
            title: '📍 طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            executorOutcome: 'approved',
            executorScheduleLabel: 'مجدول: الخميس',
            date: '2026-06-04',
        } as Record<string, unknown>;
        expect(isEvictionProcedureRowWorkflowComplete(hub)).toBe(true);
        expect(isEvictionProcedureRowActive(hub, [hub])).toBe(false);
        expect(isEvictionBranchBlockingNewRequest([hub], { branch: 'Field Visit Date' })).toBe(false);
        expect(isEvictionBranchResendBlocked([hub], { branch: 'Field Visit Date' })).toBe(false);
    });

    it('normalizes emoji-prefixed eviction titles for matching', () => {
        expect(normalizeEvictionProcedureTitle('📍 طلب تحديد موعد الخروج الميداني')).toBe(
            'طلب تحديد موعد الخروج الميداني'
        );
    });

    it('pauses creditor mirror request when debtor grievance is open', () => {
        const hub = baseDecision({
            id: 'mirror_hub',
            appealRequestOrigin: 'debtor_side',
            requestKind: 'special_followup',
            body: 'تقدّم وكيل الدائن بـ«متابعة»',
            payloadJson: JSON.stringify({ source: 'debtor_agent_creditor_mirror' }),
            activeAppealCopyId: 'mirror_copy',
        });
        const pipe = baseDecision({
            id: 'mirror_copy',
            appealSourceDecisionId: 'mirror_hub',
            appealRequestOrigin: 'debtor_side',
            requestKind: 'special_followup',
            body: 'تقدّم وكيل الدائن بـ«متابعة»',
            payloadJson: JSON.stringify({ source: 'debtor_agent_creditor_mirror' }),
            appealActor: 'debtor',
            appealStatus: 'tadhallum_filed',
            appealPhase: 'grievance',
        });
        expect(resolveHarmedPartyAppealActor(hub, 'debtor_agent')).toBe('debtor');
        const gate = resolveCreditorRequestAppealGate(hub, pipe, 'debtor_agent');
        expect(gate.kind).toBe('paused');
        expect(effectiveExecutorOutcomeForCreditorHubPill(hub, pipe, 'debtor_agent')).toBe(
            'approved'
        );
        expect(isCreditorRequestFlowContinues(hub, pipe, 'debtor_agent')).toBe(false);
        expect(resolveCreditorAppealPauseGate(hub, [hub, pipe], 'debtor_agent')?.kind).toBe(
            'paused'
        );
    });

    it('governing row for new request resolves by branch without workflow key on stored row', () => {
        const hub = {
            id: 'eviction_legacy',
            title: '📍 طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            executorOutcome: 'approved',
            executorScheduleLabel: 'مجدول: الخميس',
            date: '2026-06-04',
        } as Record<string, unknown>;
        const found = getGoverningEvictionProcedureRowForNewRequest([hub], {
            evictionWorkflowKey: 'field_visit_or_grace',
            title: '📍 طلب تحديد موعد الخروج الميداني',
        });
        expect(found?.id).toBe('eviction_legacy');
    });

    it('resolveEffectiveAwaitingCassationParty prefers lawyer after debtor grievance accepted', () => {
        const pipe = {
            id: 'req_1',
            title: 'طلب خاص',
            requestKind: 'special_followup',
            appealRequestOrigin: 'creditor_side',
            appealBaseBranch: 'after_approval',
            executorOutcome: 'approved',
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'debtor',
        } as Decision;
        expect(resolveEffectiveAwaitingCassationParty(pipe)).toBe('lawyer');
    });

    it('detects creditor mirror row as appeal subject without debtor_agent perspective', () => {
        const hub = baseDecision({
            id: 'mirror_hub',
            appealRequestOrigin: 'debtor_side',
            requestKind: 'special_followup',
            payloadJson: JSON.stringify({ source: 'debtor_agent_creditor_mirror' }),
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        });
        expect(isCreditorExecutorAppealSubject(hub)).toBe(true);
        expect(resolveCreditorRequestAppealGate(hub, hub).kind).toBe('paused');
        expect(isExecutorRequestFollowupBlocked(hub, [hub])).toBe(true);
    });

    it('creditor agent sees debtor-only appeal on approved creditor personal coercive', () => {
        const hub = baseDecision({
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'forced_bring_in',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
        });
        expect(resolveHarmedPartyAppealActor(hub, 'creditor_agent')).toBe('debtor');
        expect(creditorAgentDebtorIsSoleAppellant(hub, 'creditor_agent')).toBe(true);
        expect(creditorAgentDebtorIsSoleAppellant(hub, 'debtor_agent')).toBe(false);
    });

    it('creditor agent sees debtor-only appeal on executor-order forced bring-in', () => {
        const hub = baseDecision({
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'forced_bring_in',
            appealRequestOrigin: 'executor_side',
            activatedByExecutorOrder: true,
            executorOutcome: 'approved',
        });
        expect(creditorAgentDebtorIsSoleAppellant(hub, 'creditor_agent')).toBe(true);
    });

    it('pauses executor-order forced bring-in when debtor grievance is accepted', () => {
        const hub = baseDecision({
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'forced_bring_in',
            appealRequestOrigin: 'executor_side',
            activatedByExecutorOrder: true,
            executorOutcome: 'approved',
            appealActor: 'debtor',
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        });
        expect(resolveCreditorRequestAppealGate(hub, hub).kind).toBe('paused');
        expect(isExecutorRequestFollowupBlocked(hub, [hub])).toBe(true);
    });

    it('revokes executor-order forced bring-in when debtor grievance is final', () => {
        const hub = baseDecision({
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'forced_bring_in',
            appealRequestOrigin: 'executor_side',
            activatedByExecutorOrder: true,
            executorOutcome: 'approved',
            appealActor: 'debtor',
            appealResult: 'قبول التظلم',
            appealStatus: 'final',
        });
        expect(resolveCreditorRequestAppealGate(hub, hub).kind).toBe('revoked');
        expect(isExecutorRequestAppealCycleSuperseded(hub, [hub])).toBe(true);
    });

    it('creditor agent keeps appeal buttons when executor rejected creditor request', () => {
        const hub = baseDecision({
            requestKind: 'personal_coercive',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'rejected',
        });
        expect(resolveHarmedPartyAppealActor(hub, 'creditor_agent')).toBe('lawyer');
        expect(creditorAgentDebtorIsSoleAppellant(hub, 'creditor_agent')).toBe(false);
    });

    it('resolveEffectiveAppealActor ignores stale lawyer actor after debtor grievance accepted', () => {
        const hub = {
            id: 'req_1',
            title: 'طلب خاص',
            requestKind: 'special_followup',
            appealRequestOrigin: 'creditor_side',
            appealBaseBranch: 'after_approval',
            executorOutcome: 'approved',
        } as Decision;
        const pipe = {
            ...hub,
            appealActor: 'lawyer',
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
        } as Decision;
        expect(resolveEffectiveAppealActor(pipe, hub, 'debtor_agent')).toBe('debtor');
    });

    describe('cassation enforcement matrix', () => {
        const enforcementOpts = {
            hubTab: 'previous' as const,
            appealLegallyFinal: true,
            needsExecutor: false,
        };

        it('scenario 1 — creditor tamyeez naqd: lifts pause, procedure stays enforced', () => {
            const hub = baseDecision({ executorOutcome: 'approved', appealRequestOrigin: 'creditor_side' });
            const pausedPipe = baseDecision({
                id: 'appeal_pause',
                appealSourceDecisionId: hub.id,
                appealActor: 'debtor',
                appealResult: 'قبول التظلم',
                appealStatus: 'pending',
                awaitingCassationEntryBy: 'lawyer',
            });
            expect(resolveCreditorRequestAppealGate(hub, pausedPipe).kind).toBe('paused');
            expect(isExecutorRequestFollowupBlocked(hub, [hub, pausedPipe])).toBe(true);

            const naqdPipe = baseDecision({
                id: 'appeal_naqd',
                appealSourceDecisionId: hub.id,
                appealActor: 'lawyer',
                appealMethod: 'tamyeez',
                appealStatus: 'final',
                appealResult: 'نقض القرار',
                executorOutcome: 'approved',
            });
            expect(resolveCreditorRequestAppealGate(hub, naqdPipe).kind).toBe('continue');
            expect(
                resolveCreditorDecisionEnforcementState(hub, naqdPipe, enforcementOpts).enforced
            ).toBe(true);
            expect(isExecutorRequestFollowupBlocked(hub, [hub, naqdPipe])).toBe(false);
            expect(isExecutorRequestAppealCycleSuperseded(hub, [hub, naqdPipe])).toBe(false);
        });

        it('scenario 2 — creditor tamyeez rad/tasdeeq: closes path, procedure terminated', () => {
            const hub = baseDecision({ executorOutcome: 'approved' });
            const pipe = baseDecision({
                id: 'appeal_rad',
                appealSourceDecisionId: hub.id,
                appealActor: 'lawyer',
                appealMethod: 'tamyeez',
                appealStatus: 'final',
                appealResult: 'رد اللائحة',
                executorOutcome: 'rejected',
            });
            expect(resolveCreditorRequestAppealGate(hub, pipe).kind).toBe('lifecycle_reset');
            expect(
                resolveCreditorDecisionEnforcementState(hub, pipe, enforcementOpts).enforced
            ).toBe(false);
            expect(isExecutorRequestAppealCycleSuperseded(hub, [hub, pipe])).toBe(true);
            expect(isCreditorRequestFlowContinues(hub, pipe)).toBe(false);
        });

        it('rejected debtor grievance — no stop, procedure stays enforced', () => {
            const hub = baseDecision({ executorOutcome: 'approved' });
            const pipe = baseDecision({
                appealActor: 'debtor',
                appealResult: 'رد التظلم',
                appealStatus: 'final',
            });
            expect(resolveCreditorRequestAppealGate(hub, pipe).kind).toBe('continue');
            expect(
                resolveCreditorDecisionEnforcementState(hub, pipe, enforcementOpts).enforced
            ).toBe(true);
            expect(isExecutorRequestFollowupBlocked(hub, [hub, pipe])).toBe(false);
            expect(effectiveExecutorOutcomeForCreditorHubPill(hub, pipe)).toBe('approved');
        });

        it('scenario 3 — debtor tamyeez naqd: immediate stop, procedure terminated', () => {
            const hub = baseDecision({ executorOutcome: 'approved' });
            const pipe = baseDecision({
                id: 'appeal_debtor_naqd',
                appealSourceDecisionId: hub.id,
                appealActor: 'debtor',
                appealMethod: 'tamyeez',
                appealStatus: 'final',
                appealResult: 'نقض القرار',
                executorOutcome: 'rejected',
            });
            expect(resolveCreditorRequestAppealGate(hub, pipe).kind).toBe('lifecycle_reset');
            expect(
                resolveCreditorDecisionEnforcementState(hub, pipe, enforcementOpts).enforced
            ).toBe(false);
            expect(isExecutorRequestAppealCycleSuperseded(hub, [hub, pipe])).toBe(true);
            expect(effectiveExecutorOutcomeForCreditorHubPill(hub, pipe)).toBe('rejected');
        });

        it('scenario 4 — debtor tamyeez rad/tasdeeq: definitive enforcement', () => {
            const hub = baseDecision({ executorOutcome: 'approved' });
            const pipe = baseDecision({
                appealActor: 'debtor',
                appealMethod: 'tamyeez',
                appealStatus: 'final',
                appealResult: 'تصديق القرار',
                executorOutcome: 'approved',
            });
            expect(resolveCreditorRequestAppealGate(hub, pipe).kind).toBe('continue');
            expect(
                resolveCreditorDecisionEnforcementState(hub, pipe, enforcementOpts).enforced
            ).toBe(true);
            expect(isExecutorRequestAppealCycleSuperseded(hub, [hub, pipe])).toBe(false);
            expect(effectiveExecutorOutcomeForCreditorHubPill(hub, pipe)).toBe('approved');
        });
    });
});
