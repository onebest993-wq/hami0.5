import { useCallback, useEffect, useMemo } from 'react';
import type { CriminalDefendant, LawyerRequest } from './criminalStore';
import type { CriminalActionParty } from './criminalStagePresentationCore';
import {
    filterDefendantsByDecisionsScope,
    isJuvenileJudgeCassationAppealableTemplate,
    isJuvenileJudgeDecisionTemplateForMix,
    resolveInvestigationJudicialEntryScope,
    type DecisionsPartyScope,
    type InvestigationDefendantsPartyMix,
} from './juvenileInvestigationRules';
import { filterActiveInvestigationDefendants } from './investigationDefendantPurge';
import { filterSelectableDefendantsForScope } from './partyPersonalStage';
import {
    ARREST_ORDER_TEMPLATE,
    ARREST_SUMMON_TEMPLATE,
    isAssetSeizureTemplate,
    isComplaintCourtReferralTemplate,
    isCustomJudicialTemplate,
    isCustomLawyerMotionTemplate,
    isDefendantBailTemplate,
    isDetentionDecisionTemplate,
    isInvestigationExpirationJudicialTemplate,
    isInvestigationPurgeDecisionTemplate,
    isJudicialDecisionTemplate,
    isOrderEnforcementTemplate,
    normalizeProceduralRequestTemplate,
    requiresDetentionDateRange,
    resolveRequestEntryLane,
    resolveRequestTypeTemplateFromStored,
    SUMMON_ORDER_TEMPLATE,
} from './proceduralRequestTypes';
import { filterPartiesForRequestTemplate, isDefendantTargetRequestTemplate } from './requestPartySelection';
import { isDefendantIdentityUnknown } from './criminalUnknownDefendant';
import type { PartyBailDraft, PartyDetentionDraft } from './components/concernedPartyDecisionPickerDraft';
import type { CriminalRequestsOrchestratorSlice } from './orchestrators/criminalOrchestratorSliceTypes';

type TemplateHandlersOrchestratorKeys =
    | 'isRequestsModalOpen' | 'requestModalLane' | 'reqTypeTemplate' | 'reqCustomTypeName'
    | 'reqLegalArticleBasis' | 'editingRequestId' | 'setEditingRequestId' | 'setReqDate'
    | 'setReqType' | 'setReqTypeTemplate' | 'setReqEntryLane' | 'setReqJudicialEntryScope'
    | 'setReqCustomTypeName' | 'setReqIsAppealable' | 'setReqNote' | 'setReqStatus'
    | 'setReqJudgeMargin' | 'setReqDecisionDate' | 'setReqDefendantIds' | 'setReqDetentionStartDate'
    | 'setReqDetentionEndDate' | 'setReqDetentionByPartyId' | 'setReqLegalArticleBasis'
    | 'setReqReferredCourtName' | 'setReqBailByPartyId' | 'setReqBailUnified' | 'setReqDetentionUnified'
    | 'setReqSeizureSelectedDefendantIds' | 'setReqSeizureDraftsByDefendant'
    | 'setReqInvestigationExpirationReason' | 'setReqInvestigationExpirationCustomDetail'
    | 'setReqIsStarred' | 'setReqDraftAttachments';

type CriminalRequestTemplateHandlersParams = Pick<
    CriminalRequestsOrchestratorSlice,
    TemplateHandlersOrchestratorKeys
> & {
    activeLegalArticle: string;
    defendants: CriminalDefendant[];
    activeParties: CriminalActionParty[];
    isInvestigationPhase: boolean;
    investigationDefendantsPartyMix: InvestigationDefendantsPartyMix;
    lawyerRequests: LawyerRequest[];
};

/**
 * مُعالِجات قوالب طلبات المحامي/القرارات القضائية — تطبيق قالب جديد (تصفير الحقول
 * المرتبطة)، تحميل طلب محفوظ إلى المودال، وتصفير المسار عند عدم توافق القالب مع
 * تركيبة الأطراف (بالغ/حدث) بعد تغيّرها.
 */
