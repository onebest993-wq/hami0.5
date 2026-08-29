/**
 * Pure case transforms for CriminalCase — judicial-decision ledger:
 * append/upsert/resolve of decisions derived from lawyer requests, the
 * lawyer-request outcome side-effects on parties, and detention / order
 * enforcement patches. None of these touch the Zustand store directly.
 */
import type {
    JudicialDecision,
} from '@/app/types/criminal';
import type {
    CriminalCase,
    CriminalComplainant,
    CriminalDefendant,
    DefendantStatus,
    LawyerRequest,
} from './criminalCaseModel';
import {
    resolveProceduralDefendantIds,
} from './criminalProceduralPartyUtils';
import type {
    GuarantorDetails,
} from './criminalGuarantorModel';
import {
    resolveCaseStageFromRecord,
} from './criminalStageRuntimeCore';
import {
    lawyerRequestToJudicialDecision,
    findJudicialDecisionByRef,
    mergeJudicialDecisionsFromRequests,
} from './judicialDecisionsEngine';
import {
    isLawyerRequestJudgeOrder,
    resolveInitialLawyerOrderAppealability,
} from './requestActionEngine';
import {
    applyInvestigationClosureFromRequest,
} from './investigationDefendantPurge';
import {
    applyJuvenileSocialInquiryReferralOnDefendants,
    investigationJuvenileDetentionAuthorityLabel,
    JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
    JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE,
    SOCIAL_INQUIRY_REFERRAL_TEMPLATE,
    syncJuvenileInvestigationCaseFlags,
} from './juvenileInvestigationRules';
import {
    normalizeOrderEnforcementTracking,
} from './orderEnforcementEngine';
import type {
    OrderEnforcementTracking,
} from '@/app/types/criminal';
import {
    isComplaintCourtReferralTemplate,
    isDefendantBailTemplate,
    isDetentionDecisionTemplate,
    isJudicialDefendantStatusDocumentationOnly,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';
import {
    applyComplaintCourtReferralToCase,
} from './complaintCourtReferralEngine';
import {
    persistSealedJudicialDecisionOnCase as persistSealedJudicialDecisionOnCaseCore,
} from './criminalJudicialDecisionSeal';
import {
    requiresDetentionAuthority,
    requiresDetentionExpiryDate,
} from './caseTransformShared';

export function filterOutJudicialDecisionsForRequest(
    decisions: JudicialDecision[] | undefined,
    requestId: string,
): JudicialDecision[] {
    const rid = String(requestId ?? '').trim();
    if (!rid) return Array.isArray(decisions) ? decisions : [];
    return (Array.isArray(decisions) ? decisions : []).filter((d) => {
        const src = String(d.sourceRequestId ?? '').trim();
        return src !== rid && d.id !== rid && d.id !== `jd_${rid}`;
    });
}

export function appendJudicialDecisionOnCase(caseRecord: CriminalCase, decision: JudicialDecision): CriminalCase {
    const list = Array.isArray(caseRecord.judicialDecisions) ? caseRecord.judicialDecisions : [];
    const key = decision.sourceRequestId ?? decision.id;
    if (list.some((d) => (d.sourceRequestId ?? d.id) === key || d.id === decision.id)) {
        return caseRecord;
    }
    return { ...caseRecord, judicialDecisions: [...list, decision] };
}

export function upsertJudicialDecisionOnCase(caseRecord: CriminalCase, request: LawyerRequest): CriminalCase {
    const jd = lawyerRequestToJudicialDecision(request);
    if (!jd) return caseRecord;
    const list = Array.isArray(caseRecord.judicialDecisions) ? caseRecord.judicialDecisions : [];
    const key = jd.sourceRequestId ?? jd.id;
    const idx = list.findIndex((d) => (d.sourceRequestId ?? d.id) === key || d.id === jd.id);
    const filedAppeals = idx >= 0
        ? (list[idx]!.appeals ?? []).filter((a) => String(a.filedAt ?? '').trim())
        : [];
    const caseStage = resolveCaseStageFromRecord(caseRecord);
    const storedAppealability = idx >= 0 ? list[idx]!.decisionAppealability : undefined;
    const defaultAppealability =
        isLawyerRequestJudgeOrder(jd) && !storedAppealability
            ? resolveInitialLawyerOrderAppealability(caseStage)
            : storedAppealability;
    const nextDecision =
        idx >= 0
            ? {
                  ...jd,
                  proceduralNodeId: list[idx]!.proceduralNodeId ?? jd.proceduralNodeId,
                  appeals: filedAppeals,
                  decisionAppealability: storedAppealability ?? defaultAppealability,
              }
            : {
                  ...jd,
                  decisionAppealability: defaultAppealability,
              };
    const nextList = idx >= 0 ? list.map((d, i) => (i === idx ? nextDecision : d)) : [...list, nextDecision];
    return { ...caseRecord, judicialDecisions: nextList };
}

export function resolveJudicialDecisionsForCase(caseRecord: CriminalCase): JudicialDecision[] {
    return mergeJudicialDecisionsFromRequests(caseRecord.judicialDecisions, caseRecord.lawyerRequests);
}

/** آثار الموافقة/الرفض/القرار النافذ على أطراف القضية والسجل القضائي. */
