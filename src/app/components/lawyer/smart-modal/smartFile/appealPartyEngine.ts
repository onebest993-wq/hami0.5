import type { IncidentalCase, Party } from '../../LawyerShared';
import {
    resolveClientPartyBucket,
    resolveLawyerJudgmentBucket,
} from './interpleaderJudgmentEngine';
import {
    flipPartiesForAppealStage,
    resolveAppealRoleTitles,
    resolveOpponentAsAppellant,
    type AppealPartyFlipSelection,
} from './appealPartyFlip';
import { isAppealStageName } from './judgmentTypes';
import { resolveLawyerOriginalSideInAbsentObjection } from './absentJudgmentFlow';
import {
    hasAbsentObjectionPartyRoles,
    isAbsentObjectedRole,
    isAbsentObjectorRole,
    isAppellantAppealRole,
    isAppelleeAppealRole,
    isInterpleaderThirdPartyRole,
    isDefendantSideRole,
    isPlaintiffSideRole,
    isThirdPartyRole,
} from './partyRoleClassification';
import { isGhayabiObjectionAppealType } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import type { CaseStage } from '../../LawyerShared';
import { INTERPLEADER_APPELLANT_SIDE } from './appealInterpleaderConstants';
import { isDisputeIndivisible } from '@/app/domain/lawsuit/partyJudgmentDisposition';
import {
    defaultIncludedAppellantIds,
    listAppellantPartiesForAppeal,
    normalizePartyIdKey,
    partyIdInList,
    resolveSelectedOpponentPartyIds,
    type AppealSide,
} from './appealPartyListHelpers';
export {
    defaultIncludedAppellantIds,
    defaultIncludedOpponentIds,
    inferAppellantSideFromSelectedParties,
    listAppellantPartiesForAppeal,
    listOpponentPartiesForAppeal,
    normalizePartyIdKey,
    partyBelongsToAppealSide,
    partyIdInList,
    resolveSelectedOpponentPartyIds,
    type AppealSide,
} from './appealPartyListHelpers';
import {
    filterPartiesForAppealDossier,
    type AppealDossierLayout,
} from './interpleaderAppealEngine';

function findIncidentalForParty(party: Party, incidentalCases?: IncidentalCase[]): IncidentalCase | undefined {
    if (!Array.isArray(incidentalCases)) return undefined;
    const name = String(party.name ?? '').trim();
    return incidentalCases.find(
        (c) =>
            c.type === 'thirdParty'
            && c.status === 'active'
            && c.entryDecision !== 'rejected'
            && String(c.partyName ?? '').trim() === name,
    );
}

function partyIdSet(ids: Array<number | string>): Set<string> {
    return new Set(ids.map(normalizePartyIdKey));
}

function partyIdInSet(set: Set<string>, partyId: number | string | null | undefined): boolean {
    return set.has(normalizePartyIdKey(partyId));
}

export function inferAppellantSideFromLawyer(
    representedParty?: string | null,
    parties?: Array<{ role?: string; isClient?: boolean; side?: 'right' | 'left'; lawyer?: { isMyOffice?: boolean } }>,
): AppealSide {
    const objectionOriginal = resolveLawyerOriginalSideInAbsentObjection(parties);
    if (objectionOriginal) return objectionOriginal;

    const bucket = resolveLawyerJudgmentBucket(representedParty, parties);
    if (bucket === 'defendant') return 'المدعى عليه';
    return 'المدعي';
}

function dedupeParties(parties: Party[]): Party[] {
    const seen = new Set<number | string>();
    const out: Party[] = [];
    for (const party of parties) {
        if (seen.has(party.id)) continue;
        seen.add(party.id);
        out.push(party);
    }
    return out;
}

function listInterpleaderPartiesForAppeal(parties: Party[]): Party[] {
    return parties.filter((p) => isInterpleaderThirdPartyRole(String(p.role ?? '')));
}

