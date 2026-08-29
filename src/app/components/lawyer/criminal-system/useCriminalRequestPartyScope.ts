import { useCriminalRequestPartyScopeEffects } from './useCriminalRequestPartyScopeEffects';
import { useMemo } from 'react';
import type { CriminalComplainant, CriminalDefendant, OurRepresentation } from './criminalStore';
import type { CriminalActionParty } from './criminalStagePresentationCore';
import { formatConcernedPartyLabel } from './criminalStageUtils';
import {
    filterDefendantsByDecisionsScope,
    filterPartiesByDecisionsScope,
    resolveInvestigationJudicialEntryScope,
    type DecisionsPartyScope,
    type InvestigationDefendantsPartyMix,
} from './juvenileInvestigationRules';
import { filterActiveInvestigationDefendants, requiresInvestigationPurgeDefendantScope } from './investigationDefendantPurge';
import { isDefendantIdentityUnknown } from './criminalUnknownDefendant';
import { filterSelectableDefendantsForScope } from './partyPersonalStage';
import {
    ARREST_ORDER_TEMPLATE,
    isAssetSeizureTemplate,
    isCustomJudicialTemplate,
    isDefendantBailTemplate,
    isJudicialDecisionTemplate,
    normalizeProceduralRequestTemplate,
    purgeDecisionIncludesUnknownDefendants,
    requiresDetentionDateRange,
} from './proceduralRequestTypes';
import {
    filterPartiesForRequestTemplate,
    isDefendantTargetRequestTemplate,
    resolveAutoRequestPartyId,
    shouldShowMultiPartySelectionPicker,
    shouldShowRequestPartyPicker,
} from './requestPartySelection';
import type { PartyBailDraft, PartyDetentionDraft } from './components/concernedPartyDecisionPickerDraft';
import type { CriminalRequestsOrchestratorSlice } from './orchestrators/criminalOrchestratorSliceTypes';

type CriminalRequestPartyScopeParams = Pick<
    CriminalRequestsOrchestratorSlice,
    | 'requestModalLane'
    | 'reqTypeTemplate'
    | 'reqJudicialEntryScope'
    | 'reqDefendantIds'
    | 'setReqDefendantIds'
    | 'setReqDetentionByPartyId'
    | 'setReqBailByPartyId'
    | 'isRequestsModalOpen'
> & {
    isRequestModalViewOnly: boolean;
    defendants: CriminalDefendant[];
    complainants: CriminalComplainant[];
    activeParties: CriminalActionParty[];
    partyScopeDefendants: CriminalDefendant[];
    ourRepresentation: OurRepresentation;
    isDefense: boolean;
    isInvestigationPhase: boolean;
    investigationDefendantsPartyMix: InvestigationDefendantsPartyMix;
    isAllDefendantsUnknown: boolean;
    unknownDefendantsForPartyDisplay: CriminalDefendant[];
};

/**
 * مشتقّات نطاق «الأطراف/المتهمين» لمودال الطلبات — تحديد الأطراف المؤهّلة،
 * الاختيار التلقائي للطرف الواحد، وقاطرات الاختيار المرافقة لقرارات قاضي التحقيق
 * (أحداث/بالغين) وقرارات انقضاء التحقيق (تصفية المتهمين).
 */
