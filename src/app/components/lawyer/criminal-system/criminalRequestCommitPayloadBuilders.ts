import type { CriminalDefendant, OurRepresentation } from './criminalStore';
import type { CriminalActionParty } from './criminalStagePresentationCore';
import type { DecisionsPartyScope } from './juvenileInvestigationRules';
import { resolveEffectiveDefendantScopeIds } from './partyPersonalStage';
import { resolveRequestPartyIdsForPayload } from './requestPartySelection';
import { resolveStoredRequestTypeFields } from './proceduralRequestTypes';
import { emptyPartyBailDraft } from './components/concernedPartyDecisionPickerDraft';

type RequestPartyCtx = {
    isUnknownPerpetrator: boolean;
    isDefense: boolean;
    complainantsCount: number;
    defendantsCount: number;
};

export type PartyBailDraftLike = ReturnType<typeof emptyPartyBailDraft>;

export type SeizureDraftLike = {
    description?: string;
    referenceNumber?: string;
    seizureDate?: string;
    notes?: string;
};

export type BuildRequestPayloadBaseInput = {
    reqDefendantIds: string[];
    reqNeedsPurgeDefendantScope: boolean;
    defendants: CriminalDefendant[];
    reqTypeTemplate: string;
    autoRequestPartyId: string | null;
    requestEligibleParties: CriminalActionParty[];
    ourRepresentation: OurRepresentation;
    requestPartyCtx: RequestPartyCtx;
    requestDecisionsScope: DecisionsPartyScope | undefined;
    reqCustomTypeName: string;
    reqIsAppealable: boolean;
    reqDate: string;
    reqNote: string;
};

export function buildCriminalRequestPayloadBase(input: BuildRequestPayloadBaseInput) {
    const {
        reqDefendantIds,
        reqNeedsPurgeDefendantScope,
        defendants,
        reqTypeTemplate,
        autoRequestPartyId,
        requestEligibleParties,
        ourRepresentation,
        requestPartyCtx,
        requestDecisionsScope,
        reqCustomTypeName,
        reqIsAppealable,
        reqDate,
        reqNote,
    } = input;

    const cleanedSelectedIds = Array.isArray(reqDefendantIds)
        ? reqDefendantIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0)
        : [];
    const defendantIds = reqNeedsPurgeDefendantScope
        ? resolveEffectiveDefendantScopeIds(defendants, cleanedSelectedIds, reqTypeTemplate.trim())
        : (resolveRequestPartyIdsForPayload(
                cleanedSelectedIds,
                autoRequestPartyId,
                requestEligibleParties,
                reqTypeTemplate.trim(),
                ourRepresentation,
                requestPartyCtx,
                requestDecisionsScope,
            ) ?? []);
    const resolved = resolveStoredRequestTypeFields(
        reqTypeTemplate.trim(),
        reqCustomTypeName.trim(),
        reqIsAppealable,
    );
    return {
        requestDate: reqDate.trim(),
        type: resolved.type,
        lawyerNote: reqNote.trim(),
        defendantIds: defendantIds.length ? defendantIds : undefined,
        proceduralTemplate: resolved.proceduralTemplate,
        isAppealable: resolved.isAppealable,
    };
}

export function buildDefendantBailPayloadFromDraft(
    draft: PartyBailDraftLike | undefined,
):
    | { kind: 'financial'; bailAmount: string }
    | { kind: 'personal'; guarantors: Array<{ id: string; fullName: string }> }
    | undefined {
    const resolved = draft ?? emptyPartyBailDraft();
    if (resolved.kind === 'financial') {
        const amt = resolved.bailAmount.trim();
        if (!amt) return undefined;
        return { kind: 'financial' as const, bailAmount: amt };
    }
    if (resolved.kind === 'personal') {
        const guarantors = resolved.guarantors
            .map((g) => ({
                id: g.id,
                fullName: String(g.fullName ?? '').trim(),
            }))
            .filter((g) => g.fullName.length > 0);
        if (!guarantors.length) return undefined;
        return { kind: 'personal' as const, guarantors };
    }
    return undefined;
}

export type AssetItemPayload = {
    description: string;
    referenceNumber?: string;
    seizureDate?: string;
    notes?: string;
};

export type PerDefendantAssetSeizurePayload = { defendantId: string; assets: AssetItemPayload[] };

/**
 * بيانات «حجز الأموال» — تُجمَّع لكل متهم هارب مُختار.
 * نُسقط الأصناف الفارغة (بدون وصف) قبل التمرير للمتجر.
 */
export function buildAssetSeizureInputFromDrafts(
    reqIsAssetSeizureEntry: boolean,
    reqSeizureSelectedDefendantIds: string[],
    reqSeizureDraftsByDefendant: Record<string, SeizureDraftLike[] | undefined>,
): { perDefendant: PerDefendantAssetSeizurePayload[] } | undefined {
    if (!reqIsAssetSeizureEntry) return undefined;
    const perDefendant = reqSeizureSelectedDefendantIds
        .map((did): PerDefendantAssetSeizurePayload | null => {
            const drafts = Array.isArray(reqSeizureDraftsByDefendant[did])
                ? reqSeizureDraftsByDefendant[did]!
                : [];
            const assets = drafts
                .map((d): AssetItemPayload | null => {
                    const description = String(d?.description ?? '').trim();
                    if (!description) return null;
                    return {
                        description,
                        referenceNumber: String(d?.referenceNumber ?? '').trim() || undefined,
                        seizureDate: String(d?.seizureDate ?? '').trim() || undefined,
                        notes: String(d?.notes ?? '').trim() || undefined,
                    };
                })
                .filter((x): x is AssetItemPayload => x !== null);
            if (!assets.length) return null;
            return { defendantId: did, assets };
        })
        .filter((x): x is PerDefendantAssetSeizurePayload => x !== null);
    return perDefendant.length ? { perDefendant } : undefined;
}
