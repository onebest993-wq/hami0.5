import type { CaseStage, Party } from '../../LawyerShared';
import {
    isPersonalStatusAppealContext,
    isPersonalStatusDossierFromStages,
} from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import {
    classifyPartySideBucket,
    extractParentheticalUnderlyingSide,
    isAppellantAppealRole,
    isAppelleeAppealRole,
    isDefendantSideRole,
    isInterpleaderThirdPartyRole,
    isPlaintiffSideRole,
    partitionPartiesForHeader,
} from './partyRoleClassification';
import {
    listAppellantPartiesForAppeal,
    type AppealSide,
} from './appealPartyEngine';
import {
    JUDGMENT_TYPE_FULL_WIN,
    JUDGMENT_TYPE_VOID,
    JUDGMENT_TYPE_WAIVER,
    JUDGMENT_TYPE_SULH,
    JUDGMENT_TYPE_SULH_LEGACY,
    isNonMeritTerminationType,
    resolveFirstInstanceHadoriAppealRights,
} from './judgmentTypes';
import {
    isInterpleaderJudgmentType,
    resolveInterpleaderHadoriAppealRights,
    type LawyerJudgmentBucket,
} from './interpleaderJudgmentEngine';

type PartyAppealBucket = LawyerJudgmentBucket;