export function useCriminalRequestTemplateHandlers(params: CriminalRequestTemplateHandlersParams) {
    const {
        isRequestsModalOpen,
        requestModalLane,
        reqTypeTemplate,
        reqCustomTypeName,
        reqLegalArticleBasis,
        activeLegalArticle,
        defendants,
        activeParties,
        isInvestigationPhase,
        investigationDefendantsPartyMix,
        editingRequestId,
        lawyerRequests,
        setEditingRequestId,
        setReqDate,
        setReqType,
        setReqTypeTemplate,
        setReqEntryLane,
        setReqJudicialEntryScope,
        setReqCustomTypeName,
        setReqIsAppealable,
        setReqNote,
        setReqStatus,
        setReqJudgeMargin,
        setReqDecisionDate,
        setReqDefendantIds,
        setReqDetentionStartDate,
        setReqDetentionEndDate,
        setReqDetentionByPartyId,
        setReqLegalArticleBasis,
        setReqReferredCourtName,
        setReqBailByPartyId,
        setReqBailUnified,
        setReqDetentionUnified,
        setReqSeizureSelectedDefendantIds,
        setReqSeizureDraftsByDefendant,
        setReqInvestigationExpirationReason,
        setReqInvestigationExpirationCustomDetail,
        setReqIsStarred,
        setReqDraftAttachments,
    } = params;

    const clearRequestEntryLane = useCallback(() => {
        setReqEntryLane('');
        setReqJudicialEntryScope(null);
        setReqTypeTemplate('');
        setReqType('');
        setReqCustomTypeName('');
        setReqIsAppealable(false);
        setReqStatus('pending');
        setReqJudgeMargin('');
        setReqDecisionDate('');
        setReqDetentionStartDate('');
        setReqDetentionEndDate('');
        setReqDetentionByPartyId({});
        setReqLegalArticleBasis('');
        setReqReferredCourtName('');
        setReqBailByPartyId({});
        setReqBailUnified(false);
        setReqDetentionUnified(false);
        setReqSeizureSelectedDefendantIds([]);
        setReqSeizureDraftsByDefendant({});
        setReqInvestigationExpirationReason('');
        setReqInvestigationExpirationCustomDetail('');
    }, [
        setReqEntryLane,
        setReqJudicialEntryScope,
        setReqTypeTemplate,
        setReqType,
        setReqCustomTypeName,
        setReqIsAppealable,
        setReqStatus,
        setReqJudgeMargin,
        setReqDecisionDate,
        setReqDetentionStartDate,
        setReqDetentionEndDate,
        setReqDetentionByPartyId,
        setReqLegalArticleBasis,
        setReqReferredCourtName,
        setReqBailByPartyId,
        setReqBailUnified,
        setReqDetentionUnified,
        setReqSeizureSelectedDefendantIds,
        setReqSeizureDraftsByDefendant,
        setReqInvestigationExpirationReason,
        setReqInvestigationExpirationCustomDetail,
    ]);

    const loadRequestIntoModal = (request: LawyerRequest) => {
        const parsed = resolveRequestTypeTemplateFromStored(request.type, request.proceduralTemplate);
        let template = parsed.template;
        if (normalizeProceduralRequestTemplate(template) === ARREST_SUMMON_TEMPLATE) {
            const kind = request.orderEnforcement?.kind;
            if (kind === 'arrest') template = ARREST_ORDER_TEMPLATE;
            else if (kind === 'summons') template = SUMMON_ORDER_TEMPLATE;
        }
        setEditingRequestId(request.id);
        setReqDate(request.requestDate);
        setReqType(request.type);
        setReqTypeTemplate(template);
        setReqEntryLane(resolveRequestEntryLane(template));
        setReqCustomTypeName(parsed.customName);
        setReqIsAppealable(request.isAppealable === true);
        setReqNote(request.lawyerNote);
        setReqStatus(request.status);
        setReqJudgeMargin(String(request.judgeMargin ?? ''));
        setReqDecisionDate(String(request.decisionDate ?? '').trim() || new Date().toISOString().slice(0, 10));
        setReqDefendantIds(Array.isArray(request.defendantIds) ? request.defendantIds : []);
        const loadedDetentionStart = String(request.detentionStartDate ?? '').trim();
        const loadedDetentionEnd = String(request.detentionEndDate ?? '').trim();
        setReqDetentionStartDate(loadedDetentionStart);
        setReqDetentionEndDate(loadedDetentionEnd);
        const loadedPartyIds = Array.isArray(request.defendantIds) ? request.defendantIds : [];
        const detentionMap: Record<string, PartyDetentionDraft> = {};
        for (const partyId of loadedPartyIds) {
            detentionMap[partyId] = {
                startDate: loadedDetentionStart,
                endDate: loadedDetentionEnd,
            };
        }
        setReqDetentionByPartyId(detentionMap);
        const bail = request.defendantBail;
        const bailMap: Record<string, PartyBailDraft> = {};
        if (bail && (bail.kind === 'financial' || bail.kind === 'personal')) {
            for (const partyId of loadedPartyIds) {
                bailMap[partyId] = {
                    kind: bail.kind,
                    bailAmount: String(bail.bailAmount ?? '').trim(),
                    guarantors: Array.isArray(bail.guarantors)
                        ? bail.guarantors.map((g) => ({ ...g }))
                        : [],
                };
            }
        }
        setReqBailByPartyId(bailMap);
        setReqBailUnified(loadedPartyIds.length > 1 && Boolean(bail));
        setReqDetentionUnified(
            loadedPartyIds.length > 1 &&
                Boolean(loadedDetentionStart.trim() || loadedDetentionEnd.trim()),
        );
        setReqLegalArticleBasis(
            String(request.legalArticleBasis ?? request.orderEnforcement?.legalArticleBasis ?? activeLegalArticle).trim(),
        );
        setReqReferredCourtName(String(request.referredCourtName ?? '').trim());
        setReqIsStarred(request.isStarred === true);
        setReqDraftAttachments(
            Array.isArray(request.attachments) ? request.attachments.map((a) => ({ ...a })) : [],
        );
    };

    const modalLinkedRequest = useMemo(() => {
        if (!editingRequestId) return null;
        return lawyerRequests.find((r) => r.id === editingRequestId) ?? null;
    }, [editingRequestId, lawyerRequests]);

    const applyJudicialTemplate = (v: string, groupScope?: DecisionsPartyScope | null) => {
        setReqEntryLane('judicial');
        setReqJudicialEntryScope(groupScope ?? null);
        setReqTypeTemplate(v);
        if (!requiresDetentionDateRange(v)) {
            setReqDetentionStartDate('');
            setReqDetentionEndDate('');
            setReqDetentionByPartyId({});
            setReqDetentionUnified(false);
        }
        setReqJudgeMargin('');
        setReqDecisionDate('');
        setReqStatus('pending');
        if (!isCustomJudicialTemplate(v)) {
            setReqCustomTypeName('');
            setReqIsAppealable(isJuvenileJudgeCassationAppealableTemplate(v));
            setReqType(v);
        } else {
            setReqType(reqCustomTypeName);
            setReqIsAppealable(false);
            setReqDefendantIds([]);
        }
        if (isOrderEnforcementTemplate(v) && !reqLegalArticleBasis.trim()) {
            setReqLegalArticleBasis(activeLegalArticle);
        }
        if (!isComplaintCourtReferralTemplate(v)) {
            setReqReferredCourtName('');
        }
        if (!isDefendantBailTemplate(v)) {
            setReqBailByPartyId({});
            setReqBailUnified(false);
        }
        if (!isAssetSeizureTemplate(v)) {
            setReqSeizureSelectedDefendantIds([]);
            setReqSeizureDraftsByDefendant({});
        }
        if (
            isInvestigationPhase &&
            (isInvestigationPurgeDecisionTemplate(v) || isInvestigationExpirationJudicialTemplate(v))
        ) {
            const activeIds = new Set(filterActiveInvestigationDefendants(defendants).map((d) => d.id));
            let selectable = filterSelectableDefendantsForScope(defendants);
            const entryScope = resolveInvestigationJudicialEntryScope(
                v,
                groupScope ?? null,
                investigationDefendantsPartyMix,
            );
            if (entryScope === 'juvenile') {
                selectable = filterDefendantsByDecisionsScope(selectable, 'juvenile');
            } else if (entryScope === 'adult') {
                selectable = filterDefendantsByDecisionsScope(selectable, 'adult');
            }
            const selectableIds = new Set(selectable.map((d) => d.id));
            setReqDefendantIds((prev) => {
                const kept = prev.filter((id) => activeIds.has(id) && selectableIds.has(id));
                if (kept.length) return kept;
                return selectable.length === 1 ? [selectable[0]!.id] : [];
            });
        }
        if (!isInvestigationExpirationJudicialTemplate(v)) {
            setReqInvestigationExpirationReason('');
            setReqInvestigationExpirationCustomDetail('');
        }
        const entryScope = resolveInvestigationJudicialEntryScope(
            v,
            groupScope ?? null,
            investigationDefendantsPartyMix,
        );
        if (isInvestigationPhase && entryScope === 'juvenile') {
            let eligible = filterPartiesForRequestTemplate(activeParties, v, undefined, 'juvenile');
            eligible = eligible.filter((p) => p.source === 'defendant');
            setReqDefendantIds(eligible.length === 1 ? [eligible[0]!.id] : []);
        } else if (
            isInvestigationPhase &&
            entryScope === 'adult' &&
            (isDefendantTargetRequestTemplate(v) ||
                isDetentionDecisionTemplate(v) ||
                isDefendantBailTemplate(v)) &&
            !isInvestigationPurgeDecisionTemplate(v) &&
            !isInvestigationExpirationJudicialTemplate(v)
        ) {
            let eligible = filterPartiesForRequestTemplate(activeParties, v, undefined, 'adult');
            eligible = eligible
                .filter((p) => p.source === 'defendant')
                .filter((p) => {
                    const def = defendants.find((d) => d.id === p.id);
                    return def ? !isDefendantIdentityUnknown(def) : true;
                });
            setReqDefendantIds(eligible.length === 1 ? [eligible[0]!.id] : []);
        }
    };

    const applyLawyerTemplate = (v: string) => {
        setReqEntryLane('lawyer');
        setReqTypeTemplate(v);
        setReqStatus('pending');
        setReqJudgeMargin('');
        setReqDecisionDate('');
        setReqDetentionStartDate('');
        setReqDetentionEndDate('');
        setReqDetentionByPartyId({});
        setReqLegalArticleBasis('');
        setReqSeizureSelectedDefendantIds([]);
        setReqSeizureDraftsByDefendant({});
        if (!isCustomLawyerMotionTemplate(v)) {
            setReqCustomTypeName('');
            setReqIsAppealable(false);
            setReqType(v);
        } else {
            setReqType(reqCustomTypeName);
            setReqIsAppealable(false);
        }
    };

    useEffect(() => {
        if (!isRequestsModalOpen || requestModalLane !== 'judicial' || !reqTypeTemplate.trim()) return;
        const mix = investigationDefendantsPartyMix;
        const isJuvenileTpl = isJuvenileJudgeDecisionTemplateForMix(
            reqTypeTemplate,
            investigationDefendantsPartyMix,
        );
        const isAdultInvestigationTpl =
            isJudicialDecisionTemplate(reqTypeTemplate) &&
            !isJuvenileTpl &&
            !isCustomJudicialTemplate(reqTypeTemplate);
        if (
            (mix === 'juveniles_only' && isAdultInvestigationTpl) ||
            (mix === 'adults_only' && isJuvenileTpl)
        ) {
            clearRequestEntryLane();
        }
    }, [
        isRequestsModalOpen,
        requestModalLane,
        reqTypeTemplate,
        investigationDefendantsPartyMix,
        clearRequestEntryLane,
    ]);

    return {
        clearRequestEntryLane,
        loadRequestIntoModal,
        modalLinkedRequest,
        applyJudicialTemplate,
        applyLawyerTemplate,
    };
}
