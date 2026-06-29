import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import type { CriminalCase, LawyerRequest } from './criminalCaseModel';
import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import { classifyDecisionLedgerKind } from './decisionsLedgerVisuals';
import { decisionAlreadyHasCassationAppeal } from './judicialDecisionsEngine';
import { shouldShowCassationAppealFileAction } from './decisionAppealPeriodEngine';
import {
    isInvestigationPurgeDecisionTemplate,
    investigationPurgeDecisionAllowsCassationAppeal,
    isInvestigationStructuralCassationTemplate,
} from './investigationDefendantPurge';
import type { InvestigationDefendantsPartyMix } from './juvenileInvestigationRules';
import {
    isDecisionCassationAppealable,
    isInvestigationSharedOrderTemplate,
    isJuvenileExclusiveInvestigationPurgeTemplate,
    isJuvenileJudgeDecisionTemplate,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';

export type DecisionsLedgerKindFilter =
    | 'all'
    | 'judicial'
    | 'juvenile_judicial'
    | 'trial_sessions'
    | 'lawyer_motion';

function isJuvenileJudicialLedgerDecision(
    decision: JudicialDecision,
    partyMix?: InvestigationDefendantsPartyMix,
): boolean {
    const tpl = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (isJuvenileJudgeDecisionTemplate(tpl)) return true;
    if (partyMix === 'juveniles_only' && isInvestigationSharedOrderTemplate(tpl)) return true;
    return partyMix === 'juveniles_only' && isJuvenileExclusiveInvestigationPurgeTemplate(tpl);
}

/** فلتر Pill Tabs — يحافظ على ترتيب الإدخال. */
export function applyDecisionsLedgerKindFilter(
    decisions: JudicialDecision[],
    filter: DecisionsLedgerKindFilter | undefined,
    partyMix?: InvestigationDefendantsPartyMix,
): JudicialDecision[] {
    if (!filter || filter === 'all') return decisions;
    if (filter === 'lawyer_motion') {
        return decisions.filter((d) => classifyDecisionLedgerKind(d) === 'lawyer_motion');
    }
    if (filter === 'trial_sessions') {
        return [];
    }
    if (filter === 'juvenile_judicial') {
        return decisions.filter((d) => {
            if (classifyDecisionLedgerKind(d) === 'lawyer_motion') return false;
            return isJuvenileJudicialLedgerDecision(d, partyMix);
        });
    }
    if (filter === 'judicial') {
        return decisions.filter((d) => {
            if (classifyDecisionLedgerKind(d) === 'lawyer_motion') return false;
            return !isJuvenileJudicialLedgerDecision(d, partyMix);
        });
    }
    return decisions;
}

export function resolveLinkedLawyerRequest(
    decision: JudicialDecision,
    lawyerRequests: LawyerRequest[] | undefined,
): LawyerRequest | undefined {
    const rid = String(decision.sourceRequestId ?? '').trim();
    if (!rid || !lawyerRequests?.length) return undefined;
    return lawyerRequests.find((r) => r.id === rid);
}

export function resolveLedgerPurgeAppealFlags(
    decision: JudicialDecision,
    investigationPurgeCase: CriminalCase | undefined,
): { isPurgeDecision: boolean; isPurgeAppealable: boolean } {
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    const isPurgeDecision = Boolean(investigationPurgeCase) && isInvestigationStructuralCassationTemplate(template);
    const isPurgeAppealable = isPurgeDecision && investigationPurgeDecisionAllowsCassationAppeal(decision);
    return { isPurgeDecision, isPurgeAppealable };
}

/** readOnly فعلي — إضبارة مختومة تبقى قابلة للتمييز على قرار الغلق/الصلح فقط. */
export function resolveLedgerEffectiveReadOnly(input: {
    readOnly?: boolean;
    investigationDossierSealed?: boolean;
    isPurgeAppealable: boolean;
}): boolean {
    return Boolean(input.readOnly || (input.investigationDossierSealed && !input.isPurgeAppealable));
}

export function resolveShowCassationAppealButton(
    decision: JudicialDecision,
    readOnly: boolean | undefined,
    investigationPurgeCase: CriminalCase | undefined,
    appealContext?: {
        caseStage?: CaseStage;
        decisionRecordStage?: CaseStage;
        crimeTypeLabel?: string;
        userRole?: CriminalCaseUserRole;
    },
): boolean {
    if (readOnly || decisionAlreadyHasCassationAppeal(decision)) return false;
    const { isPurgeAppealable } = resolveLedgerPurgeAppealFlags(decision, investigationPurgeCase);
    if (isPurgeAppealable) {
        return investigationPurgeDecisionAllowsCassationAppeal(decision);
    }
    if (!isDecisionCassationAppealable(decision)) return false;
    return shouldShowCassationAppealFileAction(decision, { ...appealContext, readOnly });
}

export function resolveDecisionsLedgerEmptyLabel(
    kindFilter: DecisionsLedgerKindFilter | undefined,
): string {
    if (kindFilter === 'trial_sessions') {
        return 'لا توجد جلسات مرافعة مسجّلة';
    }
    if (kindFilter === 'lawyer_motion') {
        return 'لا توجد طلبات محامٍ مطابقة للفلتر';
    }
    if (kindFilter === 'juvenile_judicial') {
        return 'لا توجد قرارات قاضي أحداث موثّقة حتى الآن';
    }
    if (kindFilter === 'judicial') {
        return 'لا توجد قرارات قاضي موثّقة حتى الآن';
    }
    return 'لا توجد قرارات موثقة حتى الآن';
}
