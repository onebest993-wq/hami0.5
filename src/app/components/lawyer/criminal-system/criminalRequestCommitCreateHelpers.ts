import { isJudicialDecisionTemplate } from './proceduralRequestTypes';
import {
    buildAssetSeizureInputFromDrafts,
    buildCriminalRequestPayloadBase,
    buildDefendantBailPayloadFromDraft,
    type BuildRequestPayloadBaseInput,
    type PartyBailDraftLike,
    type SeizureDraftLike,
} from './criminalRequestCommitPayloadBuilders';

export type DetentionDraftLike = {
    startDate?: string;
    endDate?: string;
};

export type CommitCreateLawyerRequestDeps = BuildRequestPayloadBaseInput & {
    id: string;
    showLegalToast: (message: string, durationMs?: number) => void;
    createLawyerRequest: (
        id: string,
        payload: Record<string, unknown>,
    ) => { error?: string; requestId?: string };
    syncRequestUxAfterCreate: (requestId: string) => void;
    reqLegalArticleBasis: string;
    reqReferredCourtName: string;
    reqBailByPartyId: Record<string, PartyBailDraftLike | undefined>;
    reqBailUnified: boolean;
    reqDetentionByPartyId: Record<string, DetentionDraftLike | undefined>;
    reqDetentionStartDate: string;
    reqDetentionEndDate: string;
    reqDetentionUnified: boolean;
    reqSeizureSelectedDefendantIds: string[];
    reqSeizureDraftsByDefendant: Record<string, SeizureDraftLike[] | undefined>;
    reqIsAssetSeizureEntry: boolean;
    reqIsDefendantBailEntry: boolean;
    bailTargetDefendantIds: string[];
    reqNeedsDetentionDateRange: boolean;
    effectiveRequestPartyIds: string[];
};

