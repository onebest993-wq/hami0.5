import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import { buildDefaultAppealFieldsForNewDecision } from './decisionAppealPeriodEngine';
import { resolveProceedingsBlockAppealability } from './requestActionEngine';
import { normalizeDashboardCassationStage } from './stageCassationActionGates';
import type { TrialSession, TrialSessionPreparatoryDecisionInput } from './trialSessionsEngine';

export function buildTrialSessionPreparatoryJudicialDecision(
    session: Pick<TrialSession, 'id' | 'date' | 'sessionNumber'>,
    input: TrialSessionPreparatoryDecisionInput,
    caseStage: CaseStage,
    proceduralNodeId?: string,
): JudicialDecision {
    const title = String(input.title ?? '').trim();
    const details = String(input.details ?? '').trim();
    const appealability = resolveProceedingsBlockAppealability(input.isBlockingSuit === true);
    const base: JudicialDecision = {
        id: `jd_trial_prep_${session.id}_${Date.now()}`,
        issuedAt: String(session.date ?? '').trim() || new Date().toISOString().slice(0, 10),
        title,
        summary: details,
        decisionType: 'preparatory',
        appeals: [],
        isLocked: true,
        decisionAppealability: appealability,
        proceduralTemplate: `trial_session_prep_${String(session.sessionNumber ?? '').trim() || session.id}`,
        proceduralNodeId: proceduralNodeId || undefined,
        isAppealable: input.isBlockingSuit === true,
    };
    const defaults = buildDefaultAppealFieldsForNewDecision(base, { caseStage });
    return { ...base, ...defaults, decisionAppealability: appealability };
}

/** شارة عند إغلاق الطعن المنفرد — قرار إعدادي. */
export function resolveTrialPreparatoryNonAppealableBadge(
    decision: JudicialDecision | null | undefined,
): string | null {
    if (!decision) return null;
    if (decision.decisionAppealability === 'غير قابل للطعن على انفراد') {
        return 'قرار إعدادي لا يطعن عليه منفرداً';
    }
    return null;
}

export function shouldShowTrialPreparatoryAppealActions(
    decision: JudicialDecision | null | undefined,
    caseStage?: CaseStage,
): boolean {
    if (!decision) return false;
    const badge = resolveTrialPreparatoryNonAppealableBadge(decision);
    if (badge) return false;
    const dashboard = normalizeDashboardCassationStage(caseStage);
    return dashboard === 'misdemeanor' || dashboard === 'felony' || dashboard === 'investigation';
}

export function resolveLinkedTrialPreparatoryDecision(
    session: TrialSession,
    decisions: JudicialDecision[] | undefined,
): JudicialDecision | null {
    const ref = String(session.preparatoryDecision?.judicialDecisionId ?? '').trim();
    if (!ref || !decisions?.length) return null;
    return decisions.find((d) => d.id === ref) ?? null;
}
