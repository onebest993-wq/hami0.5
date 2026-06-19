import type { CaseStage, Party } from '../../LawyerShared';
import {
    isAppellantAppealRole,
    isAppelleeAppealRole,
    isInterpleaderThirdPartyRole,
    partitionPartiesForHeader,
} from './partyRoleClassification';
import {
    listAppellantPartiesForAppeal,
    type AppealSide,
} from './appealPartyEngine';

export function isPartialMeritJudgmentType(judgmentType?: string | null): boolean {
    const t = String(judgmentType ?? '').trim();
    if (!t) return false;
    return (
        t.includes('جزئ')
        || t.includes('جزئياً')
        || t === 'رد الدعوى جزئياً'
        || t === 'إجابة الدعوى جزئياً'
        || t === 'فسخ الحكم المستأنف جزئياً'
        || t === 'إجابة دعوى المدعي (جزئياً)'
        || t === 'إجابة طلب الشخص الثالث (جزئياً)'
    );
}

export function isPartialMeritDecisionText(text?: string | null): boolean {
    const t = String(text ?? '');
    return (
        t.includes('جزئ')
        || t.includes('جزئياً')
        || t.includes('محسومة جزئياً')
        || t.includes('كسب/خسارة جزئية')
        || t.includes('خسارة جزئية')
        || t.includes('ربح جزئي')
    );
}

function partyIdKey(id: number | string | undefined | null): string {
    return String(id ?? '').trim();
}

function normalizeAppealSide(raw?: string | null): AppealSide | null {
    const s = String(raw ?? '').trim();
    if (s.includes('اختصام') || s.includes('الشخص الثالث')) return null;
    if (s.includes('مدعى')) return 'المدعى عليه';
    if (s.includes('مدعي')) return 'المدعي';
    return null;
}

function inferInitialAppellantIds(appealStage: CaseStage): Array<number | string> {
    return (appealStage.parties ?? [])
        .filter((p) => isAppellantAppealRole(String(p.role ?? '')))
        .map((p) => p.id)
        .filter((id) => id != null) as Array<number | string>;
}

function resolvePriorJudgmentType(
    appealStage: CaseStage,
    previousStage: CaseStage | null | undefined,
): string | null {
    const fromMeta = appealStage.appealMetadata?.priorJudgmentType;
    if (fromMeta && isPartialMeritJudgmentType(fromMeta)) return fromMeta;

    const fromPrevType = previousStage?.lastJudgmentType;
    if (fromPrevType && isPartialMeritJudgmentType(fromPrevType)) return fromPrevType;
    if (fromMeta) return fromMeta;

    const fd = String(previousStage?.finalDecision ?? '');
    if (isPartialMeritDecisionText(fd)) return fd;
    return fromMeta ?? fromPrevType ?? null;
}

function resolvePreviousStage(
    stages: CaseStage[] | undefined,
    appealStageIndex: number,
): CaseStage | null {
    if (!Array.isArray(stages) || appealStageIndex <= 0) return null;
    return stages[appealStageIndex - 1] ?? null;
}

function hasCrossAppealFiled(party: Party, crossAppealedIds: Set<string>): boolean {
    const id = partyIdKey(party.id);
    return crossAppealedIds.has(id) || String(party.role ?? '').includes('متقابل');
}

/** أطراف من المرحلة السابقة على جانب الطاعن ولم ينضموا للطعن الأول */
function resolveOmittedCoLitigants(input: {
    previousStage: CaseStage | null;
    appellantSide: AppealSide | null;
    initialAppellantIds: Set<string>;
    crossAppealedIds: Set<string>;
    appealStageParties: Party[];
}): Party[] {
    const { previousStage, appellantSide, initialAppellantIds, crossAppealedIds, appealStageParties } = input;
    if (!previousStage || !appellantSide) return [];

    const priorOnSide = listAppellantPartiesForAppeal(
        previousStage.parties ?? [],
        appellantSide,
        previousStage.incidentalCases,
    );
    const appealById = new Map(
        appealStageParties.map((party) => [partyIdKey(party.id), party]),
    );

    const out: Party[] = [];
    for (const prior of priorOnSide) {
        const id = partyIdKey(prior.id);
        if (!id || initialAppellantIds.has(id)) continue;
        const onAppeal = appealById.get(id) ?? prior;
        if (hasCrossAppealFiled(onAppeal, crossAppealedIds)) continue;
        out.push(onAppeal);
    }
    return out;
}

