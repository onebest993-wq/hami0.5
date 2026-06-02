import { describe, expect, it } from 'vitest';
import type { CriminalCase, CriminalDefendant, LawyerRequest } from './criminalStore';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import {
    applyInvestigationClosureFromRequest,
    applyInvestigationClosureFromStageConclusion,
    applyInvestigationPurgeAfterCassation,
    decisionAllowsInvestigationClosureAccept,
    endInvestigationTemporaryClosureOnCase,
    filterActiveInvestigationDefendants,
    filterStatementEligibleDefendants,
    filterVisibleInvestigationDefendants,
    resolveVisibleInvestigationDefendants,
    formatInvestigationPurgeDecisionDisplayTitle,
    investigationDossierIsSealed,
    investigationDossierIsTemporarilyClosed,
    investigationDossierSealMessage,
    investigationPurgeDecisionAllowsCassationAppeal,
    investigationLogsMutationBlocked,
    investigationStatementsMutationBlocked,
    normalizeInvestigationDefendantStatus,
    patchDefendantsInvestigationStatus,
    resolveInvestigationPurgeCassationContext,
    resolvePurgeCassationRestoreDefendantIds,
    resolvePurgeDecisionDefendantIds,
    reopenInvestigationDefendantsOnCase,
    shouldSealInvestigationDossierAfterPurge,
    caseAllowsDefendantSeverance,
    caseAllowsSeveranceOrDossierStrike,
    countSeveranceSelectableDefendants,
    shouldShowInvestigationDefendantScopePicker,
    validateInvestigationPurgeCassationResult,
    validateDefendantSeveranceSelection,
    validateSeveranceOrDossierStrikePartyRule,
} from './investigationDefendantPurge';
import { INVESTIGATION_CLOSURE_FINAL_TEMPLATE, INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE } from './proceduralRequestTypes';
import { PRIVATE_RIGHT_WAIVER_REQUEST_TYPE } from './criminalStageUtils';

function makeDefendant(id: string, status?: CriminalDefendant['investigationStatus']): CriminalDefendant {
    return {
        id,
        fullName: `متهم ${id}`,
        address: '',
        birthYear: '',
        status: '',
        detentionAuthority: '',
        detentionExpiryDate: '',
        detentionHistoryLog: [],
        totalDetentionDays: 0,
        investigationStatus: status,
    };
}

function makeInvestigationCase(defendants: CriminalDefendant[]): CriminalCase {
    return {
        id: 'case-1',
        createdAt: '2026-01-01',
        basics: { stage: 'مرحلة التحقيق', role: '', legalArticle: '', ourRepresentation: 'complainant_side' },
        location: { courtName: '', caseNumber: '', investigationDossierNumber: 'INV-1' },
        complainants: [],
        defendants,
        statements: [],
        timelineEvents: [],
        investigationLogs: [],
        lawyerRequests: [],
        caseStage: 'investigation',
    } as CriminalCase;
}

