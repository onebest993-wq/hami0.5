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
import { upsertJudicialDecisionOnCase } from './caseTransformJudicialList';

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

