import { useEffect, useMemo } from 'react';
import type { CriminalComplainant, CriminalDefendant, OurRepresentation } from './criminalStore';
import type { CriminalActionParty } from './criminalStagePresentationCore';
import { partyIdsIncludeJuvenile, type DecisionsPartyScope } from './juvenileInvestigationRules';
import {
    ARREST_ORDER_TEMPLATE,
    isAssetSeizureTemplate,
    isDefendantBailTemplate,
    normalizeProceduralRequestTemplate,
    requiresDetentionDateRange,
} from './proceduralRequestTypes';
import { resolveRequestPartyIdsForPayload } from './requestPartySelection';
import { emptyPartyBailDraft, isPartyBailDraftValid, type PartyBailDraft, type PartyDetentionDraft } from './components/concernedPartyDecisionPickerDraft';
import type { SeizedAssetDraft } from './components/requestModalEntryLanes.types';
import { validateDetentionDateRange } from './detentionEngine';
import type { CriminalRequestsOrchestratorSlice } from './orchestrators/criminalOrchestratorSliceTypes';

type RequestPartyCtx = {
    isUnknownPerpetrator: boolean;
    isDefense: boolean;
    complainantsCount: number;
    defendantsCount: number;
};

type SpecialtyFieldsOrchestratorKeys =
    | 'isRequestsModalOpen' | 'requestModalLane' | 'reqTypeTemplate' | 'reqDefendantIds'
    | 'setReqDefendantIds' | 'reqBailByPartyId' | 'setReqBailByPartyId' | 'reqBailUnified'
    | 'setReqBailUnified' | 'reqDetentionByPartyId' | 'setReqDetentionByPartyId'
    | 'reqDetentionStartDate' | 'reqDetentionEndDate' | 'reqDetentionUnified' | 'setReqDetentionUnified'
    | 'reqSeizureSelectedDefendantIds' | 'setReqSeizureSelectedDefendantIds'
    | 'reqSeizureDraftsByDefendant' | 'setReqSeizureDraftsByDefendant';

export type CriminalRequestSpecialtyFieldsParams = Pick<CriminalRequestsOrchestratorSlice, SpecialtyFieldsOrchestratorKeys> & {
    isRequestModalViewOnly: boolean;
    defendants: CriminalDefendant[];
    complainants: CriminalComplainant[];
    isMutualComplaint: boolean;
    ourRepresentation: OurRepresentation;
    autoRequestPartyId: string | null;
    requestEligibleParties: CriminalActionParty[];
    requestDecisionsScope: DecisionsPartyScope | undefined;
    requestPartyCtx: RequestPartyCtx;
    defendantTargetRequestParties: { id: string; fullName: string }[];
    effectiveRequestPartyIds: string[];
    showRequestPartyPicker: boolean;
    forceJudicialConcernedPartyPicker: boolean;
    showConcernedPartyCardsUi: boolean;
    showUnknownPartyNoticeInRequestModal: boolean;
};

/**
 * حقول خاصّة بقوالب معيّنة داخل مودال الطلبات: الكفالة (فردية/موحّدة)، مدى
 * التوقيف (فردي/موحّد)، وحجز الأموال (اختيار الهاربين + مسوّدات الأصناف).
 */
