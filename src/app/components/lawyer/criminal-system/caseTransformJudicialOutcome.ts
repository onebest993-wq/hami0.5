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
export function applyLawyerRequestOutcomeOnCase(caseRecord: CriminalCase, request: LawyerRequest): CriminalCase {
    const isBailApproval =
        request.status === 'approved' && /كفالة|إخلاء سبيل بكفالة/i.test(String(request.type ?? ''));
    const templateKey = normalizeProceduralRequestTemplate(
        String(request.proceduralTemplate ?? request.type ?? '').trim(),
    );
    const isJuvenileObservationBinding =
        (request.status === 'approved' || request.status === 'executed') &&
        templateKey === JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE;
    const isJuvenileProvisionalDelivery =
        (request.status === 'approved' || request.status === 'executed') &&
        templateKey === JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE;
    /** توقيف قضائي = توثيق في السجل للمتهم؛ يبقى التحديث عبر بطاقة التوقيف أو accused* للمتقابل. */
    const isJudicialDefendantDocumentationOnly = isJudicialDefendantStatusDocumentationOnly(
        request.proceduralTemplate ?? request.type,
    );
    const isDetentionBinding =
        (request.status === 'approved' || request.status === 'executed') &&
        (isDetentionDecisionTemplate(request.proceduralTemplate ?? request.type) ||
            isJuvenileObservationBinding);
    const isDefendantBailDecision =
        request.status === 'executed' &&
        isDefendantBailTemplate(request.proceduralTemplate ?? request.type);
    const bindsPartyAccusedStatus =
        isBailApproval ||
        isDetentionBinding ||
        isDefendantBailDecision ||
        isJuvenileProvisionalDelivery;
    const detentionEndApproved = String(request.detentionEndDate ?? '').trim();
    const rawIds = Array.isArray(request.defendantIds) ? request.defendantIds : [];
    const partyIds = rawIds.map((x) => String(x ?? '').trim()).filter(Boolean);
    const defendantIds = resolveProceduralDefendantIds(
        Array.isArray(caseRecord.complainants) ? caseRecord.complainants : [],
        Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [],
        partyIds,
        caseRecord.isMutualComplaint === true,
    );
    const bailGuarantorDetails: GuarantorDetails | undefined = (() => {
        if (!isDefendantBailDecision) return undefined;
        const b = request.defendantBail;
        if (!b) return undefined;
        if (b.kind === 'financial') {
            const amt = String(b.bailAmount ?? '').trim();
            if (!amt) return undefined;
            return {
                bailAmount: amt,
                guarantorInfo: '',
                kind: 'financial',
            };
        }
        if (b.kind === 'personal') {
            const list = Array.isArray(b.guarantors) ? b.guarantors : [];
            const guarantors = list
                .map((g, i) => ({
                    id: String(g?.id ?? '').trim() || `g_${Date.now()}_${i}`,
                    fullName: String(g?.fullName ?? '').trim(),
                }))
                .filter((g) => g.fullName.length > 0);
            if (guarantors.length === 0) return undefined;
            const summary = guarantors.map((g) => g.fullName).join(' • ');
            return {
                bailAmount: '',
                guarantorInfo: summary,
                kind: 'personal',
                guarantors,
            };
        }
        return undefined;
    })();
    const nextDefendants =
        bindsPartyAccusedStatus &&
        !isJudicialDefendantDocumentationOnly &&
        defendantIds.length
            ? (Array.isArray(caseRecord.defendants) ? caseRecord.defendants : []).map((d) => {
                  if (!defendantIds.includes(d.id)) return d;
                  if (isJuvenileProvisionalDelivery) {
                      const nextDef: CriminalDefendant = {
                          ...d,
                          status: 'مكفل' as DefendantStatus,
                      };
                      if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                      if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                      return nextDef;
                  }
                  if (isDefendantBailDecision) {
                      const nextDef = {
                          ...d,
                          status: 'مكفل' as DefendantStatus,
                          guarantorDetails: bailGuarantorDetails ?? d.guarantorDetails,
                      };
                      if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                      if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                      return nextDef;
                  }
                  if (isBailApproval) {
                      const nextDef = { ...d, status: 'bailed_pending_appeal' as DefendantStatus };
                      if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                      if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                      return nextDef;
                  }
                  if (Boolean((d as CriminalDefendant).isJuvenile)) {
                      const nextDef: CriminalDefendant = {
                          ...d,
                          status: 'juvenile_detention' as DefendantStatus,
                          detentionAuthority: investigationJuvenileDetentionAuthorityLabel(),
                          detentionExpiryDate: detentionEndApproved || d.detentionExpiryDate,
                      };
                      return nextDef;
                  }
                  const nextDef = {
                      ...d,
                      status: 'موقوف' as DefendantStatus,
                      detentionExpiryDate: detentionEndApproved || d.detentionExpiryDate,
                  };
                  return nextDef;
              })
            : caseRecord.defendants;
    /**
     * ⚖️ مَسار مُوازٍ لِلمشتكي المتقابل: عند صُدور قَرار كفالة/توقيف/إخلاء سبيل
     * بحقّ مشتكٍ يَكتسب صفة المتهم (isCrossComplaint per-party أو isMutualComplaint
     * case-level)، نُحدّث حقوله الفرعية `accused*` بشَكلٍ مُماثل للمتهم — دون نَقل
     * كائنه إلى مَصفوفة `defendants`. الـ gate صَريم:
     *   - المعرّف يَجب أن يَكون في `partyIds` (المُخرَج من نِيّة المُستخدم).
     *   - المشتكي يَجب أن يَكون مُتقابلاً فِعلاً (case-level أو per-party).
     * يَمنع التَسريب: في الدعاوى غير المتقابلة لا يُلامس حقل واحد من حقول المشتكي.
     */
    const partyIdSet = new Set(partyIds);
    const nextComplainants = bindsPartyAccusedStatus && partyIdSet.size
            ? (Array.isArray(caseRecord.complainants) ? caseRecord.complainants : []).map((c) => {
                  if (!partyIdSet.has(c.id)) return c;
                  const isAccused =
                      caseRecord.isMutualComplaint === true || c.isCrossComplaint === true;
                  if (!isAccused) return c;
                  if (isDefendantBailDecision) {
                      const nextC: CriminalComplainant = {
                          ...c,
                          accusedStatus: 'مكفل' as DefendantStatus,
                          accusedGuarantorDetails:
                              bailGuarantorDetails ?? c.accusedGuarantorDetails,
                      };
                      if (!requiresDetentionAuthority(nextC.accusedStatus ?? '')) {
                          nextC.accusedDetentionAuthority = '';
                      }
                      if (!requiresDetentionExpiryDate(nextC.accusedStatus ?? '')) {
                          nextC.accusedDetentionExpiryDate = '';
                      }
                      return nextC;
                  }
                  if (isBailApproval) {
                      const nextC: CriminalComplainant = {
                          ...c,
                          accusedStatus: 'bailed_pending_appeal' as DefendantStatus,
                      };
                      if (!requiresDetentionAuthority(nextC.accusedStatus ?? '')) {
                          nextC.accusedDetentionAuthority = '';
                      }
                      if (!requiresDetentionExpiryDate(nextC.accusedStatus ?? '')) {
                          nextC.accusedDetentionExpiryDate = '';
                      }
                      return nextC;
                  }
                  if (isJuvenileProvisionalDelivery) {
                      const nextC: CriminalComplainant = {
                          ...c,
                          accusedStatus: 'مكفل' as DefendantStatus,
                      };
                      if (!requiresDetentionAuthority(nextC.accusedStatus ?? '')) {
                          nextC.accusedDetentionAuthority = '';
                      }
                      if (!requiresDetentionExpiryDate(nextC.accusedStatus ?? '')) {
                          nextC.accusedDetentionExpiryDate = '';
                      }
                      return nextC;
                  }
                  if (Boolean((c as CriminalComplainant).isJuvenile)) {
                      const nextC: CriminalComplainant = {
                          ...c,
                          accusedStatus: 'juvenile_detention' as DefendantStatus,
                          accusedDetentionAuthority: investigationJuvenileDetentionAuthorityLabel(),
                          accusedDetentionExpiryDate:
                              detentionEndApproved || c.accusedDetentionExpiryDate,
                      };
                      return nextC;
                  }
                  const nextC: CriminalComplainant = {
                      ...c,
                      accusedStatus: 'موقوف' as DefendantStatus,
                      accusedDetentionExpiryDate:
                          detentionEndApproved || c.accusedDetentionExpiryDate,
                  };
                  return nextC;
              })
            : caseRecord.complainants;
    let nextCase: CriminalCase = {
        ...caseRecord,
        defendants: nextDefendants,
        complainants: nextComplainants,
    };
    if (lawyerRequestToJudicialDecision(request)) {
        nextCase = upsertJudicialDecisionOnCase(nextCase, request);
    }
    nextCase = applyInvestigationClosureFromRequest(nextCase, request);
    const referredCourt = String(request.referredCourtName ?? '').trim();
    if (
        (request.status === 'executed' || request.status === 'approved') &&
        isComplaintCourtReferralTemplate(request.proceduralTemplate ?? request.type) &&
        referredCourt
    ) {
        nextCase = applyComplaintCourtReferralToCase(nextCase, referredCourt, request.id);
    }
    if (
        (request.status === 'executed' || request.status === 'approved') &&
        templateKey === SOCIAL_INQUIRY_REFERRAL_TEMPLATE &&
        defendantIds.length
    ) {
        nextCase = {
            ...nextCase,
            defendants: applyJuvenileSocialInquiryReferralOnDefendants(
                Array.isArray(nextCase.defendants) ? nextCase.defendants : [],
                defendantIds,
            ),
        };
    }
    return syncJuvenileInvestigationCaseFlags(nextCase);
}

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

export function findStoredJudicialDecisionIndex(list: JudicialDecision[], decisionId: string): number {
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