/** تسجيل طعن الخصم — يشمل الأشخاص الثالثة (اختصامي/انضمامي) كأطراف أصلية */
export function resolveOpponentRegistrationAppealLayout(
    parties: Party[],
    representedParty: string | null | undefined,
    incidentalCases?: IncidentalCase[],
): AppealDossierLayout {
    const lawyerBucket =
        resolveClientPartyBucket(parties)
        ?? resolveLawyerJudgmentBucket(representedParty, parties);
    const opponentSide = resolveOpponentAsAppellant(representedParty, parties);
    const lawyerSide: AppealSide = opponentSide === 'المدعي' ? 'المدعى عليه' : 'المدعي';

    const opponentSideParties = listAppellantPartiesForAppeal(parties, opponentSide, incidentalCases);
    const lawyerSideParties = listAppellantPartiesForAppeal(parties, lawyerSide, incidentalCases);
    const interpleaders = listInterpleaderPartiesForAppeal(parties);

    const appellantParties = dedupeParties([...opponentSideParties, ...interpleaders]);
    const opponentParties = dedupeParties([...lawyerSideParties, ...interpleaders]);

    return {
        mode: 'standard',
        appellantParties,
        opponentParties,
        defaultAppellantIds: appellantParties.map((p) => p.id),
        defaultOpponentIds: opponentParties
            .filter((p) => !isInterpleaderThirdPartyRole(String(p.role ?? '')))
            .map((p) => p.id),
        appellantSideLabel: 'الطرف الذي قام بالطعن',
        opponentSideLabel: 'المخاصَمون في الطعن',
        appellantLegalSide: opponentSide,
        lawyerBucket,
    };
}

export function isInterpleaderAppealParty(party: Party): boolean {
    return isInterpleaderThirdPartyRole(String(party.role ?? ''));
}

/** أطراف ثالثة (منضم / اختصامي) أو دعاوى حادثة نشطة */
function hasThirdPartyInAppealContext(
    parties: Party[],
    incidentalCases?: IncidentalCase[],
): boolean {
    if (
        parties.some(
            (p) => isThirdPartyRole(p.role) || isInterpleaderThirdPartyRole(String(p.role ?? '')),
        )
    ) {
        return true;
    }
    return (incidentalCases ?? []).some(
        (c) => c.type === 'thirdParty' && c.status === 'active' && c.entryDecision !== 'rejected',
    );
}

/** إظهار حاوية اختيار الأطراف — حتى الطرف الواحد يُكتب اسمه، لا تُخفى القائمة. */
export function resolveAppealPartyPickerVisibility(params: {
    dossierLayout: AppealDossierLayout;
    visibleAppellantParties: Party[];
    visibleOpponentParties: Party[];
    parties: Party[];
    incidentalCases?: IncidentalCase[];
}): { showAppellantPicker: boolean; showOpponentPicker: boolean } {
    const { dossierLayout, visibleAppellantParties, visibleOpponentParties, parties, incidentalCases } =
        params;

    if (dossierLayout.mode !== 'standard') {
        return {
            showAppellantPicker: visibleAppellantParties.length > 0,
            showOpponentPicker: visibleOpponentParties.length > 0,
        };
    }

    const appellantPrimary = visibleAppellantParties.filter((p) => !isInterpleaderAppealParty(p));
    const opponentPrimary = visibleOpponentParties.filter((p) => !isInterpleaderAppealParty(p));

    if (!hasThirdPartyInAppealContext(parties, incidentalCases)) {
        return {
            showAppellantPicker: appellantPrimary.length > 0,
            showOpponentPicker: opponentPrimary.length > 0,
        };
    }

    return {
        showAppellantPicker:
            appellantPrimary.length > 0 || visibleAppellantParties.some(isInterpleaderAppealParty),
        showOpponentPicker:
            opponentPrimary.length > 0 || visibleOpponentParties.some(isInterpleaderAppealParty),
    };
}

/** الاختصامي لا يظهر في قائمة الطاعنين إذا اختير كمخاصَم — والعكس */
export function filterVisibleAppellantParties(
    appellantParties: Party[],
    selectedOpponentIds: Array<number | string>,
): Party[] {
    const blocked = new Set(selectedOpponentIds.map(String));
    return appellantParties.filter(
        (p) => !isInterpleaderAppealParty(p) || !blocked.has(String(p.id)),
    );
}

export function filterVisibleOpponentParties(
    opponentParties: Party[],
    selectedAppellantIds: Array<number | string>,
): Party[] {
    const blocked = new Set(selectedAppellantIds.map(String));
    return opponentParties.filter(
        (p) => !isInterpleaderAppealParty(p) || !blocked.has(String(p.id)),
    );
}

