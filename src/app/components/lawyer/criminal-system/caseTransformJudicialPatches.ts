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
import { resolveJudicialDecisionsForCase } from './caseTransformJudicialList';

export function resolveDecisionPartyIds(decision: JudicialDecision, caseRecord: CriminalCase): string[] {
    const raw = (decision.defendantIds ?? decision.beneficiaryPartyIds ?? []).map((x) =>
        String(x ?? '').trim(),
    ).filter(Boolean);
    return resolveProceduralDefendantIds(
        Array.isArray(caseRecord.complainants) ? caseRecord.complainants : [],
        Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [],
        raw,
        caseRecord.isMutualComplaint === true,
    );
}

function findStoredJudicialDecisionIndex(list: JudicialDecision[], decisionId: string): number {
    const key = String(decisionId ?? '').trim();
    if (!key) return -1;
    let idx = list.findIndex((d) => d.id === key);
    if (idx >= 0) return idx;
    const reqKey = key.startsWith('jd_') ? key.slice(3) : '';
    if (reqKey) {
        idx = list.findIndex((d) => d.sourceRequestId === reqKey || d.id === `jd_${reqKey}`);
        if (idx >= 0) return idx;
    }
    return -1;
}

export function patchDetentionDecisionOnCase(
    caseRecord: CriminalCase,
    decisionId: string,
    patch: { detentionEndDate?: string; detentionReleasedAt?: string },
    fallback?: JudicialDecision,
): CriminalCase | null {
    const list = Array.isArray(caseRecord.judicialDecisions) ? [...caseRecord.judicialDecisions] : [];
    let idx = findStoredJudicialDecisionIndex(list, decisionId);
    let prior = idx >= 0 ? list[idx]! : fallback;
    if (!prior) return null;
    if (idx < 0) {
        list.push({ ...prior, isLocked: prior.isLocked ?? true });
        idx = list.length - 1;
    }
    const nextDecision: JudicialDecision = {
        ...prior,
        detentionEndDate:
            patch.detentionEndDate !== undefined
                ? patch.detentionEndDate
                : prior.detentionEndDate,
        detentionReleasedAt:
            patch.detentionReleasedAt !== undefined
                ? patch.detentionReleasedAt
                : prior.detentionReleasedAt,
    };
    const nextList = list.map((d, i) => (i === idx ? nextDecision : d));
    let nextCase: CriminalCase = { ...caseRecord, judicialDecisions: nextList };
    const reqId = String(prior.sourceRequestId ?? '').trim();
    if (reqId) {
        const reqs = Array.isArray(nextCase.lawyerRequests) ? [...nextCase.lawyerRequests] : [];
        const rIdx = reqs.findIndex((r) => r.id === reqId);
        if (rIdx >= 0) {
            const req = reqs[rIdx]!;
            reqs[rIdx] = {
                ...req,
                detentionEndDate: nextDecision.detentionEndDate ?? req.detentionEndDate,
            };
            nextCase = { ...nextCase, lawyerRequests: reqs };
        }
    }
    return nextCase;
}

export function patchOrderEnforcementOnCase(
    caseRecord: CriminalCase,
    decisionId: string,
    patch: Partial<OrderEnforcementTracking>,
    fallback?: JudicialDecision,
): CriminalCase | null {
    const merged = resolveJudicialDecisionsForCase(caseRecord);
    const hit =
        findJudicialDecisionByRef(merged, decisionId) ??
        fallback ??
        merged.find((d) => d.id === decisionId || d.sourceRequestId === decisionId);
    if (!hit) return null;
    const priorTracking = normalizeOrderEnforcementTracking(hit.orderEnforcement) ?? {};
    const nextTracking = normalizeOrderEnforcementTracking({ ...priorTracking, ...patch });
    const legalArticleBasis =
        String(patch.legalArticleBasis ?? hit.legalArticleBasis ?? nextTracking?.legalArticleBasis ?? '').trim() ||
        undefined;
    const nextDecision: JudicialDecision = {
        ...hit,
        orderEnforcement: nextTracking,
        legalArticleBasis,
    };
    let nextCase = persistSealedJudicialDecisionOnCase(caseRecord, nextDecision);
    const reqId = String(hit.sourceRequestId ?? '').trim();
    if (reqId) {
        const reqs = Array.isArray(nextCase.lawyerRequests) ? [...nextCase.lawyerRequests] : [];
        const rIdx = reqs.findIndex((r) => r.id === reqId);
        if (rIdx >= 0) {
            reqs[rIdx] = {
                ...reqs[rIdx]!,
                orderEnforcement: nextTracking,
                legalArticleBasis,
            };
            nextCase = { ...nextCase, lawyerRequests: reqs };
        }
    }
    const partyIds = (hit.defendantIds ?? hit.beneficiaryPartyIds ?? [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (partyIds.length && nextTracking) {
        const defs = Array.isArray(nextCase.defendants) ? [...nextCase.defendants] : [];
        nextCase = {
            ...nextCase,
            defendants: defs.map((d) => {
                if (!partyIds.includes(d.id)) return d;
                if (nextTracking.kind === 'summons' && nextTracking.attendanceStatus === 'attended') {
                    return d.status === 'حر' || d.status === 'هارب' ? { ...d, status: 'مستقدم' as DefendantStatus } : d;
                }
                if (nextTracking.kind === 'arrest' && nextTracking.arrestExecuted === 'executed') {
                    if (nextTracking.postArrestOutcome === 'detained') {
                        const nextDef = { ...d, status: 'ملقى القبض عليه' as DefendantStatus };
                        if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                        return nextDef;
                    }
                    if (nextTracking.postArrestOutcome === 'bailed') {
                        const nextDef = { ...d, status: 'bailed_pending_appeal' as DefendantStatus };
                        if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                        if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                        return nextDef;
                    }
                }
                return d;
            }),
        };
    }
    return nextCase;
}

export function persistSealedJudicialDecisionOnCase(
    caseRecord: CriminalCase,
    mergedDecision: JudicialDecision,
): CriminalCase {
    return persistSealedJudicialDecisionOnCaseCore(caseRecord, mergedDecision);
}

