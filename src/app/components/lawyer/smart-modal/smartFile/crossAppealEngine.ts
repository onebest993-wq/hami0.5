import type { CaseStage, Party } from '../../LawyerShared';
import { isCrossAppealFeatureEnabled } from '@/app/domain/lawsuit/litigationDecisionEngine';
import {
    isPersonalStatusAppealContext,
    isPersonalStatusDossierFromStages,
} from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import {
    classifyPartySideBucket,
    extractParentheticalUnderlyingSide,
    isAppellantAppealRole,
    isAppelleeAppealRole,
    isDefendantSideRole,
    isInterpleaderThirdPartyRole,
    isPlaintiffSideRole,
    partitionPartiesForHeader,
    resolveAbsentObjectionOriginalSide,
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
import { isAppealStageName } from './judgmentStageNames';
import { computeFirstInstanceAppealDeadline } from './appealDeadlineEngine';
import { resolveClientAppealRole } from './appealStageJudgmentEngine';
import { resolveClientMarkedParty } from './clientMarkedParty';
import {
    isInterpleaderJudgmentType,
    resolveInterpleaderHadoriAppealRights,
    type LawyerJudgmentBucket,
} from './interpleaderJudgmentEngine';

type PartyAppealBucket = LawyerJudgmentBucket;

/** م/190: مدة الاستئناف الأصلي من تاريخ التبليغ (مع احتساب اليوم التالي كما في محرك المهل) */
export const CROSS_APPEAL_ORIGINAL_WINDOW_DAYS = 15;

/** أصلي يستمر ولو رُد الاستئناف شكلاً — تبعي يسقط بسقوط الأصلي */
export type CrossAppealClassification = 'ORIGINAL' | 'DEPENDENT';

export type CrossAppealClientRole = 'appellant' | 'appellee' | null;

/**
 * - client_files: الموكل مستأنف عليه ويقدّم متقابلاً بعد طعن الخصم
 * - record_opponent: الموكل مستأنف أصلي ويسجّل متقابل الخصم (من له حق طعن متبادل)
 */
export type CrossAppealFilingMode = 'client_files' | 'record_opponent';

export type CrossAppealEligibility = {
    /** توافق UI الحالي — مرادف عملي لـ canFileCrossAppeal */
    showButton: boolean;
    /** م/190: هل يُسمح بتقديم/تسجيل استئناف متقابل الآن؟ */
    canFileCrossAppeal: boolean;
    reason?: string;
    /** نص زر التذييل — بسيط حسب اتجاه التسجيل */
    buttonLabel?: string;
    filingMode?: CrossAppealFilingMode | null;
    /** تصنيف متوقع إن قُدّم بتاريخ asOfDate / اليوم */
    classification?: CrossAppealClassification;
    isPleadingClosed: boolean;
    isPartialJudgment: boolean;
    hasStaggeredCoLitigants: boolean;
    pendingCrossAppellants: Party[];
    crossAppellees: Party[];
    filedCrossAppellants: Party[];
    clientRole: CrossAppealClientRole;
    /** تاريخ التبليغ/القرار البدائي المستخدم لتصنيف أصلي/تبعي */
    firstInstanceNotificationDate?: string | null;
};

/** اسم بديل للتقرير القانوني — نفس شكل CrossAppealEligibility */
export type CrossAppealEligibilityResult = CrossAppealEligibility;

function isPartialMeritJudgmentType(judgmentType?: string | null): boolean {
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

function isPartialMeritDecisionText(text?: string | null): boolean {
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

function originalLitigationSide(party: Party): 'المدعي' | 'المدعى عليه' | null {
    const fromObjection = resolveAbsentObjectionOriginalSide(party);
    if (fromObjection) return fromObjection;
    const fromParens = extractParentheticalUnderlyingSide(String(party.role ?? ''));
    if (fromParens) return fromParens;
    const role = String(party.role ?? '');
    if (isDefendantSideRole(role) && !isPlaintiffSideRole(role)) return 'المدعى عليه';
    if (isPlaintiffSideRole(role) && !role.includes('عليه')) return 'المدعي';
    return null;
}

/** م/190: المتقابل قاصر على المستأنف عليه ضد المستأنف — لا ضد شريك في نفس الجبهة. */
function isCoDefendantOfAppellant(params: {
    candidate: Party;
    appealStageParties: Party[];
    initialAppellantIds: Set<string>;
}): boolean {
    const candidateSide = originalLitigationSide(params.candidate);
    if (candidateSide !== 'المدعى عليه') return false;
    return params.appealStageParties.some((party) => {
        const id = partyIdKey(party.id);
        if (!id || !params.initialAppellantIds.has(id)) return false;
        return originalLitigationSide(party) === 'المدعى عليه';
    });
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
        const action = resolveInterpleaderHadoriAppealRights(normalizedJudgmentType, bucket).action;
        return action === 'self_appeal' || action === 'both_paths';
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

    const action = resolveFirstInstanceHadoriAppealRights(normalizedJudgmentType, lawyerSide).action;
    return action === 'self_appeal' || action === 'both_paths';
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
        if (
            isCoDefendantOfAppellant({
                candidate: party,
                appealStageParties,
                initialAppellantIds,
            })
        ) {
            return false;
        }
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
            isCoDefendantOfAppellant({
                candidate: onAppeal,
                appealStageParties,
                initialAppellantIds,
            })
        ) {
            continue;
        }
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

function idleEligibility(
    overrides: Partial<CrossAppealEligibility> = {},
): CrossAppealEligibility {
    return {
        showButton: false,
        canFileCrossAppeal: false,
        filingMode: null,
        buttonLabel: undefined,
        isPleadingClosed: false,
        isPartialJudgment: false,
        hasStaggeredCoLitigants: false,
        pendingCrossAppellants: [],
        crossAppellees: [],
        filedCrossAppellants: [],
        clientRole: null,
        ...overrides,
    };
}

function resolveCrossAppealFilingPresentation(
    clientRole: CrossAppealClientRole,
): Pick<CrossAppealEligibility, 'filingMode' | 'buttonLabel'> {
    if (clientRole === 'appellant') {
        return {
            filingMode: 'record_opponent',
            buttonLabel: 'تسجيل استئناف متقابل للخصم',
        };
    }
    return {
        filingMode: 'client_files',
        buttonLabel: 'تقديم استئناف متقابل',
    };
}

/** م/190: ختام المرافعة أو صدور حكم استئنافي يقفل باب المتقابل */
export function isCrossAppealPleadingClosed(appealStage: CaseStage): boolean {
    if (appealStage.pleadingDoorReopened) return false;
    if (appealStage.isPleadingsClosed) return true;
    const fd = String(appealStage.finalDecision ?? '').trim();
    if (fd && appealStage.status === 'completed') return true;
    return false;
}

/**
 * تاريخ التبليغ بالحكم البدائي إن وُجد، وإلا تاريخ القرار (حضوري).
 * يُستخدم لتصنيف أصلي / تبعي فقط — لا يغيّر أهلية الظهور.
 */
export function resolveFirstInstanceNotificationAnchor(
    previousStage?: CaseStage | null,
): string | null {
    const notif = String(previousStage?.absentJudgmentNotificationDate ?? '').trim().slice(0, 10);
    if (notif) return notif;
    const decision = String(previousStage?.decisionDate ?? '').trim().slice(0, 10);
    if (decision) return decision;
    return null;
}

/**
 * أصلي إن قُدّم ضمن مدة الطعن الأصلية (15 يوماً من اليوم التالي للتبليغ/القرار).
 * تبعي إن قُدّم بعدها (وحتى ختام المرافعة).
 * عند غياب تاريخ التبليغ/القرار → DEPENDENT (أحوط: يسقط بسقوط الأصلي).
 */
export function classifyCrossAppealFiling(input: {
    filingDate: string;
    firstInstanceNotificationDate?: string | null;
}): CrossAppealClassification {
    const filing = String(input.filingDate ?? '').trim().slice(0, 10);
    const anchor = String(input.firstInstanceNotificationDate ?? '').trim().slice(0, 10);
    if (!filing || !anchor) return 'DEPENDENT';
    const originalDeadline = computeFirstInstanceAppealDeadline(anchor);
    return filing <= originalDeadline ? 'ORIGINAL' : 'DEPENDENT';
}

export function resolveCrossAppealEligibility(input: {
    appealStage: CaseStage;
    stages?: CaseStage[];
    appealStageIndex?: number;
    /** تاريخ افتراضي للتصنيف المتوقع (افتراضي: اليوم) */
    asOfDate?: string;
}): CrossAppealEligibility {
    void input;
    /** م/190 خامل — Feature Flag من محرك القرار النقي؛ لا واجهة ولا إضبارة جديدة */
    if (!isCrossAppealFeatureEnabled()) {
        return idleEligibility({
            reason: 'أُلغي مسار الاستئناف المتقابل — الطعن اللاحق بإضبارة مستقلة',
        });
    }
    return idleEligibility({
        reason: 'أُلغي مسار الاستئناف المتقابل — الطعن اللاحق بإضبارة مستقلة',
    });
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
