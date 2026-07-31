import { useMemo } from 'react';
import type { CriminalDefendant } from './criminalStore';
import {
    isComplaintCourtReferralTemplate,
    isCustomJudicialTemplate,
    isCustomLawyerMotionTemplate,
    isJudicialDecisionTemplate,
    isOrderEnforcementTemplate,
} from './proceduralRequestTypes';
import { requiresLegalArticleBasis } from './orderEnforcementEngine';
import { resolveEffectiveDefendantScopeIds } from './partyPersonalStage';
import { isTimelineNextDateInvalid } from './criminalStageRuntimeCore';
import type { CriminalRequestsOrchestratorSlice } from './orchestrators/criminalOrchestratorSliceTypes';

export type CriminalRequestFormFlagsParams = Pick<
    CriminalRequestsOrchestratorSlice,
    | 'reqStatus'
    | 'reqDate'
    | 'reqDecisionDate'
    | 'reqTypeTemplate'
    | 'reqEntryLane'
    | 'reqNote'
    | 'reqCustomTypeName'
    | 'reqDefendantIds'
    | 'reqLegalArticleBasis'
    | 'reqReferredCourtName'
    | 'reqJudgeMargin'
> & {
    reqNeedsPurgeDefendantScope: boolean;
    defendants: CriminalDefendant[];
    reqIsAssetSeizureEntry: boolean;
    showRequestPartySection: boolean;
    effectiveRequestPartyIds: string[];
    detentionRangeValid: boolean;
    bailFormValid: boolean;
    assetSeizureFormValid: boolean;
};

/**
 * أعلام/تحقّقات نموذج الطلب المشتقّة من القالب المختار (قضائي/محامي، تنفيذ
 * أمر، إحالة شكوى...)، إضافة إلى صلاحية النموذج الأساسية والنهائية (بعد قفل
 * القرار بهامش القاضي).
 */
export function useCriminalRequestFormFlags(params: CriminalRequestFormFlagsParams) {
    const {
        reqStatus,
        reqDate,
        reqDecisionDate,
        reqTypeTemplate,
        reqEntryLane,
        reqNote,
        reqCustomTypeName,
        reqNeedsPurgeDefendantScope,
        defendants,
        reqDefendantIds,
        reqIsAssetSeizureEntry,
        showRequestPartySection,
        effectiveRequestPartyIds,
        reqLegalArticleBasis,
        reqReferredCourtName,
        detentionRangeValid,
        bailFormValid,
        assetSeizureFormValid,
        reqJudgeMargin,
    } = params;

    const reqDecisionBeforeRequest = useMemo(() => {
        if (reqStatus !== 'approved' && reqStatus !== 'rejected') return false;
        const requestDate = reqDate.trim();
        const decisionDate = reqDecisionDate.trim();
        if (!requestDate || !decisionDate) return false;
        return isTimelineNextDateInvalid(requestDate, decisionDate);
    }, [reqDate, reqDecisionDate, reqStatus]);

    const reqIsJudicialDecisionEntry = isJudicialDecisionTemplate(reqTypeTemplate);
    const reqIsLawyerMotionEntry = Boolean(reqTypeTemplate.trim()) && !reqIsJudicialDecisionEntry;
    const reqIsOrderEnforcementEntry = isOrderEnforcementTemplate(reqTypeTemplate);
    const reqNeedsLegalArticle = requiresLegalArticleBasis(reqTypeTemplate);

    const reqIsComplaintReferralEntry = isComplaintCourtReferralTemplate(reqTypeTemplate);
    const reqNeedsCustomName =
        isCustomJudicialTemplate(reqTypeTemplate) || isCustomLawyerMotionTemplate(reqTypeTemplate);

    const requestFormBaseValid =
        reqDate.trim().length > 0 &&
        reqTypeTemplate.trim().length > 0 &&
        reqEntryLane !== '' &&
        reqNote.trim().length > 0 &&
        (!reqNeedsCustomName || reqCustomTypeName.trim().length > 0) &&
        (!reqNeedsPurgeDefendantScope ||
            resolveEffectiveDefendantScopeIds(defendants, reqDefendantIds, reqTypeTemplate).length > 0) &&
        // قالب «حجز الأموال» يدير اختيار الأطراف داخلياً عبر مُحرّره الخاص.
        (reqIsAssetSeizureEntry ||
            !showRequestPartySection ||
            effectiveRequestPartyIds.length > 0) &&
        (!reqNeedsLegalArticle || reqLegalArticleBasis.trim().length > 0) &&
        (!reqIsComplaintReferralEntry || reqReferredCourtName.trim().length > 0) &&
        detentionRangeValid &&
        bailFormValid &&
        assetSeizureFormValid;

    const requestFormFinalValid =
        reqJudgeMargin.trim().length > 0 && reqDecisionDate.trim().length > 0 && !reqDecisionBeforeRequest;

    return {
        reqDecisionBeforeRequest,
        reqIsJudicialDecisionEntry,
        reqIsLawyerMotionEntry,
        reqIsOrderEnforcementEntry,
        reqIsComplaintReferralEntry,
        requestFormBaseValid,
        requestFormFinalValid,
    };
}