export function isPartialMeritJudgmentType(judgmentType?: string | null): boolean {
    const t = String(judgmentType ?? '').trim();
    if (!t) return false;
    return (
        t.includes('جزئ')
        || t.includes('جزئياً')
        || t === 'رد الدعوى جزئياً'
        || t === 'إجابة الدعوى جزئياً'
        || t === 'فسخ الحكم البدائي جزئياً'
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

function normalizeJudgmentTypeForAppealRights(
    priorJudgmentType?: string | null,
    previousStage?: CaseStage | null,
): string | null {
    const raw = String(priorJudgmentType ?? '').trim();
    const previousFinal = String(previousStage?.finalDecision ?? '').trim();
    const previousType = String(previousStage?.lastJudgmentType ?? '').trim();

    if (isInterpleaderJudgmentType(raw)) return raw;
    if (isInterpleaderJudgmentType(previousType)) return previousType;

    if (
        isPartialMeritJudgmentType(raw)
        || isPartialMeritDecisionText(raw)
        || isPartialMeritDecisionText(previousFinal)
        || isPartialMeritDecisionText(previousType)
    ) {
        return 'رد الدعوى جزئياً';
    }

    const merged = `${raw} ${previousFinal} ${previousType}`;
    if (merged.includes('رد الدعوى كلياً')) return 'رد الدعوى كلياً';
    if (merged.includes('إجابة الدعوى بالكامل') || merged.includes('إجابة الدعوى ')) {
        return JUDGMENT_TYPE_FULL_WIN;
    }
    if (merged.includes(JUDGMENT_TYPE_SULH)) return JUDGMENT_TYPE_SULH;
    if (merged.includes(JUDGMENT_TYPE_SULH_LEGACY)) return JUDGMENT_TYPE_SULH_LEGACY;
    if (merged.includes(JUDGMENT_TYPE_WAIVER)) return JUDGMENT_TYPE_WAIVER;
    if (merged.includes(JUDGMENT_TYPE_VOID) || merged.includes('إبطال')) return JUDGMENT_TYPE_VOID;

    return raw || previousType || null;
}

function resolveCurrentRoleBucket(party: Party): PartyAppealBucket | null {
    const role = String(party.role ?? '');
    if (isInterpleaderThirdPartyRole(role)) return 'interpleader';

    const underlying = extractParentheticalUnderlyingSide(role);
    if (underlying === 'المدعي') return 'plaintiff';
    if (underlying === 'المدعى عليه') return 'defendant';

    if (isPlaintiffSideRole(role)) return 'plaintiff';
    if (isDefendantSideRole(role)) return 'defendant';
    return null;
}

function resolvePartyAppealBucket(
    party: Party,
    previousStage: CaseStage | null,
): PartyAppealBucket | null {
    if (previousStage) {
        const byId = previousStage.parties?.find(
            (prev) => partyIdKey(prev.id) !== '' && partyIdKey(prev.id) === partyIdKey(party.id),
        );
        if (byId) {
            if (isInterpleaderThirdPartyRole(String(byId.role ?? ''))) return 'interpleader';
            const bucket = classifyPartySideBucket(byId);
            if (bucket === 'plaintiff') return 'plaintiff';
            if (bucket === 'defendant') return 'defendant';
            if (bucket === 'third') return 'interpleader';
        }
    }
    return resolveCurrentRoleBucket(party);
}

function partyHasOwnAppealRight(input: {
    party: Party;
    previousStage: CaseStage | null;
    normalizedJudgmentType: string | null;
}): boolean {
    const { party, previousStage, normalizedJudgmentType } = input;
    if (!normalizedJudgmentType) return false;

    const bucket = resolvePartyAppealBucket(party, previousStage);
    if (!bucket) return false;

    if (isInterpleaderJudgmentType(normalizedJudgmentType)) {
        return resolveInterpleaderHadoriAppealRights(normalizedJudgmentType, bucket).action === 'self_appeal';
    }

    if (bucket === 'interpleader') {
        if (normalizedJudgmentType === JUDGMENT_TYPE_VOID) return false;
        if (isNonMeritTerminationType(normalizedJudgmentType)) return false;
        return true;
    }

    const lawyerSide =
        bucket === 'plaintiff'
            ? 'المدعي'
            : bucket === 'defendant'
              ? 'المدعى عليه'
              : null;
    if (!lawyerSide) return false;

    return resolveFirstInstanceHadoriAppealRights(normalizedJudgmentType, lawyerSide).action === 'self_appeal';
}

function resolveEligibleCrossAppealCandidates(input: {
    appealStageParties: Party[];
    initialAppellantIds: Set<string>;
    crossAppealedIds: Set<string>;
    previousStage: CaseStage | null;
    normalizedJudgmentType: string | null;
}): Party[] {
    const {
        appealStageParties,
        initialAppellantIds,
        crossAppealedIds,
        previousStage,
        normalizedJudgmentType,
    } = input;

    return appealStageParties.filter((party) => {
        const id = partyIdKey(party.id);
        if (!id || initialAppellantIds.has(id)) return false;
        if (hasCrossAppealFiled(party, crossAppealedIds)) return false;
        if (isAppellantAppealRole(String(party.role ?? ''))) return false;
        return partyHasOwnAppealRight({
            party,
            previousStage,
            normalizedJudgmentType,
        });
    });
}

function resolveOmittedCoLitigants(input: {
    previousStage: CaseStage | null;
    appellantSide: AppealSide | null;
    initialAppellantIds: Set<string>;
    crossAppealedIds: Set<string>;
    appealStageParties: Party[];
    normalizedJudgmentType: string | null;
}): Party[] {
    const {
        previousStage,
        appellantSide,
        initialAppellantIds,
        crossAppealedIds,
        appealStageParties,
        normalizedJudgmentType,
    } = input;
    if (!previousStage || !appellantSide) return [];

    const priorOnSide = listAppellantPartiesForAppeal(
        previousStage.parties ?? [],
        appellantSide,
        previousStage.incidentalCases,
    );
    const appealById = new Map(appealStageParties.map((party) => [partyIdKey(party.id), party]));

    const out: Party[] = [];
    for (const prior of priorOnSide) {
        const id = partyIdKey(prior.id);
        if (!id || initialAppellantIds.has(id)) continue;
        const onAppeal = appealById.get(id) ?? prior;
        if (hasCrossAppealFiled(onAppeal, crossAppealedIds)) continue;
        if (
            !partyHasOwnAppealRight({
                party: onAppeal,
                previousStage,
                normalizedJudgmentType,
            })
        ) {
            continue;
        }
        out.push(onAppeal);
    }
    return out;
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

    if (
        isPersonalStatusAppealContext(appealStage.stageName, stages)
        || isPersonalStatusDossierFromStages(stages)
    ) {
        return {
            showButton: false,
            isPartialJudgment: false,
            hasStaggeredCoLitigants: false,
            pendingCrossAppellants: [],
            crossAppellees: [],
            filedCrossAppellants: [],
        };
    }

    const meta = appealStage.appealMetadata;
    const previousStage =
        appealStageIndex >= 0
            ? resolvePreviousStage(stages, appealStageIndex)
            : null;

    const priorJudgmentType = resolvePriorJudgmentType(appealStage, previousStage);
    const normalizedJudgmentType = normalizeJudgmentTypeForAppealRights(
        priorJudgmentType,
        previousStage,
    );

    const isPartialJudgment =
        normalizedJudgmentType === 'رد الدعوى جزئياً'
        || isPartialMeritDecisionText(previousStage?.finalDecision)
        || isPartialMeritDecisionText(previousStage?.lastJudgmentType);

    const appellantSide = normalizeAppealSide(meta?.appellant);
    const initialAppellantIds = new Set(
        (meta?.initialAppellantPartyIds?.length
            ? meta.initialAppellantPartyIds
            : inferInitialAppellantIds(appealStage)
        ).map(partyIdKey),
    );

    const crossAppealedIds = new Set((meta?.crossAppealPartyIds ?? []).map(partyIdKey));
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

    const filedCrossAppellants = appealAppellees.filter((p) => hasCrossAppealFiled(p, crossAppealedIds));
    const pendingOnStage = resolveEligibleCrossAppealCandidates({
        appealStageParties,
        initialAppellantIds,
        crossAppealedIds,
        previousStage,
        normalizedJudgmentType,
    });

    const omittedCoLitigants = resolveOmittedCoLitigants({
        previousStage,
        appellantSide,
        initialAppellantIds,
        crossAppealedIds,
        appealStageParties,
        normalizedJudgmentType,
    });
    const hasStaggeredCoLitigants = omittedCoLitigants.length > 0;

    const pendingCrossAppellants = mergeUniqueParties(
        pendingOnStage,
        omittedCoLitigants,
    );

    return {
        showButton: pendingCrossAppellants.length > 0,
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