export function useCriminalRequestSpecialtyFields(params: CriminalRequestSpecialtyFieldsParams) {
    const {
        isRequestsModalOpen,
        isRequestModalViewOnly,
        requestModalLane,
        reqTypeTemplate,
        defendants,
        complainants,
        isMutualComplaint,
        ourRepresentation,
        reqDefendantIds,
        setReqDefendantIds,
        autoRequestPartyId,
        requestEligibleParties,
        requestDecisionsScope,
        requestPartyCtx,
        defendantTargetRequestParties,
        effectiveRequestPartyIds,
        showRequestPartyPicker,
        forceJudicialConcernedPartyPicker,
        showConcernedPartyCardsUi,
        showUnknownPartyNoticeInRequestModal,
        reqBailByPartyId,
        setReqBailByPartyId,
        reqBailUnified,
        setReqBailUnified,
        reqDetentionByPartyId,
        setReqDetentionByPartyId,
        reqDetentionStartDate,
        reqDetentionEndDate,
        reqDetentionUnified,
        setReqDetentionUnified,
        reqSeizureSelectedDefendantIds,
        setReqSeizureSelectedDefendantIds,
        reqSeizureDraftsByDefendant,
        setReqSeizureDraftsByDefendant,
    } = params;

    const reqNeedsDetentionDateRange = requiresDetentionDateRange(reqTypeTemplate);
    const reqJuvenileDetentionLocked =
        reqNeedsDetentionDateRange &&
        partyIdsIncludeJuvenile(defendants, effectiveRequestPartyIds);

    const showJuvenileArrestLegalHint = useMemo(() => {
        if (requestModalLane !== 'judicial') return false;
        const tpl = normalizeProceduralRequestTemplate(reqTypeTemplate.trim());
        if (tpl !== ARREST_ORDER_TEMPLATE) return false;
        const partyId = String(effectiveRequestPartyIds[0] ?? '').trim();
        if (!partyId) return false;
        const def = defendants.find((d) => d.id === partyId);
        return Boolean((def as { isJuvenile?: boolean } | undefined)?.isJuvenile);
    }, [requestModalLane, reqTypeTemplate, effectiveRequestPartyIds, defendants]);

    const detentionRangeValid =
        !reqNeedsDetentionDateRange ||
        (reqDetentionUnified && effectiveRequestPartyIds.length > 1
            ? (() => {
                  const partyId = effectiveRequestPartyIds[0]!;
                  const draft = reqDetentionByPartyId[partyId] ?? {
                      startDate: reqDetentionStartDate,
                      endDate: reqDetentionEndDate,
                  };
                  return (
                      validateDetentionDateRange(draft.startDate.trim(), draft.endDate.trim()) === null
                  );
              })()
            : effectiveRequestPartyIds.every((partyId) => {
                  const draft = reqDetentionByPartyId[partyId] ?? {
                      startDate: reqDetentionStartDate,
                      endDate: reqDetentionEndDate,
                  };
                  return validateDetentionDateRange(draft.startDate.trim(), draft.endDate.trim()) === null;
              }));

    const reqIsDefendantBailEntry = isDefendantBailTemplate(reqTypeTemplate);
    const showPartyPickerFormUi =
        showRequestPartyPicker ||
        forceJudicialConcernedPartyPicker ||
        showConcernedPartyCardsUi ||
        showUnknownPartyNoticeInRequestModal ||
        reqIsDefendantBailEntry ||
        reqNeedsDetentionDateRange;
    const bailTargetDefendantIds = useMemo(() => {
        if (!reqIsDefendantBailEntry) return reqDefendantIds;
        const cleaned = reqDefendantIds.map((x) => String(x ?? '').trim()).filter(Boolean);
        if (cleaned.length) return cleaned;
        const resolved = resolveRequestPartyIdsForPayload(
            cleaned,
            autoRequestPartyId,
            requestEligibleParties,
            reqTypeTemplate.trim(),
            requestModalLane === 'lawyer' ? undefined : ourRepresentation,
            requestPartyCtx,
            requestDecisionsScope,
        );
        if (resolved?.length) return resolved;
        if (defendantTargetRequestParties.length === 1) {
            return [defendantTargetRequestParties[0]!.id];
        }
        return [];
    }, [
        reqIsDefendantBailEntry,
        reqDefendantIds,
        autoRequestPartyId,
        requestEligibleParties,
        reqTypeTemplate,
        requestModalLane,
        ourRepresentation,
        requestPartyCtx,
        requestDecisionsScope,
        defendantTargetRequestParties,
    ]);
    const bailFormValid = (() => {
        if (!reqIsDefendantBailEntry) return true;
        const targets = bailTargetDefendantIds.length ? bailTargetDefendantIds : effectiveRequestPartyIds;
        if (!targets.length) return false;
        if (reqBailUnified && targets.length > 1) {
            return isPartyBailDraftValid(reqBailByPartyId[targets[0]!]);
        }
        return targets.every((partyId) => isPartyBailDraftValid(reqBailByPartyId[partyId]));
    })();

    const syncUnifiedBailDrafts = (partyIds: string[]) => {
        if (partyIds.length < 2) return;
        const firstId = partyIds[0]!;
        const draft = reqBailByPartyId[firstId] ?? emptyPartyBailDraft();
        setReqBailByPartyId((prev) => {
            const next = { ...prev };
            for (const partyId of partyIds) {
                next[partyId] = {
                    kind: draft.kind,
                    bailAmount: draft.bailAmount,
                    guarantors: draft.guarantors.map((g) => ({ ...g })),
                };
            }
            return next;
        });
    };

    const syncUnifiedDetentionDrafts = (partyIds: string[]) => {
        if (partyIds.length < 2) return;
        const firstId = partyIds[0]!;
        const draft = reqDetentionByPartyId[firstId] ?? {
            startDate: reqDetentionStartDate,
            endDate: reqDetentionEndDate,
        };
        setReqDetentionByPartyId((prev) => {
            const next = { ...prev };
            for (const partyId of partyIds) {
                next[partyId] = { startDate: draft.startDate, endDate: draft.endDate };
            }
            return next;
        });
    };

    const handleReqBailUnifiedChange = (unified: boolean) => {
        setReqBailUnified(unified);
        if (unified) {
            const targets = bailTargetDefendantIds.length ? bailTargetDefendantIds : effectiveRequestPartyIds;
            syncUnifiedBailDrafts(targets);
        }
    };

    const handleReqDetentionUnifiedChange = (unified: boolean) => {
        setReqDetentionUnified(unified);
        if (unified) {
            syncUnifiedDetentionDrafts(effectiveRequestPartyIds);
        }
    };

    useEffect(() => {
        if (effectiveRequestPartyIds.length <= 1) {
            setReqBailUnified(false);
            setReqDetentionUnified(false);
        }
    }, [effectiveRequestPartyIds.length, setReqBailUnified, setReqDetentionUnified]);

    useEffect(() => {
        if (!isRequestsModalOpen || isRequestModalViewOnly || !reqIsDefendantBailEntry) return;
        if (reqDefendantIds.length === 0 && defendantTargetRequestParties.length === 1) {
            setReqDefendantIds([defendantTargetRequestParties[0]!.id]);
        }
    }, [
        isRequestsModalOpen,
        isRequestModalViewOnly,
        reqIsDefendantBailEntry,
        reqDefendantIds.length,
        defendantTargetRequestParties,
        setReqDefendantIds,
    ]);

    /**
     * === حجز الأموال — قائمة الهاربين + اختيار ذكي + تحقّق ===
     *
     * يَشمل المتهمين الأصليين الذين status='هارب'، إضافةً إلى المشتكين المتقابلين
     * (شكوى متقابلة) الذين accusedStatus='هارب' — وفقاً لازدواجية الصفة. لا نَنقل
     * كائن المشتكي إلى مصفوفة المتهمين؛ نَكتفي بدَمج العَرض ديناميكياً.
     */
    const fugitiveDefendants = useMemo(() => {
        const original = (Array.isArray(defendants) ? defendants : [])
            .filter((d) => d.status === 'هارب')
            .map((d) => ({
                id: d.id,
                fullName: String(d.fullName ?? '').trim() || 'متهم بلا اسم',
            }));
        const crossFugitives = (Array.isArray(complainants) ? complainants : [])
            .filter(
                (c) =>
                    (isMutualComplaint || (c as { isCrossComplaint?: boolean }).isCrossComplaint === true) &&
                    String((c as { accusedStatus?: string }).accusedStatus ?? '').trim() === 'هارب',
            )
            .map((c) => ({
                id: c.id,
                fullName: String(c.fullName ?? '').trim() || 'مشتكي بلا اسم',
            }));
        return [...original, ...crossFugitives];
    }, [defendants, complainants, isMutualComplaint]);
    const reqIsAssetSeizureEntry = isAssetSeizureTemplate(reqTypeTemplate);
    /**
     * عند تفعيل قالب «حجز الأموال» مع وجود هارب واحد فقط ⇒ نختاره ضمنياً.
     * لا نُجبر إعادة المزامنة في الحالات الأخرى لتجنّب مسح اختيار المستخدم.
     */
    useEffect(() => {
        if (!reqIsAssetSeizureEntry) return;
        if (fugitiveDefendants.length === 1) {
            const onlyId = fugitiveDefendants[0]!.id;
            setReqSeizureSelectedDefendantIds((prev) =>
                prev.length === 1 && prev[0] === onlyId ? prev : [onlyId],
            );
        } else if (fugitiveDefendants.length === 0) {
            setReqSeizureSelectedDefendantIds([]);
        } else {
            setReqSeizureSelectedDefendantIds((prev) =>
                prev.filter((id) => fugitiveDefendants.some((f) => f.id === id)),
            );
        }
    }, [reqIsAssetSeizureEntry, fugitiveDefendants, setReqSeizureSelectedDefendantIds]);

    const assetSeizureFormValid = (() => {
        if (!reqIsAssetSeizureEntry) return true;
        if (fugitiveDefendants.length === 0) return false;
        if (reqSeizureSelectedDefendantIds.length === 0) return false;
        return reqSeizureSelectedDefendantIds.every((did) => {
            const drafts = reqSeizureDraftsByDefendant[did];
            return Array.isArray(drafts) && drafts.some((a) => String(a?.description ?? '').trim().length > 0);
        });
    })();

    useEffect(() => {
        if (!reqIsDefendantBailEntry) return;
        setReqBailByPartyId((prev) => {
            const next: Record<string, PartyBailDraft> = {};
            for (const partyId of effectiveRequestPartyIds) {
                next[partyId] = prev[partyId] ?? emptyPartyBailDraft();
            }
            return next;
        });
    }, [reqIsDefendantBailEntry, effectiveRequestPartyIds, setReqBailByPartyId]);

    useEffect(() => {
        if (!reqNeedsDetentionDateRange) return;
        setReqDetentionByPartyId((prev) => {
            const next: Record<string, PartyDetentionDraft> = {};
            for (const partyId of effectiveRequestPartyIds) {
                next[partyId] = prev[partyId] ?? {
                    startDate: reqDetentionStartDate,
                    endDate: reqDetentionEndDate,
                };
            }
            return next;
        });
    }, [reqNeedsDetentionDateRange, effectiveRequestPartyIds, reqDetentionStartDate, reqDetentionEndDate, setReqDetentionByPartyId]);

    const onAssetSeizureDraftsChange = (did: string, drafts: SeizedAssetDraft[]) => {
        setReqSeizureDraftsByDefendant((prev) => ({ ...prev, [did]: drafts }));
    };

    return {
        reqNeedsDetentionDateRange,
        reqJuvenileDetentionLocked,
        showJuvenileArrestLegalHint,
        detentionRangeValid,
        reqIsDefendantBailEntry,
        showPartyPickerFormUi,
        bailTargetDefendantIds,
        bailFormValid,
        handleReqBailUnifiedChange,
        handleReqDetentionUnifiedChange,
        fugitiveDefendants,
        reqIsAssetSeizureEntry,
        assetSeizureFormValid,
        onAssetSeizureDraftsChange,
    };
}