export function commitCreateLawyerRequest(
    deps: CommitCreateLawyerRequestDeps,
    opts?: { silent?: boolean },
): string | null {
    const {
        id,
        showLegalToast,
        createLawyerRequest,
        syncRequestUxAfterCreate,
        reqTypeTemplate,
        reqCustomTypeName,
        reqIsAppealable,
        reqDate,
        reqNote,
        reqLegalArticleBasis,
        reqReferredCourtName,
        reqBailByPartyId,
        reqBailUnified,
        reqDetentionByPartyId,
        reqDetentionStartDate,
        reqDetentionEndDate,
        reqDetentionUnified,
        reqSeizureSelectedDefendantIds,
        reqSeizureDraftsByDefendant,
        reqIsAssetSeizureEntry,
        reqIsDefendantBailEntry,
        bailTargetDefendantIds,
        reqNeedsDetentionDateRange,
        effectiveRequestPartyIds,
    } = deps;

    const buildRequestPayloadBase = () => buildCriminalRequestPayloadBase(deps);

    const assetSeizureInput = buildAssetSeizureInputFromDrafts(
        reqIsAssetSeizureEntry,
        reqSeizureSelectedDefendantIds,
        reqSeizureDraftsByDefendant,
    );

    /**
     * `defendantIds` لإجراء حجز الأموال = الهاربون المُختارون داخل المُحرِّر،
     * وليس قائمة `reqDefendantIds` الافتراضية (التي يُديرها party picker المغلق
     * لهذا القالب لأنّه يدير اختياره داخلياً).
     */
    const defendantIdsForPayload = reqIsAssetSeizureEntry
        ? reqSeizureSelectedDefendantIds.length > 0
            ? reqSeizureSelectedDefendantIds.slice()
            : undefined
        : reqIsDefendantBailEntry
          ? bailTargetDefendantIds.length
              ? bailTargetDefendantIds.slice()
              : buildRequestPayloadBase().defendantIds
          : buildRequestPayloadBase().defendantIds;

    const resolveDetentionDates = (partyId: string) => {
        const draft = reqDetentionByPartyId[partyId];
        return {
            start: (draft?.startDate ?? reqDetentionStartDate).trim() || undefined,
            end: (draft?.endDate ?? reqDetentionEndDate).trim() || undefined,
        };
    };

    const basePayload = {
        requestDate: reqDate.trim(),
        lawyerNote: reqNote.trim(),
        proceduralTemplate: reqTypeTemplate.trim(),
        customTypeName: reqCustomTypeName.trim(),
        isAppealable: reqIsAppealable,
        legalArticleBasis: reqLegalArticleBasis.trim() || undefined,
        referredCourtName: reqReferredCourtName.trim() || undefined,
        assetSeizure: assetSeizureInput,
    };

    const bailTargetIds = reqIsDefendantBailEntry
        ? bailTargetDefendantIds.length
            ? bailTargetDefendantIds
            : effectiveRequestPartyIds
        : [];

    if (reqIsDefendantBailEntry && bailTargetIds.length > 0) {
        if (reqBailUnified && bailTargetIds.length > 1) {
            const defendantBail = buildDefendantBailPayloadFromDraft(reqBailByPartyId[bailTargetIds[0]!]);
            if (!defendantBail) {
                showLegalToast('أكمل تفاصيل الكفالة لجميع المتهمين المُؤشَّرين.', 5000);
                return null;
            }
            const { error, requestId } = createLawyerRequest(id, {
                ...basePayload,
                defendantIds: bailTargetIds.slice(),
                defendantBail,
            });
            if (error) {
                showLegalToast(error, 5000);
                return null;
            }
            if (requestId) syncRequestUxAfterCreate(requestId);
            if (!opts?.silent) {
                showLegalToast('✓ تم توثيق القرار في السجل.', 5000);
            }
            return requestId ?? null;
        }

        let lastRequestId: string | null = null;
        for (const partyId of bailTargetIds) {
            const defendantBail = buildDefendantBailPayloadFromDraft(reqBailByPartyId[partyId]);
            if (!defendantBail) {
                showLegalToast('أكمل تفاصيل الكفالة لكل متهم مُؤشَّر.', 5000);
                return null;
            }
            const { error, requestId } = createLawyerRequest(id, {
                ...basePayload,
                defendantIds: [partyId],
                defendantBail,
            });
            if (error) {
                showLegalToast(error, 5000);
                return null;
            }
            if (requestId) {
                syncRequestUxAfterCreate(requestId);
                lastRequestId = requestId;
            }
        }
        if (!opts?.silent) {
            showLegalToast('✓ تم توثيق القرار في السجل.', 5000);
        }
        return lastRequestId;
    }

    const detentionTargetIds =
        reqNeedsDetentionDateRange && Array.isArray(defendantIdsForPayload)
            ? defendantIdsForPayload
            : [];

    if (reqNeedsDetentionDateRange && detentionTargetIds.length > 1 && !reqDetentionUnified) {
        let lastRequestId: string | null = null;
        for (const partyId of detentionTargetIds) {
            const { start, end } = resolveDetentionDates(partyId);
            const { error, requestId } = createLawyerRequest(id, {
                ...basePayload,
                defendantIds: [partyId],
                detentionStartDate: start,
                detentionEndDate: end,
            });
            if (error) {
                showLegalToast(error, 5000);
                return null;
            }
            if (requestId) {
                syncRequestUxAfterCreate(requestId);
                lastRequestId = requestId;
            }
        }
        if (!opts?.silent) {
            const msg = isJudicialDecisionTemplate(reqTypeTemplate)
                ? '✓ تم توثيق القرار في السجل.'
                : '✓ تم تسجيل الطلب.';
            showLegalToast(msg, 5000);
        }
        return lastRequestId;
    }

    const singleDetentionPartyId =
        reqNeedsDetentionDateRange && detentionTargetIds.length >= 1
            ? detentionTargetIds.length === 1 || reqDetentionUnified
                ? detentionTargetIds[0]
                : undefined
            : undefined;
    const singleDetention = singleDetentionPartyId
        ? resolveDetentionDates(singleDetentionPartyId)
        : {
              start: reqDetentionStartDate.trim() || undefined,
              end: reqDetentionEndDate.trim() || undefined,
          };

    const { error, requestId } = createLawyerRequest(id, {
        ...basePayload,
        defendantIds: defendantIdsForPayload,
        detentionStartDate: singleDetention.start,
        detentionEndDate: singleDetention.end,
    });
    if (error) {
        showLegalToast(error, 5000);
        return null;
    }
    if (requestId) syncRequestUxAfterCreate(requestId);
    if (!opts?.silent) {
        const msg = isJudicialDecisionTemplate(reqTypeTemplate)
            ? '✓ تم توثيق القرار في السجل.'
            : '✓ تم تسجيل الطلب.';
        showLegalToast(msg, 5000);
    }
    return requestId ?? null;
}
