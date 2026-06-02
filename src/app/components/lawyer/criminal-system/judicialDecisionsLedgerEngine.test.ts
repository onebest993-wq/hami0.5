import { describe, expect, it } from 'vitest';
import type { JudicialDecision } from '@/app/types/criminal';
import type { CriminalCase, LawyerRequest } from './criminalStore';
import {
    applyDecisionsLedgerKindFilter,
    resolveDecisionsLedgerEmptyLabel,
    resolveLedgerEffectiveReadOnly,
    resolveLedgerPurgeAppealFlags,
    resolveLinkedLawyerRequest,
    resolveShowCassationAppealButton,
} from './judicialDecisionsLedgerEngine';
import {
    CUSTOM_LAWYER_MOTION_TYPE,
    DETENTION_DECISION_TEMPLATE,
    INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
    JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
} from './proceduralRequestTypes';

function decision(
    overrides: Partial<JudicialDecision> & { title: string; proceduralTemplate?: string },
): JudicialDecision {
    return {
        id: overrides.id ?? 'd1',
        issuedAt: overrides.issuedAt ?? '2026-05-25',
        title: overrides.title,
        summary: overrides.summary ?? '',
        decisionType: overrides.decisionType ?? 'preparatory',
        appeals: overrides.appeals ?? [],
        isLocked: overrides.isLocked ?? false,
        defendantIds: overrides.defendantIds,
        proceduralTemplate: overrides.proceduralTemplate,
        sourceRequestId: overrides.sourceRequestId,
    } as JudicialDecision;
}

function investigationCase(): CriminalCase {
    return {
        id: 'case-1',
        caseStage: 'investigation',
        isFrozen: true,
        investigationDossierClosure: { kind: 'temporary', closedAt: '2026-05-01' },
        defendants: [
            {
                id: 'd1',
                fullName: 'متهم',
                address: '',
                birthYear: '',
                status: '',
                detentionAuthority: '',
                detentionExpiryDate: '',
                detentionHistoryLog: [],
                totalDetentionDays: 0,
                investigationStatus: 'closed_pending',
            },
        ],
    } as CriminalCase;
}

describe('judicialDecisionsLedgerEngine', () => {
    it('applyDecisionsLedgerKindFilter keeps lawyer motions only', () => {
        const rows = [
            decision({ title: DETENTION_DECISION_TEMPLATE, proceduralTemplate: DETENTION_DECISION_TEMPLATE }),
            decision({ title: CUSTOM_LAWYER_MOTION_TYPE, proceduralTemplate: CUSTOM_LAWYER_MOTION_TYPE }),
        ];
        const filtered = applyDecisionsLedgerKindFilter(rows, 'lawyer_motion');
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.title).toBe(CUSTOM_LAWYER_MOTION_TYPE);
    });

    it('applyDecisionsLedgerKindFilter splits investigation judicial tabs', () => {
        const rows = [
            decision({ title: DETENTION_DECISION_TEMPLATE, proceduralTemplate: DETENTION_DECISION_TEMPLATE }),
            decision({
                title: JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
                proceduralTemplate: JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
            }),
        ];
        expect(applyDecisionsLedgerKindFilter(rows, 'judicial')).toHaveLength(1);
        expect(applyDecisionsLedgerKindFilter(rows, 'juvenile_judicial')).toHaveLength(1);
    });

    it('juveniles_only: purge templates appear under juvenile_judicial ledger tab', () => {
        const rows = [
            decision({
                title: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
                proceduralTemplate: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            }),
        ];
        expect(applyDecisionsLedgerKindFilter(rows, 'judicial', 'adults_only')).toHaveLength(1);
        expect(applyDecisionsLedgerKindFilter(rows, 'juvenile_judicial', 'adults_only')).toHaveLength(0);
        expect(applyDecisionsLedgerKindFilter(rows, 'juvenile_judicial', 'juveniles_only')).toHaveLength(1);
        expect(applyDecisionsLedgerKindFilter(rows, 'judicial', 'juveniles_only')).toHaveLength(0);
    });

    it('resolveLinkedLawyerRequest matches sourceRequestId', () => {
        const req: LawyerRequest = {
            id: 'req-1',
            requestDate: '2026-05-01',
            type: DETENTION_DECISION_TEMPLATE,
            lawyerNote: 'توقيف',
            status: 'executed',
        };
        const linked = resolveLinkedLawyerRequest(
            decision({
                title: DETENTION_DECISION_TEMPLATE,
                sourceRequestId: 'req-1',
            }),
            [req],
        );
        expect(linked?.id).toBe('req-1');
    });

    it('resolveLedgerEffectiveReadOnly blocks sealed dossier except purge-appealable cards', () => {
        const purgeDecision = decision({
            title: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            proceduralTemplate: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            isLocked: true,
        });
        const { isPurgeAppealable } = resolveLedgerPurgeAppealFlags(purgeDecision, investigationCase());
        expect(isPurgeAppealable).toBe(true);
        expect(
            resolveLedgerEffectiveReadOnly({
                readOnly: false,
                investigationDossierSealed: true,
                isPurgeAppealable,
            }),
        ).toBe(false);
        expect(
            resolveLedgerEffectiveReadOnly({
                readOnly: false,
                investigationDossierSealed: true,
                isPurgeAppealable: false,
            }),
        ).toBe(true);
    });

    it('resolveShowCassationAppealButton allows purge appeal on sealed investigation dossier', () => {
        const purgeDecision = decision({
            title: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            proceduralTemplate: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            isLocked: true,
        });
        expect(
            resolveShowCassationAppealButton(purgeDecision, false, investigationCase(), {
                caseStage: 'investigation',
            }),
        ).toBe(true);
    });

    it('resolveShowCassationAppealButton hides when readOnly or appeal already filed', () => {
        const detention = decision({
            title: DETENTION_DECISION_TEMPLATE,
            proceduralTemplate: DETENTION_DECISION_TEMPLATE,
            appeals: [{ id: 'a1', filedAt: '2026-05-02', cassationStatus: 'pending' }],
        });
        expect(resolveShowCassationAppealButton(detention, true, investigationCase())).toBe(false);
        expect(resolveShowCassationAppealButton(detention, false, investigationCase())).toBe(false);
    });

    it('resolveDecisionsLedgerEmptyLabel returns filter-specific copy', () => {
        expect(resolveDecisionsLedgerEmptyLabel('trial_sessions')).toMatch(/جلسات مرافعة/);
        expect(resolveDecisionsLedgerEmptyLabel('lawyer_motion')).toMatch(/طلبات محامٍ/);
        expect(resolveDecisionsLedgerEmptyLabel(undefined)).toMatch(/لا توجد قرارات موثقة/);
    });
});