export function resolveAppellantLegalSideFromSelection(
    selectedAppellantIds: Array<number | string>,
    appellantParties: Party[],
    fallback: string,
): string {
    const selected = appellantParties.filter((p) => partyIdInList(selectedAppellantIds, p.id));
    if (selected.length === 0) return fallback;
    const allInterpleader = selected.every((p) =>
        isInterpleaderThirdPartyRole(String(p.role ?? '')),
    );
    if (allInterpleader) return INTERPLEADER_APPELLANT_SIDE;
    return fallback;
}

function isInterpleaderPartyRecord(
    party: Party,
    incidentalCases: IncidentalCase[] | undefined,
): boolean {
    const role = String(party.role ?? '');
    if (isInterpleaderThirdPartyRole(role)) return true;
    const inc = findIncidentalForParty(party, incidentalCases);
    return inc?.thirdPartyEntryMode === 'interpleader';
}

/** يُبقى المدعي/المدعى عليه المرافق في الإضبارة لاستئناف متقابل لاحق */
function appendOmittedAppellantSideCoLitigants(
    parties: Party[],
    filtered: Party[],
    appellantSide: AppealSide,
    incidentalCases: IncidentalCase[] | undefined,
    includedAppellantPartyIds: Array<number | string> | undefined,
    disputeIntegrity?: string | null,
): Party[] {
    if (!isDisputeIndivisible(disputeIntegrity)) return filtered;
    if (!includedAppellantPartyIds?.length) return filtered;
    if (appellantSide !== 'المدعي') return filtered;

    const appellantIds = partyIdSet(includedAppellantPartyIds);
    const keptIds = partyIdSet(filtered.map((p) => p.id));
    const omitted = listAppellantPartiesForAppeal(parties, appellantSide, incidentalCases).filter(
        (party) =>
            !partyIdInSet(appellantIds, party.id)
            && !partyIdInSet(keptIds, party.id),
    );
    if (omitted.length === 0) return filtered;
    return dedupeParties([...filtered, ...omitted]);
}

export function filterPartiesBeforeAppealFlip(
    parties: Party[],
    appellantSide: AppealSide,
    incidentalCases: IncidentalCase[] | undefined,
    includedOpponentPartyIds: Array<number | string> | undefined,
    includedAppellantPartyIds?: Array<number | string>,
    disputeIntegrity?: string | null,
): Party[] {
    const appellantIdList =
        includedAppellantPartyIds ?? defaultIncludedAppellantIds(parties, appellantSide, incidentalCases);
    const appellantIds = partyIdSet(appellantIdList);
    const opponentIds = partyIdSet(
        resolveSelectedOpponentPartyIds(
            parties,
            appellantIdList,
            includedOpponentPartyIds,
            incidentalCases,
        ),
    );

    const filtered = parties.filter((party) => {
        if (isInterpleaderPartyRecord(party, incidentalCases)) {
            return partyIdInSet(appellantIds, party.id) || partyIdInSet(opponentIds, party.id);
        }
        if (partyIdInSet(appellantIds, party.id) || partyIdInSet(opponentIds, party.id)) return true;
        return false;
    });

    return appendOmittedAppellantSideCoLitigants(
        parties,
        filtered,
        appellantSide,
        incidentalCases,
        includedAppellantPartyIds,
        disputeIntegrity,
    );
}

function buildAppealFlipSelection(
    includedAppellantPartyIds?: Array<number | string>,
    includedOpponentPartyIds?: Array<number | string>,
): AppealPartyFlipSelection | undefined {
    if (!includedAppellantPartyIds?.length && !includedOpponentPartyIds?.length) return undefined;
    return { includedAppellantPartyIds, includedOpponentPartyIds };
}

/** جانب الطاعن الأصلي (مدعي/مدعى عليه) لتصفية الأطراف الرئيسية — ليس «الشخص الثالث الاختصامي» */
function resolveFilterAppellantSide(
    appellant: string,
    dossierLayout?: AppealDossierLayout,
): AppealSide {
    if (appellant !== INTERPLEADER_APPELLANT_SIDE) {
        return appellant === 'المدعى عليه' || appellant.includes('مدعى عليه')
            ? 'المدعى عليه'
            : 'المدعي';
    }
    const mainLitigant = dossierLayout?.appellantParties.find(
        (party) => !isInterpleaderThirdPartyRole(String(party.role ?? '')),
    );
    if (mainLitigant && isPlaintiffSideRole(String(mainLitigant.role ?? ''))) return 'المدعي';
    if (mainLitigant && isDefendantSideRole(String(mainLitigant.role ?? ''))) return 'المدعى عليه';
    return 'المدعى عليه';
}