/** كل من لم يطعن أولاً ولم يُسجَّل استئنافه المتقابل بعد */
function listPendingCrossAppealCandidates(
    appealStageParties: Party[],
    initialAppellantIds: Set<string>,
    crossAppealedIds: Set<string>,
): Party[] {
    return appealStageParties.filter((party) => {
        const id = partyIdKey(party.id);
        if (!id || initialAppellantIds.has(id)) return false;
        if (hasCrossAppealFiled(party, crossAppealedIds)) return false;
        if (isAppellantAppealRole(String(party.role ?? ''))) return false;
        return true;
    });
}

function mergeUniqueParties(...lists: Party[][]): Party[] {
    const seen = new Set<string>();
    const out: Party[] = [];
    for (const list of lists) {
        for (const party of list) {
            const key = partyIdKey(party.id);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            out.push(party);
        }
    }
    return out;
}

export type CrossAppealEligibility = {
    showButton: boolean;
    isPartialJudgment: boolean;
    hasStaggeredCoLitigants: boolean;
    pendingCrossAppellants: Party[];
    crossAppellees: Party[];
    filedCrossAppellants: Party[];
};

export function resolveCrossAppealEligibility(input: {
    appealStage: CaseStage;
    stages?: CaseStage[];
    appealStageIndex?: number;
}): CrossAppealEligibility {
    const { appealStage, stages, appealStageIndex = -1 } = input;
    const meta = appealStage.appealMetadata;
    const previousStage =
        appealStageIndex >= 0
            ? resolvePreviousStage(stages, appealStageIndex)
            : null;

    const priorJudgmentType = resolvePriorJudgmentType(appealStage, previousStage);
    const isPartialJudgment =
        isPartialMeritJudgmentType(priorJudgmentType)
        || isPartialMeritDecisionText(previousStage?.finalDecision)
        || isPartialMeritDecisionText(previousStage?.lastJudgmentType);

    const appellantSide = normalizeAppealSide(meta?.appellant);
    const initialAppellantIds = new Set(
        (meta?.initialAppellantPartyIds?.length
            ? meta.initialAppellantPartyIds
            : inferInitialAppellantIds(appealStage)
        ).map(partyIdKey),
    );

    const crossAppealedIds = new Set(
        (meta?.crossAppealPartyIds ?? []).map(partyIdKey),
    );

    const appealStageParties = appealStage.parties ?? [];
    const { plaintiffs, defendants } = partitionPartiesForHeader(appealStageParties);
    const appealAppellants = plaintiffs.filter((p) => isAppellantAppealRole(String(p.role ?? '')));

    const appealAppellees = defendants.filter((p) => {
        const role = String(p.role ?? '');
        if (isAppellantAppealRole(role)) return false;
        if (isAppelleeAppealRole(role)) return true;
        if (isInterpleaderThirdPartyRole(role) || role.includes('شخص ثالث')) return true;
        return false;
    });

    const filedCrossAppellants = appealAppellees.filter((p) =>
        hasCrossAppealFiled(p, crossAppealedIds),
    );

    const omittedCoLitigants = resolveOmittedCoLitigants({
        previousStage,
        appellantSide,
        initialAppellantIds,
        crossAppealedIds,
        appealStageParties,
    });
    const hasStaggeredCoLitigants = omittedCoLitigants.length > 0;

    const pendingInterpleaderAppellees = appealAppellees.filter((p) => {
        if (!isInterpleaderThirdPartyRole(String(p.role ?? ''))) return false;
        return !hasCrossAppealFiled(p, crossAppealedIds);
    });

    const partialCandidates = isPartialJudgment
        ? listPendingCrossAppealCandidates(
              appealStageParties,
              initialAppellantIds,
              crossAppealedIds,
          )
        : [];

    const pendingCrossAppellants = mergeUniqueParties(
        omittedCoLitigants,
        isPartialJudgment ? partialCandidates : [],
        !isPartialJudgment ? pendingInterpleaderAppellees : [],
    );

    const showButton =
        pendingCrossAppellants.length > 0
        && (isPartialJudgment || hasStaggeredCoLitigants || pendingInterpleaderAppellees.length > 0);

    return {
        showButton,
        isPartialJudgment,
        hasStaggeredCoLitigants,
        pendingCrossAppellants,
        crossAppellees: appealAppellants,
        filedCrossAppellants,
    };
}

export function markPartiesAsCrossAppellants(
    parties: Party[],
    partyIds: Array<number | string>,
): Party[] {
    const idSet = new Set(partyIds.map(partyIdKey));
    return parties.map((party) => {
        if (!idSet.has(partyIdKey(party.id))) return party;
        const role = String(party.role ?? '');
        if (role.includes('متقابل')) return party;
        return {
            ...party,
            role: role.includes('المستأنف عليه')
                ? `${role} (مستأنف متقابل)`
                : `${role} — مستأنف متقابل`,
        };
    });
}