export function useCriminalRequestPartyScope(params: CriminalRequestPartyScopeParams) {
    const {
        requestModalLane,
        reqTypeTemplate,
        reqJudicialEntryScope,
        reqDefendantIds,
        setReqDefendantIds,
        setReqDetentionByPartyId,
        setReqBailByPartyId,
        isRequestsModalOpen,
        isRequestModalViewOnly,
        defendants,
        complainants,
        activeParties,
        partyScopeDefendants,
        ourRepresentation,
        isDefense,
        isInvestigationPhase,
        investigationDefendantsPartyMix,
        isAllDefendantsUnknown,
        unknownDefendantsForPartyDisplay,
    } = params;

    const requestPartyCtx = useMemo(
        () => ({
            isUnknownPerpetrator: isAllDefendantsUnknown,
            isDefense,
            complainantsCount: complainants.length,
            defendantsCount: defendants.length,
        }),
        [isAllDefendantsUnknown, isDefense, complainants.length, defendants.length],
    );
    const investigationJudicialEntryScope = useMemo(
        () =>
            isInvestigationPhase
                ? resolveInvestigationJudicialEntryScope(
                      reqTypeTemplate,
                      reqJudicialEntryScope,
                      investigationDefendantsPartyMix,
                  )
                : undefined,
        [isInvestigationPhase, reqTypeTemplate, reqJudicialEntryScope, investigationDefendantsPartyMix],
    );
    const defendantTargetRequestParties = useMemo(() => {
        const deceasedById = new Map(activeParties.map((p) => [p.id, Boolean(p.isDeceased)]));
        const scope = isInvestigationPhase
            ? filterActiveInvestigationDefendants(partyScopeDefendants)
            : partyScopeDefendants;
        let rows = scope
            .filter((d) => !deceasedById.get(d.id))
            .filter((d) => !isDefendantIdentityUnknown(d))
            .map((d) => ({
                id: d.id,
                fullName: d.fullName,
                isJuvenile: d.isJuvenile,
                source: 'defendant' as const,
                isDeceased: false,
            }));
        const tpl = String(reqTypeTemplate ?? '').trim();
        if (isInvestigationPhase && tpl) {
            if (investigationJudicialEntryScope === 'juvenile') {
                rows = rows.filter((p) => Boolean(p.isJuvenile));
            } else if (investigationJudicialEntryScope === 'adult') {
                rows = rows.filter((p) => !p.isJuvenile);
            }
        }
        return rows;
    }, [
        activeParties,
        isInvestigationPhase,
        partyScopeDefendants,
        reqTypeTemplate,
        investigationJudicialEntryScope,
    ]);
    const mixedInvestigationScopedDefendantNames = useMemo(() => {
        if (investigationDefendantsPartyMix !== 'mixed' || !investigationJudicialEntryScope) {
            return [];
        }
        const pool = defendantTargetRequestParties;
        const selectedNames = reqDefendantIds
            .map((id) => pool.find((p) => p.id === id)?.fullName)
            .map((n) => String(n ?? '').trim())
            .filter(Boolean);
        if (selectedNames.length) return selectedNames;
        return pool.map((p) => String(p.fullName ?? '').trim()).filter(Boolean);
    }, [
        investigationDefendantsPartyMix,
        investigationJudicialEntryScope,
        defendantTargetRequestParties,
        reqDefendantIds,
    ]);
    const requestEligibleParties = useMemo(
        () => {
            /*
             * في مودال «طلبات المحامي» يجب إظهار جميع الأطراف (مشتكي ومشكو منه، مفرد/جمع)
             * بصرف النظر عن تمثيل المحامي — لأنّ طلب المحامي قد يخصّ أيّ طرف.
             * نتجاوز فلتر `ourRepresentation` بإمرار `undefined`، ونحتفظ بمنطق
             * استبعاد المتوفّى وحالات القوالب المحدّدة (كفالة/توقيف/استقدام) كما هي.
             * قرارات تقييد الحرية: مصدر الأطراف `actionParties` (متهمون + مشتكي متقابل فقط).
             */
            const isJuvenileJudgeTpl =
                requestModalLane === 'judicial' &&
                isInvestigationPhase &&
                investigationJudicialEntryScope === 'juvenile';
            const isAdultInvestigationJudicialTpl =
                requestModalLane === 'judicial' &&
                isInvestigationPhase &&
                isJudicialDecisionTemplate(reqTypeTemplate) &&
                !isJuvenileJudgeTpl &&
                !isCustomJudicialTemplate(reqTypeTemplate);
            const decisionsScope: DecisionsPartyScope | undefined = investigationJudicialEntryScope;
            const representation =
                requestModalLane === 'lawyer' || isJuvenileJudgeTpl ? undefined : ourRepresentation;
            const partyPool = isDefendantTargetRequestTemplate(reqTypeTemplate)
                ? defendantTargetRequestParties
                : activeParties;
            let eligible = filterPartiesForRequestTemplate(
                partyPool,
                reqTypeTemplate,
                representation,
                decisionsScope,
            );
            if (isJuvenileJudgeTpl) {
                eligible = filterPartiesByDecisionsScope(eligible, 'juvenile').filter(
                    (p) => p.source === 'defendant',
                );
            } else if (
                isAdultInvestigationJudicialTpl &&
                isDefendantTargetRequestTemplate(reqTypeTemplate) &&
                !(
                    isInvestigationPhase &&
                    isJudicialDecisionTemplate(reqTypeTemplate) &&
                    requiresInvestigationPurgeDefendantScope(reqTypeTemplate)
                )
            ) {
                eligible = eligible.filter((p) => {
                    if (p.source !== 'defendant') return true;
                    const def = partyScopeDefendants.find((d) => d.id === p.id);
                    return def ? !isDefendantIdentityUnknown(def) : true;
                });
            }
            return eligible;
        },
        [
            activeParties,
            defendantTargetRequestParties,
            partyScopeDefendants,
            reqTypeTemplate,
            ourRepresentation,
            requestModalLane,
            isInvestigationPhase,
            investigationJudicialEntryScope,
        ],
    );
    /**
     * القرار اليدوي المخصص: لا اقتراح تلقائي — الخيار الفارغ = قرار عام للإضبارة.
     * قرارات قاضي الأحداث: «المقصود بالإجراء» يظهر فقط عند تعدد المؤهّلين.
     */
    const isCustomJudicialEntry = useMemo(
        () => isCustomJudicialTemplate(reqTypeTemplate),
        [reqTypeTemplate],
    );
    const isJuvenileJudgeDecisionEntry =
        requestModalLane === 'judicial' &&
        isInvestigationPhase &&
        investigationJudicialEntryScope === 'juvenile';
    const isAdultInvestigationJudicialEntry =
        requestModalLane === 'judicial' &&
        isInvestigationPhase &&
        isJudicialDecisionTemplate(reqTypeTemplate) &&
        !isJuvenileJudgeDecisionEntry &&
        !isCustomJudicialTemplate(reqTypeTemplate);
    const requestDecisionsScope: DecisionsPartyScope | undefined = investigationJudicialEntryScope;
    const showJuvenileJudgeConcernedPartyPicker =
        isJuvenileJudgeDecisionEntry &&
        shouldShowMultiPartySelectionPicker(requestEligibleParties.length);
    const showAdultJudgeConcernedPartyPicker =
        isAdultInvestigationJudicialEntry &&
        isDefendantTargetRequestTemplate(reqTypeTemplate) &&
        shouldShowMultiPartySelectionPicker(requestEligibleParties.length);
    const forceJudicialConcernedPartyPicker =
        showJuvenileJudgeConcernedPartyPicker || showAdultJudgeConcernedPartyPicker;
    const reqNeedsPurgeDefendantScope =
        isInvestigationPhase &&
        isJudicialDecisionTemplate(reqTypeTemplate) &&
        requiresInvestigationPurgeDefendantScope(reqTypeTemplate);
    const purgeSelectableIdentified = useMemo(() => {
        let list = filterSelectableDefendantsForScope(defendants);
        if (isJuvenileJudgeDecisionEntry) {
            list = filterDefendantsByDecisionsScope(list, 'juvenile');
        } else if (investigationDefendantsPartyMix !== 'juveniles_only') {
            list = filterDefendantsByDecisionsScope(list, 'adult');
        }
        return list;
    }, [defendants, isJuvenileJudgeDecisionEntry, investigationDefendantsPartyMix]);
    const showPurgeDefendantPicker =
        reqNeedsPurgeDefendantScope &&
        (purgeSelectableIdentified.length > 0 ||
            (unknownDefendantsForPartyDisplay.length > 0 &&
                purgeDecisionIncludesUnknownDefendants(reqTypeTemplate)));
    const autoRequestPartyId = useMemo(
        () =>
            isCustomJudicialEntry
                ? null
                : resolveAutoRequestPartyId(
                      requestEligibleParties,
                      reqTypeTemplate,
                      requestPartyCtx,
                      requestModalLane === 'lawyer' ? undefined : ourRepresentation,
                      requestDecisionsScope,
                  ),
        [
            isCustomJudicialEntry,
            requestEligibleParties,
            reqTypeTemplate,
            requestPartyCtx,
            ourRepresentation,
            requestModalLane,
            requestDecisionsScope,
        ],
    );
    const showUnknownPartyNoticeInRequestModal =
        unknownDefendantsForPartyDisplay.length > 0 &&
        Boolean(reqTypeTemplate.trim()) &&
        !reqNeedsPurgeDefendantScope &&
        !isAssetSeizureTemplate(reqTypeTemplate);
    const showRequestPartyPicker = useMemo(
        () => {
            if (requestModalLane === 'judicial' && isCustomJudicialEntry) return false;
            return shouldShowRequestPartyPicker(
                requestEligibleParties,
                reqTypeTemplate,
                autoRequestPartyId,
                isAllDefendantsUnknown,
                requestModalLane === 'lawyer' ? undefined : ourRepresentation,
                requestDecisionsScope,
            );
        },
        [
            isCustomJudicialEntry,
            requestEligibleParties,
            reqTypeTemplate,
            autoRequestPartyId,
            isAllDefendantsUnknown,
            ourRepresentation,
            requestModalLane,
            requestDecisionsScope,
        ],
    );
    const autoRequestPartyLabel = useMemo(() => {
        if (!autoRequestPartyId) return '';
        const p = activeParties.find((x) => x.id === autoRequestPartyId);
        return p ? formatConcernedPartyLabel(p) : '—';
    }, [autoRequestPartyId, activeParties]);
    /** قرار قضائي يدوي: لا محدّد طرف — الفراغ = قرار عام للإضبارة. */
    const customJudicialConcernedPartyOptions = useMemo(
        () =>
            activeParties.map((p) => ({
                id: p.id,
                label: formatConcernedPartyLabel(p),
            })),
        [activeParties],
    );
    const customJudicialConcernedPartyId = String(reqDefendantIds[0] ?? '').trim();
    const showConcernedPartyCardsUi =
        requestModalLane === 'judicial' &&
        !isCustomJudicialEntry &&
        shouldShowMultiPartySelectionPicker(requestEligibleParties.length);
    const hidePartySectionForJudicialCustom =
        requestModalLane === 'judicial' && isCustomJudicialEntry;
    const solePartyJuvenileArrestHintSection =
        requestModalLane === 'judicial' &&
        normalizeProceduralRequestTemplate(reqTypeTemplate.trim()) === ARREST_ORDER_TEMPLATE &&
        (() => {
            const partyId = String(autoRequestPartyId ?? requestEligibleParties[0]?.id ?? '').trim();
            if (!partyId) return false;
            const def = defendants.find((d) => d.id === partyId);
            return Boolean((def as { isJuvenile?: boolean } | undefined)?.isJuvenile);
        })();
    const showRequestPartySection =
        Boolean(reqTypeTemplate.trim()) &&
        !hidePartySectionForJudicialCustom &&
        !reqNeedsPurgeDefendantScope &&
        !isAssetSeizureTemplate(reqTypeTemplate) &&
        (isRequestModalViewOnly
            ? Boolean(
                  reqDefendantIds.length ||
                      autoRequestPartyId ||
                      showRequestPartyPicker ||
                      showUnknownPartyNoticeInRequestModal,
              )
            : forceJudicialConcernedPartyPicker ||
                  showConcernedPartyCardsUi ||
                  showRequestPartyPicker ||
                  showUnknownPartyNoticeInRequestModal ||
                  solePartyJuvenileArrestHintSection ||
                  (requiresDetentionDateRange(reqTypeTemplate) &&
                      requestEligibleParties.length > 0) ||
                  (isDefendantBailTemplate(reqTypeTemplate) &&
                      defendantTargetRequestParties.length > 0));
    const effectiveRequestPartyIds = useMemo(() => {
        const cleaned = reqDefendantIds.map((x) => String(x ?? '').trim()).filter(Boolean);
        if (cleaned.length) return cleaned;
        if (autoRequestPartyId) return [autoRequestPartyId];
        if (requestEligibleParties.length === 1) return [requestEligibleParties[0]!.id];
        return [];
    }, [reqDefendantIds, autoRequestPartyId, requestEligibleParties]);
    const patchReqDetentionForParty = (partyId: string, patch: Partial<PartyDetentionDraft>) => {
        setReqDetentionByPartyId((prev) => ({
            ...prev,
            [partyId]: {
                startDate: patch.startDate ?? prev[partyId]?.startDate ?? '',
                endDate: patch.endDate ?? prev[partyId]?.endDate ?? '',
            },
        }));
    };
    const patchReqBailForParty = (partyId: string, patch: Partial<PartyBailDraft>) => {
        setReqBailByPartyId((prev) => ({
            ...prev,
            [partyId]: {
                kind: patch.kind ?? prev[partyId]?.kind ?? 'financial',
                bailAmount: patch.bailAmount ?? prev[partyId]?.bailAmount ?? '',
                guarantors: patch.guarantors ?? prev[partyId]?.guarantors ?? [],
            },
        }));
    };

    useCriminalRequestPartyScopeEffects({
        isRequestsModalOpen,
        isRequestModalViewOnly,
        reqNeedsPurgeDefendantScope,
        isJuvenileJudgeDecisionEntry,
        isAdultInvestigationJudicialEntry,
        showRequestPartySection,
        defendants,
        reqTypeTemplate,
        requestEligibleParties,
        reqDefendantIds,
        setReqDefendantIds,
    });

    return {
        requestPartyCtx,
        investigationJudicialEntryScope,
        defendantTargetRequestParties,
        mixedInvestigationScopedDefendantNames,
        requestEligibleParties,
        isCustomJudicialEntry,
        isJuvenileJudgeDecisionEntry,
        isAdultInvestigationJudicialEntry,
        requestDecisionsScope,
        showJuvenileJudgeConcernedPartyPicker,
        showAdultJudgeConcernedPartyPicker,
        forceJudicialConcernedPartyPicker,
        reqNeedsPurgeDefendantScope,
        showPurgeDefendantPicker,
        autoRequestPartyId,
        showUnknownPartyNoticeInRequestModal,
        showRequestPartyPicker,
        autoRequestPartyLabel,
        customJudicialConcernedPartyOptions,
        customJudicialConcernedPartyId,
        showConcernedPartyCardsUi,
        hidePartySectionForJudicialCustom,
        solePartyJuvenileArrestHintSection,
        showRequestPartySection,
        effectiveRequestPartyIds,
        patchReqDetentionForParty,
        patchReqBailForParty,
    };
}