describe('investigationDefendantPurge', () => {
    it('defaults unknown status to active', () => {
        expect(normalizeInvestigationDefendantStatus(undefined)).toBe('active');
        expect(normalizeInvestigationDefendantStatus('referred')).toBe('referred');
    });

    it('validateDefendantSeveranceSelection rejects sharding all selectable defendants', () => {
        const d1 = makeDefendant('d1');
        const d2 = makeDefendant('d2');
        expect(validateDefendantSeveranceSelection([d1, d2], ['d1', 'd2'])).toContain(
            'لا يمكن شطر كل المتهمين',
        );
        expect(validateDefendantSeveranceSelection([d1, d2], ['d1'])).toBeNull();
    });

    it('caseAllowsDefendantSeverance requires two selectable defendants', () => {
        expect(caseAllowsDefendantSeverance([])).toBe(false);
        expect(caseAllowsDefendantSeverance([makeDefendant('d1')])).toBe(false);
        expect(
            caseAllowsDefendantSeverance([makeDefendant('d1'), makeDefendant('d2')]),
        ).toBe(true);
        expect(
            caseAllowsDefendantSeverance([
                makeDefendant('d1'),
                makeDefendant('d2', 'closed_pending'),
            ]),
        ).toBe(false);
        expect(
            countSeveranceSelectableDefendants([
                makeDefendant('d1'),
                { ...makeDefendant('d2'), isPartyRecordLocked: true },
            ]),
        ).toBe(1);
    });

    it('caseAllowsSeveranceOrDossierStrike when multiple defendants or complainants', () => {
        expect(caseAllowsSeveranceOrDossierStrike([], [makeDefendant('d1')])).toBe(false);
        expect(
            caseAllowsSeveranceOrDossierStrike(
                [{ id: 'c1', fullName: 'أ', address: '', phone: '' } as any],
                [makeDefendant('d1')],
            ),
        ).toBe(false);
        expect(caseAllowsSeveranceOrDossierStrike([], [makeDefendant('d1'), makeDefendant('d2')])).toBe(
            true,
        );
        expect(
            caseAllowsSeveranceOrDossierStrike(
                [
                    { id: 'c1', fullName: 'أ', address: '', phone: '' } as any,
                    { id: 'c2', fullName: 'ب', address: '', phone: '' } as any,
                ],
                [makeDefendant('d1')],
            ),
        ).toBe(true);
        expect(validateSeveranceOrDossierStrikePartyRule([], [makeDefendant('d1')])).toMatch(
            /أكثر من متهم أو أكثر من مشتكي/,
        );
    });

    it('filters only active defendants', () => {
        const list = [
            makeDefendant('a', 'active'),
            makeDefendant('b', 'closed_pending'),
            makeDefendant('c', 'referred'),
        ];
        expect(filterActiveInvestigationDefendants(list).map((d) => d.id)).toEqual(['a']);
    });

    it('sets closed_final and seals dossier when final closure judicial request is executed', () => {
        const base = makeInvestigationCase([makeDefendant('d1', 'active')]);
        const request: LawyerRequest = {
            id: 'req-1',
            requestDate: '2026-05-01',
            type: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
            lawyerNote: 'غلق',
            status: 'executed',
            defendantIds: ['d1'],
            proceduralTemplate: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
        };
        const next = applyInvestigationClosureFromRequest(base, request);
        expect(next.defendants?.[0]?.investigationStatus).toBe('closed_final');
        expect(next.investigationDossierClosure?.kind).toBe('final');
        expect(next.isFrozen).toBe(true);
        expect(investigationDossierSealMessage(next.investigationDossierClosure)).toBe('تم غلق الإضبارة');
    });

    it('partial final closure keeps dossier active when other defendants remain', () => {
        const base = makeInvestigationCase([makeDefendant('d1', 'active'), makeDefendant('d2', 'active')]);
        const request: LawyerRequest = {
            id: 'req-final-partial',
            requestDate: '2026-05-01',
            type: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
            lawyerNote: 'غلق نهائي لمتهم واحد',
            status: 'executed',
            defendantIds: ['d1'],
            proceduralTemplate: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
        };
        const next = applyInvestigationClosureFromRequest(base, request);
        expect(next.defendants?.find((d) => d.id === 'd1')?.investigationStatus).toBe('closed_final');
        expect(next.defendants?.find((d) => d.id === 'd2')?.investigationStatus).toBe('active');
        expect(next.investigationDossierClosure).toBeUndefined();
        expect(next.isFrozen).toBeFalsy();
        expect(filterVisibleInvestigationDefendants(next.defendants).map((d) => d.id)).toEqual(['d2']);
    });

    it('allows statements during temporary dossier freeze but blocks on final seal', () => {
        const tempFrozen = makeInvestigationCase([makeDefendant('d1', 'closed_pending')]);
        tempFrozen.isFrozen = true;
        tempFrozen.investigationDossierClosure = { kind: 'temporary', closedAt: '2026-05-01' };
        expect(investigationDossierIsSealed(tempFrozen)).toBe(true);
        expect(investigationStatementsMutationBlocked(tempFrozen)).toBe(true);

        const finalSealed = makeInvestigationCase([makeDefendant('d1', 'closed_final')]);
        finalSealed.isFrozen = true;
        finalSealed.investigationDossierClosure = { kind: 'final', closedAt: '2026-05-02' };
        expect(investigationDossierIsSealed(finalSealed)).toBe(true);
        expect(investigationStatementsMutationBlocked(finalSealed)).toBe(true);

        const active = makeInvestigationCase([makeDefendant('d1', 'active')]);
        expect(investigationDossierIsSealed(active)).toBe(false);
        expect(investigationStatementsMutationBlocked(active)).toBe(false);
    });

    it('investigationLogsMutationBlocked mirrors statements in investigation and blocks outside it', () => {
        const active = makeInvestigationCase([makeDefendant('d1', 'active')]);
        expect(investigationLogsMutationBlocked(active)).toBe(false);

        const locked = makeInvestigationCase([makeDefendant('d1', 'active')]);
        locked.isInvestigationLocked = true;
        expect(investigationLogsMutationBlocked(locked)).toBe(true);

        const trial = makeInvestigationCase([makeDefendant('d1', 'active')]);
        trial.basics = { ...trial.basics, stage: 'محكمة الجنح' };
        trial.caseStage = 'misdemeanor';
        expect(investigationLogsMutationBlocked(trial)).toBe(true);

        const archived = makeInvestigationCase([makeDefendant('d1', 'active')]);
        archived.isArchived = true;
        expect(investigationLogsMutationBlocked(archived)).toBe(true);
    });

    it('does not seal dossier when one active defendant remains after partial closure', () => {
        const base = makeInvestigationCase([
            makeDefendant('d1', 'closed_final'),
            makeDefendant('d2', 'active'),
        ]);
        expect(shouldSealInvestigationDossierAfterPurge(base)).toBe(false);
        expect(investigationDossierIsSealed(base)).toBe(false);
        expect(shouldShowInvestigationDefendantScopePicker(base.defendants)).toBe(false);
    });

    it('seals dossier only when no active defendants remain', () => {
        const allTemp = makeInvestigationCase([makeDefendant('d1', 'closed_pending')]);
        expect(shouldSealInvestigationDossierAfterPurge(allTemp)).toBe(true);
        const oneActive = makeInvestigationCase([
            makeDefendant('d1', 'closed_pending'),
            makeDefendant('d2', 'active'),
        ]);
        expect(shouldSealInvestigationDossierAfterPurge(oneActive)).toBe(false);
    });

    it('temporary closure sets closed_pending and freezes dossier when no active defendants remain', () => {
        const base = makeInvestigationCase([makeDefendant('d1', 'active')]);
        const request: LawyerRequest = {
            id: 'req-temp',
            requestDate: '2026-05-01',
            type: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            lawyerNote: 'غلق مؤقت',
            status: 'executed',
            defendantIds: ['d1'],
            proceduralTemplate: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
        };
        const next = applyInvestigationClosureFromRequest(base, request);
        expect(next.defendants?.[0]?.investigationStatus).toBe('closed_pending');
        expect(next.investigationDossierClosure?.kind).toBe('temporary');
        expect(next.isFrozen).toBe(true);
        expect(investigationDossierIsTemporarilyClosed(next.investigationDossierClosure)).toBe(true);
    });

    it('partial temporary closure keeps dossier active when other defendants remain', () => {
        const base = makeInvestigationCase([makeDefendant('d1', 'active'), makeDefendant('d2', 'active')]);
        const request: LawyerRequest = {
            id: 'req-temp-partial',
            requestDate: '2026-05-01',
            type: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            lawyerNote: 'غلق مؤقت',
            status: 'executed',
            defendantIds: ['d1'],
            proceduralTemplate: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
        };
        const next = applyInvestigationClosureFromRequest(base, request);
        expect(next.defendants?.find((d) => d.id === 'd1')?.investigationStatus).toBe('closed_pending');
        expect(next.defendants?.find((d) => d.id === 'd2')?.investigationStatus).toBe('active');
        expect(next.investigationDossierClosure).toBeUndefined();
        expect(next.isFrozen).toBeFalsy();
    });

    it('endInvestigationTemporaryClosureOnCase reopens closed_pending defendants', () => {
        const frozen = makeInvestigationCase([makeDefendant('d1', 'closed_pending')]);
        frozen.isFrozen = true;
        frozen.investigationDossierClosure = {
            kind: 'temporary',
            closedAt: '2026-05-01',
        };
        const next = endInvestigationTemporaryClosureOnCase(frozen);
        expect(next.defendants?.[0]?.investigationStatus).toBe('active');
        expect(next.investigationDossierClosure).toBeUndefined();
        expect(next.isFrozen).toBe(false);
    });

    it('severance judicial template is handled by dossier severance flow not closure purge', () => {
        const base = makeInvestigationCase([makeDefendant('d1', 'active'), makeDefendant('d2', 'active')]);
        const request: LawyerRequest = {
            id: 'req-sev',
            requestDate: '2026-05-01',
            type: 'تفريق وشطر الإضبارة (قرار قضائي)',
            lawyerNote: 'تفريق',
            status: 'executed',
            defendantIds: ['d2'],
            proceduralTemplate: 'تفريق وشطر الإضبارة (قرار قضائي)',
        };
        const next = applyInvestigationClosureFromRequest(base, request);
        expect(next.defendants?.find((d) => d.id === 'd2')?.investigationStatus).toBe('active');
        expect(next.defendants?.find((d) => d.id === 'd1')?.investigationStatus).toBe('active');
    });

    it('waiver seals dossier with waiver message', () => {
        const base = makeInvestigationCase([makeDefendant('d1', 'active')]);
        const request: LawyerRequest = {
            id: 'req-waiver',
            requestDate: '2026-05-01',
            type: PRIVATE_RIGHT_WAIVER_REQUEST_TYPE,
            lawyerNote: 'تنازل',
            status: 'executed',
            defendantIds: ['d1'],
            proceduralTemplate: PRIVATE_RIGHT_WAIVER_REQUEST_TYPE,
        };
        const next = applyInvestigationClosureFromRequest(base, request);
        expect(next.investigationDossierClosure?.kind).toBe('waiver');
        expect(investigationDossierSealMessage(next.investigationDossierClosure)).toBe(
            'تم غلق الإضبارة بسبب التنازل',
        );
    });

    it('patchDefendantsInvestigationStatus updates scoped ids only', () => {
        const base = makeInvestigationCase([makeDefendant('d1'), makeDefendant('d2')]);
        const next = patchDefendantsInvestigationStatus(base, ['d1'], 'closed_final');
        expect(next.defendants?.find((d) => d.id === 'd1')?.investigationStatus).toBe('closed_final');
        expect(
            normalizeInvestigationDefendantStatus(
                next.defendants?.find((d) => d.id === 'd2')?.investigationStatus,
            ),
        ).toBe('active');
    });

    it('hides closed_final and closed_pending from visible defendants list', () => {
        const list = [
            makeDefendant('a', 'active'),
            makeDefendant('b', 'closed_final'),
            makeDefendant('c', 'closed_pending'),
            makeDefendant('d', 'referred'),
        ];
        expect(filterVisibleInvestigationDefendants(list).map((d) => d.id)).toEqual(['a']);
    });

    it('resolveVisibleInvestigationDefendants keeps pending severance targets visible', () => {
        const list = [
            makeDefendant('a', 'active'),
            makeDefendant('b', 'closed_pending'),
        ];
        expect(
            resolveVisibleInvestigationDefendants(list, { alwaysIncludeDefendantIds: ['b'] }).map((d) => d.id),
        ).toEqual(['a', 'b']);
    });

    it('resolveInvestigationPurgeCassationContext explains purge visibility before appeal', () => {
        const decision = {
            id: 'dec-temp',
            title: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            proceduralTemplate: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            defendantIds: ['d1'],
            issuedAt: '2026-05-01',
            decisionType: 'dispositive',
            appeals: [],
            isLocked: true,
        } as JudicialDecision;
        const ctx = resolveInvestigationPurgeCassationContext(decision, () => '—');
        expect(ctx?.headline).toContain('الغلق');
        expect(ctx?.detail).toMatch(/يُخفى المتهم/);
        expect(ctx?.detail).toMatch(/التمييز/);
    });

    it('purge cassation affirmation sets closed_final; annulment reopens active and dossier', () => {
        const base = makeInvestigationCase([makeDefendant('d1', 'closed_final')]);
        base.isFrozen = true;
        base.investigationDossierClosure = { kind: 'final', closedAt: '2026-05-01' };
        const decision = {
            id: 'dec-1',
            title: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
            proceduralTemplate: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
            defendantIds: ['d1'],
            issuedAt: '2026-05-01',
            decisionType: 'preparatory',
            appeals: [],
            isLocked: true,
        } as JudicialDecision;
        const appealAffirm = { id: 'ap-1', result: 'procedural_affirmation' } as JudicialDecisionAppeal;
        const afterAffirm = applyInvestigationPurgeAfterCassation(base, decision, appealAffirm);
        expect(afterAffirm.defendants?.[0]?.investigationStatus).toBe('closed_final');

        const appealQuash = { id: 'ap-2', result: 'procedural_annulment' } as JudicialDecisionAppeal;
        const afterQuash = applyInvestigationPurgeAfterCassation(afterAffirm, decision, appealQuash);
        expect(afterQuash.defendants?.[0]?.investigationStatus).toBe('active');
        expect(afterQuash.investigationDossierClosure).toBeUndefined();
        expect(afterQuash.isFrozen).toBe(false);
    });

    it('annulment restores purged defendant to active lists and defendant pickers', () => {
        const base = makeInvestigationCase([
            makeDefendant('d1', 'closed_final'),
            makeDefendant('d2', 'active'),
        ]);
        const decision = {
            id: 'dec-partial',
            title: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
            proceduralTemplate: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
            defendantIds: ['d1'],
            issuedAt: '2026-05-01',
            decisionType: 'preparatory',
            appeals: [],
            isLocked: true,
        } as JudicialDecision;
        const appeal = {
            id: 'ap-annul',
            result: 'procedural_annulment',
            targetDefendantIds: ['d1'],
        } as JudicialDecisionAppeal;

        expect(resolvePurgeCassationRestoreDefendantIds(base, decision, appeal)).toEqual(['d1']);

        const after = applyInvestigationPurgeAfterCassation(base, decision, appeal);
        expect(after.defendants?.find((d) => d.id === 'd1')?.investigationStatus).toBe('active');
        expect(filterActiveInvestigationDefendants(after.defendants).map((d) => d.id)).toEqual(['d1', 'd2']);
        expect(filterVisibleInvestigationDefendants(after.defendants).map((d) => d.id)).toEqual(['d1', 'd2']);
        expect(filterStatementEligibleDefendants(after.defendants).map((d) => d.id)).toEqual(['d1', 'd2']);
        expect(shouldShowInvestigationDefendantScopePicker(after.defendants)).toBe(true);
    });

    it('annulment on temporary closure restores closed_pending and unseals dossier', () => {
        const base = makeInvestigationCase([makeDefendant('d1', 'closed_pending')]);
        base.isFrozen = true;
        base.investigationDossierClosure = { kind: 'temporary', closedAt: '2026-05-01' };
        const decision = {
            id: 'dec-temp',
            title: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            proceduralTemplate: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            defendantIds: ['d1'],
            issuedAt: '2026-05-01',
            decisionType: 'preparatory',
            appeals: [],
            isLocked: true,
        } as JudicialDecision;
        const appeal = {
            id: 'ap-temp-annul',
            result: 'procedural_annulment',
            targetDefendantIds: ['d1'],
        } as JudicialDecisionAppeal;
        const after = applyInvestigationPurgeAfterCassation(base, decision, appeal);
        expect(after.defendants?.[0]?.investigationStatus).toBe('active');
        expect(after.investigationDossierClosure).toBeUndefined();
        expect(after.isFrozen).toBe(false);
        expect(filterStatementEligibleDefendants(after.defendants).map((d) => d.id)).toEqual(['d1']);
    });

    it('validates purge cassation result options', () => {
        expect(validateInvestigationPurgeCassationResult('')).toMatch(/اختر/);
        expect(validateInvestigationPurgeCassationResult('procedural_affirmation')).toBeNull();
        expect(validateInvestigationPurgeCassationResult('procedural_annulment')).toBeNull();
        expect(validateInvestigationPurgeCassationResult('quash_remand')).toMatch(/غير صالحة/);
    });

    it('does not expand purge scope to all defendants when only complainant id stored', () => {
        const withComplainant = makeInvestigationCase([
            makeDefendant('def-1', 'active'),
            makeDefendant('def-2', 'active'),
        ]);
        (withComplainant as CriminalCase).complainants = [
            { id: 'comp-1', fullName: 'مشتكي', address: '', birthYear: '' },
        ];
        const decision = {
            id: 'dec-x',
            title: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
            proceduralTemplate: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
            defendantIds: ['comp-1'],
            issuedAt: '2026-05-01',
            decisionType: 'dispositive',
            appeals: [],
            isLocked: true,
        } as JudicialDecision;
        expect(resolvePurgeDecisionDefendantIds(withComplainant, decision)).toEqual([]);
        expect(decisionAllowsInvestigationClosureAccept(withComplainant, decision)).toBe(false);
    });

    it('scopes purge to explicitly selected defendant ids only', () => {
        const base = makeInvestigationCase([
            makeDefendant('def-1', 'active'),
            makeDefendant('def-2', 'active'),
        ]);
        const decision = {
            id: 'dec-y',
            title: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
            proceduralTemplate: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
            defendantIds: ['def-1'],
            issuedAt: '2026-05-01',
            decisionType: 'dispositive',
            appeals: [],
            isLocked: true,
        } as JudicialDecision;
        expect(resolvePurgeDecisionDefendantIds(base, decision)).toEqual(['def-1']);
        const after = patchDefendantsInvestigationStatus(base, ['def-1'], 'closed_final');
        expect(after.defendants?.find((d) => d.id === 'def-1')?.investigationStatus).toBe('closed_final');
        expect(after.defendants?.find((d) => d.id === 'def-2')?.investigationStatus).toBe('active');
    });

    it('strips 130 and قرار قضائي from display title', () => {
        expect(formatInvestigationPurgeDecisionDisplayTitle('غلق الدعوى مؤقتاً (مادة 130)')).toBe(
            'غلق الدعوى مؤقتاً',
        );
        expect(formatInvestigationPurgeDecisionDisplayTitle('قرار قضائي: صلح وتنازل عن الحق الشخصي')).toBe(
            'صلح/ تنازل',
        );
    });

    it('allows cassation appeal only for closure/severance purge — not waiver', () => {
        const closure = {
            title: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
            proceduralTemplate: INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
        } as JudicialDecision;
        const waiver = {
            title: PRIVATE_RIGHT_WAIVER_REQUEST_TYPE,
            proceduralTemplate: PRIVATE_RIGHT_WAIVER_REQUEST_TYPE,
        } as JudicialDecision;
        expect(investigationPurgeDecisionAllowsCassationAppeal(closure)).toBe(true);
        expect(investigationPurgeDecisionAllowsCassationAppeal(waiver)).toBe(false);
    });

    it('resolveInvestigationPurgeCassationContext describes annulment reopen', () => {
        const decision = {
            title: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            proceduralTemplate: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'complainant',
                    appellantIds: [],
                    appellantManualLabel: 'الادعاء العام',
                    cassationStatus: 'concluded',
                    result: 'procedural_annulment',
                },
            ],
        } as JudicialDecision;
        const ctx = resolveInvestigationPurgeCassationContext(decision, () => '—');
        expect(ctx?.tone).toBe('annulled');
        expect(ctx?.detail).toContain('أُعيدت الإضبارة للحياة');
    });

    it('applyInvestigationClosureFromStageConclusion mirrors lawyer-request purge semantics', () => {
        const base = makeInvestigationCase([makeDefendant('d1', 'active')]);
        const afterTemp = applyInvestigationClosureFromStageConclusion(base, {
            kind: 'temporary_closing',
            defendantIds: ['d1'],
            closedAt: '2026-05-01',
            conclusionId: 'c-temp',
            details: 'غلق مؤقت',
        });
        expect(afterTemp.defendants?.[0]?.investigationStatus).toBe('closed_pending');
        expect(afterTemp.investigationDossierClosure?.kind).toBe('temporary');
        expect(afterTemp.isFrozen).toBe(true);
        expect(afterTemp.judicialDecisions?.[0]?.proceduralTemplate).toContain('غلق');

        const afterFinal = applyInvestigationClosureFromStageConclusion(base, {
            kind: 'closing',
            defendantIds: ['d1'],
            closedAt: '2026-05-02',
            conclusionId: 'c-final',
            details: 'غلق نهائي',
        });
        expect(afterFinal.defendants?.[0]?.investigationStatus).toBe('closed_final');
        expect(afterFinal.investigationDossierClosure?.kind).toBe('final');
    });

    it('reopenInvestigationDefendantsOnCase restores closed defendants to active', () => {
        const closed = makeInvestigationCase([
            makeDefendant('d1', 'closed_final'),
            makeDefendant('d2', 'closed_pending'),
            makeDefendant('d3', 'referred'),
        ]);
        const reopened = reopenInvestigationDefendantsOnCase(closed);
        expect(reopened.defendants?.find((d) => d.id === 'd1')?.investigationStatus).toBe('active');
        expect(reopened.defendants?.find((d) => d.id === 'd2')?.investigationStatus).toBe('active');
        expect(reopened.defendants?.find((d) => d.id === 'd3')?.investigationStatus).toBe('referred');
    });
});