/** إصلاح اختصامي بلا انقلاب في مراحل الطعن المحفوظة سابقاً */
export function repairAppealStagePartyRoles(
    parties: Party[],
    stage?: CaseStage | null,
): Party[] {
    if (!stage || !isAppealStageName(stage.stageName)) return parties;

    const meta = stage.appealMetadata;
    const appellantIdSet = partyIdSet([
        ...(meta?.initialAppellantPartyIds ?? []),
        ...(meta?.crossAppealPartyIds ?? []),
    ]);
    if (appellantIdSet.size === 0) return parties;

    const appealType = String(meta?.appealType ?? 'استئناف');
    const { appellantTitle, appelleeTitle } = resolveAppealRoleTitles(appealType);

    return parties.map((party) => {
        const role = String(party.role ?? '').trim();
        if (!isInterpleaderThirdPartyRole(role)) return party;
        if (isAppellantAppealRole(role) || isAppelleeAppealRole(role)) return party;

        const onAppellantSide = partyIdInSet(appellantIdSet, party.id);
        return {
            ...party,
            role: onAppellantSide
                ? `${appellantTitle} (شخص ثالث اختصامي)`
                : `${appelleeTitle} (شخص ثالث اختصامي)`,
            side: onAppellantSide ? 'right' : 'left',
        };
    });
}

/**
 * استئناف/تمييز من مرحلة الاعتراض: الخصومة هي المعترض والمعترض عليه فقط.
 * شركاء البداءة غير الداخلين في الاعتراض لا يُقلَبون مستأنفاً عليهم.
 */
export function litigantsForAppealHopFromObjection(
    parties: Party[],
    appealType: string,
): Party[] {
    if (isGhayabiObjectionAppealType(appealType)) return parties;
    if (!hasAbsentObjectionPartyRoles(parties)) return parties;
    const involved = parties.filter((party) => {
        const role = String(party.role ?? '');
        return isAbsentObjectorRole(role) || isAbsentObjectedRole(role);
    });
    return involved.length > 0 ? involved : parties;
}

export function buildAppealStageParties(
    parties: Party[],
    appellant: string,
    appealType: string,
    incidentalCases: IncidentalCase[] | undefined,
    includedOpponentPartyIds?: Array<number | string>,
    includedAppellantPartyIds?: Array<number | string>,
    dossierLayout?: AppealDossierLayout,
    disputeIntegrity?: string | null,
): Party[] {
    const hopParties = litigantsForAppealHopFromObjection(parties, appealType);
    const appellantSide = resolveFilterAppellantSide(appellant, dossierLayout);
    const defaultAppellantIds = defaultIncludedAppellantIds(hopParties, appellantSide, incidentalCases);
    const requestedAppellant = includedAppellantPartyIds?.filter((id) =>
        hopParties.some((party) => normalizePartyIdKey(party.id) === normalizePartyIdKey(id)),
    );
    const appellantIdList = requestedAppellant?.length ? requestedAppellant : defaultAppellantIds;
    const opponentIdList = resolveSelectedOpponentPartyIds(
        hopParties,
        appellantIdList,
        includedOpponentPartyIds,
        incidentalCases,
    );
    const flipSelection = buildAppealFlipSelection(appellantIdList, opponentIdList);

    if (dossierLayout && dossierLayout.mode !== 'standard') {
        const filtered = filterPartiesForAppealDossier(
            hopParties,
            dossierLayout,
            incidentalCases,
            appellantIdList,
            opponentIdList,
            dossierLayout,
        );
        return flipPartiesForAppealStage(
            filtered,
            dossierLayout.appellantLegalSide,
            appealType,
            incidentalCases,
            flipSelection,
            disputeIntegrity,
        );
    }

    const filtered = filterPartiesBeforeAppealFlip(
        hopParties,
        appellantSide,
        incidentalCases,
        opponentIdList,
        appellantIdList,
        disputeIntegrity,
    );
    return flipPartiesForAppealStage(
        filtered,
        appellant,
        appealType,
        incidentalCases,
        flipSelection,
        disputeIntegrity,
    );
}

export { resolveAppealDossierLayout, type AppealDossierLayout } from './interpleaderAppealEngine';
