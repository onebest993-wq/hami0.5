/**
 * استئخار الاستئناف لوجود اعتراض غيابي في محكمة الدرجة الأولى (احتباس الإضبارة الورقية).
 * المادة 172 — حارس رباعي عبر محرك القرار النقي:
 * ملزَم ∧ غيابي ∧ اعتراض معلّق ∧ isJointOrIndivisible (لا استئخار إن كانت الدعوى قابلة للتجزئة).
 * المادة 191 — لا يُنفَّذ المحكوم به غير القابل للتجزئة وفي طعن أحد المحكوم عليهم قائم.
 */
import type { CaseStage } from '../../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { TimelineEvent } from '../../LawyerShared';
import {
    clientDefendantHasGhayabiDisposition,
    isDisputeIndivisible,
    isMixedJudgmentForm,
    isPartyOperativeReleased,
    listJudgmentDispositionDefendants,
    normalizePartyJudgmentDispositions,
    parseDisputeIntegrity,
    partyDispositionId,
    summarizePartyJudgmentForm,
    type DisputeIntegrity,
    type PartyJudgmentDisposition,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import { resolveStaging } from '@/app/domain/lawsuit/litigationDecisionEngine';
import { isAppealStageName, isCassationStageName } from './judgmentStageNames';
import { isAbsentObjectionStageName } from './absentJudgmentStageNames';
import { readAppellantPartyIds, normalizePartyId } from './judgmentStageMetadataTypes';
import { resolveClientMarkedParty } from './clientMarkedParty';
import { isAppellantAppealRole } from './partyRoleClassification';
import {
    hasRegisteredObjectionLane,
    normalizePartyChallengeLanes,
    LANE_STATE_OBJECTION,
} from '@/app/domain/lawsuit/partyChallengeLanes';

export const ART172_SUSPENSION_REASON = 'PENDING_CO_DEFENDANT_OBJECTION' as const;
export const ART172_STAY_LABEL = 'استئخار الاستئناف لوجود اعتراض';
export const ART172_STAY_TEACHING_HINT =
    'يجب استئخار الاستئناف لوجود اعتراض غيابي';
export const ART172_STAY_CONFIRM_MESSAGE =
    'هل تريد استئخار الاستئناف لوجود اعتراض؟ يتوقف السير حتى حسم الاعتراض.';
export const ART172_RESUME_LABEL = 'حُسم الاعتراض - استئناف السير';
export const ART172_STAY_BADGE =
    'الدعوى موقوفة استئنافياً بانتظار حسم الاعتراض الغيابي';
export const ART172_COVERAGE_NOTICE =
    'مشمول بحكم الاستئناف لوحدة النزاع عملاً بالمادة (172) مرافعات';
export const ART191_EXECUTION_STAY_NOTICE =
    'لا يُنفَّذ الحكم لوحدة المحكوم به ما دام طعن أحد المحكوم عليهم قائماً عملاً بالمادة (191) مرافعات';

export type Art172JudgmentSource = {
    stageName?: string | null;
    judgmentForm?: string | null;
    lastJudgmentType?: string | null;
    disputeIntegrity?: DisputeIntegrity | string | null;
    partyJudgmentDispositions?: PartyJudgmentDisposition[] | unknown;
    parties?: Array<{
        id?: unknown;
        role?: unknown;
        status?: unknown;
        isClient?: boolean;
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    }> | null;
    appealMetadata?: CaseStage['appealMetadata'];
    isSuspended?: boolean;
    suspensionReason?: CaseStage['suspensionReason'];
    status?: string | null;
    isPleadingsClosed?: boolean;
    finalDecision?: string | null;
    decisionDate?: string | null;
    awaitingOpponentAppeal?: boolean;
    awaitingAbsentJudgmentNotification?: boolean;
    cassationWindowLapsed?: boolean;
    partyChallengeLanes?: unknown;
};

export function isArt172AppealStayActive(
    stage?: Pick<Art172JudgmentSource, 'isSuspended' | 'suspensionReason'> | null,
): boolean {
    return (
        stage?.isSuspended === true
        && stage.suspensionReason === ART172_SUSPENSION_REASON
    );
}

function judgmentFormWaivesAbsentObjection(form?: string | null): boolean {
    const raw = String(form ?? '');
    return raw.includes('ترك حق الاعتراض') || raw.includes('متروك');
}

function stageHasMeritOutcome(stage: Art172JudgmentSource): boolean {
    if (String(stage.finalDecision ?? '').trim()) return true;
    if (String(stage.decisionDate ?? '').trim()) return true;
    return false;
}

function appealStageHasMeritJudgment(stage: Art172JudgmentSource): boolean {
    return stageHasMeritOutcome(stage);
}

/** الاستئناف ما زال قائماً على موضوع الحكم البدائي — لم يُحسم ولم تسقط مدته التمييزية. */
function isCoveringAppealPending(appeal?: Art172JudgmentSource | null): boolean {
    if (!appeal) return false;
    if (appeal.status === 'locked' || appeal.status === 'completed') return false;
    if (appeal.cassationWindowLapsed === true) return false;
    if (appealStageHasMeritJudgment(appeal)) return false;
    return true;
}

export function findPriorFirstInstanceJudgmentIndex(
    stages?: Art172JudgmentSource[] | null,
): number {
    if (!Array.isArray(stages)) return -1;
    for (let i = stages.length - 1; i >= 0; i -= 1) {
        const stage = stages[i];
        if (!stage) continue;
        const name = String(stage.stageName ?? '');
        if (
            isAppealStageName(name)
            || isCassationStageName(name)
            || isAbsentObjectionStageName(name)
        ) {
            continue;
        }
        const dispositions = normalizePartyJudgmentDispositions(stage.partyJudgmentDispositions);
        const lanes = normalizePartyChallengeLanes(stage.partyChallengeLanes);
        if (
            stage.judgmentForm
            || dispositions.length > 0
            || stage.disputeIntegrity
            || lanes.length > 0
        ) {
            return i;
        }
    }
    return -1;
}

export function resolvePriorFirstInstanceJudgmentSource(
    stages?: Art172JudgmentSource[] | null,
): Art172JudgmentSource | null {
    const index = findPriorFirstInstanceJudgmentIndex(stages);
    if (index < 0 || !Array.isArray(stages)) return null;
    return stages[index] ?? null;
}

export function isMixedIndivisibleJudgmentSource(
    source?: Art172JudgmentSource | null,
    parentIntegrity?: DisputeIntegrity | string | null,
): boolean {
    if (!source) return false;
    const integrity = source.disputeIntegrity ?? parentIntegrity;
    if (!isDisputeIndivisible(integrity)) return false;
    const summary = summarizePartyJudgmentForm(
        normalizePartyJudgmentDispositions(source.partyJudgmentDispositions),
        String(source.judgmentForm ?? ''),
    );
    return summary === 'مختلط' || isMixedJudgmentForm(source.judgmentForm);
}

export function dossierHasAppealStage(
    stages?: Array<{ stageName?: string | null }> | null,
): boolean {
    if (!Array.isArray(stages)) return false;
    return stages.some((stage) => isAppealStageName(String(stage.stageName ?? '')));
}

function findAppealStage(
    stages?: Art172JudgmentSource[] | null,
): Art172JudgmentSource | undefined {
    return (stages ?? []).find((stage) => isAppealStageName(String(stage.stageName ?? '')));
}

function findAbsentObjectionStage(
    stages?: Art172JudgmentSource[] | null,
): Art172JudgmentSource | undefined {
    return (stages ?? []).find((stage) => isAbsentObjectionStageName(String(stage.stageName ?? '')));
}

function sourceHasGhayabiDefendant(source?: Art172JudgmentSource | null): boolean {
    if (!source) return false;
    const dispositions = normalizePartyJudgmentDispositions(source.partyJudgmentDispositions);
    if (dispositions.length > 0) {
        return dispositions.some((row) => row.form === 'غيابي' && !isPartyOperativeReleased(row));
    }
    const summary = summarizePartyJudgmentForm(
        dispositions,
        String(source.judgmentForm ?? source.lastJudgmentType ?? ''),
    );
    return summary === 'غيابي' || summary === 'مختلط';
}

/** الاعتراض الغيابي لم يُحسم بعد: لم يُترك، ولم تُقفل مرحلة الاعتراض بحكم. */
export function isGhayabiObjectionPending(params: {
    stages?: Art172JudgmentSource[] | null;
    source?: Art172JudgmentSource | null;
}): boolean {
    const source = params.source ?? resolvePriorFirstInstanceJudgmentSource(params.stages);
    if (!source) return false;
    if (
        judgmentFormWaivesAbsentObjection(source.judgmentForm)
        || judgmentFormWaivesAbsentObjection(source.lastJudgmentType)
    ) {
        return false;
    }
    if (!sourceHasGhayabiDefendant(source)) return false;

    const objection = findAbsentObjectionStage(params.stages);
    if (objection) {
        if (objection.status === 'locked' || objection.status === 'completed') return false;
        if (stageHasMeritOutcome(objection)) return false;
        return true;
    }
    const appeal = findAppealStage(params.stages);
    if (appeal && !isCoveringAppealPending(appeal) && !isArt172AppealStayActive(appeal)) {
        return false;
    }
    return true;
}

function readAppealAppellantIds(appeal?: Art172JudgmentSource | null): string[] {
    if (!appeal) return [];
    const fromMeta = readAppellantPartyIds(appeal.appealMetadata);
    if (fromMeta.length > 0) return fromMeta;
    const ids: string[] = [];
    for (const party of appeal.parties ?? []) {
        if (!isAppellantAppealRole(String(party.role ?? ''))) continue;
        const id = normalizePartyId(party.id);
        if (id) ids.push(id);
    }
    return ids;
}

/** طعن الاستئناف صادر من مدعى عليه شريك — لا من المدعي وحده. */
export function appealFiledByCoDefendant(params: {
    source?: Art172JudgmentSource | null;
    appealStage?: Art172JudgmentSource | null;
}): boolean {
    const source = params.source;
    const appeal = params.appealStage;
    if (!source || !appeal) return false;
    const appellantIds = new Set(readAppealAppellantIds(appeal));
    if (appellantIds.size === 0) return false;
    return listJudgmentDispositionDefendants(source.parties ?? []).some((party) => {
        const id = normalizePartyId(partyDispositionId(party));
        return Boolean(id && appellantIds.has(id));
    });
}

/**
 * هل يُعرض عرض الاستئخار؟ يعتمد محرك القرار النقي (م/172 رباعي).
 * القابل للتجزئة ⇒ false دائماً حتى مع اعتراض معلّق.
 */
export function canOfferArt172AppealStay(params: {
    currentStage?: Art172JudgmentSource | null;
    stages?: Art172JudgmentSource[] | null;
    parentIntegrity?: DisputeIntegrity | string | null;
}): boolean {
    const current = params.currentStage;
    if (!current) return false;
    if (!isAppealStageName(String(current.stageName ?? ''))) return false;
    if (current.status === 'locked' || current.status === 'completed') return false;
    if (isArt172AppealStayActive(current)) return false;
    if (appealStageHasMeritJudgment(current)) return false;

    const source = resolvePriorFirstInstanceJudgmentSource(params.stages) ?? current;
    const integrity =
        parseDisputeIntegrity(source.disputeIntegrity)
        ?? parseDisputeIntegrity(params.parentIntegrity);
    const isJointOrIndivisible = isDisputeIndivisible(integrity);

    const objection = findAbsentObjectionStage(params.stages);
    if (objection) {
        if (objection.status === 'locked' || objection.status === 'completed') return false;
        if (stageHasMeritOutcome(objection)) return false;
    } else if (!hasRegisteredObjectionLane(source.partyChallengeLanes)) {
        return false;
    }

    const dispositions = normalizePartyJudgmentDispositions(source.partyJudgmentDispositions);
    const lanes = normalizePartyChallengeLanes(source.partyChallengeLanes);
    const objectionLane = lanes.find((lane) => lane.laneState === LANE_STATE_OBJECTION);
    const ghayabiPartyId =
        objectionLane?.partyId
        ?? dispositions.find((row) => row.form === 'غيابي' && !isPartyOperativeReleased(row))?.partyId
        ?? '';

    if (!ghayabiPartyId) {
        /** اعتراض مرحلة قائم دون بطاقة لين — لا يُفعَّل إن كانت قابلة للتجزئة */
        return isJointOrIndivisible;
    }

    const disposition = dispositions.find((row) => row.partyId === ghayabiPartyId);
    const released = disposition ? isPartyOperativeReleased(disposition) : false;
    const outcome = released ? 'FULL_WIN' : 'FULL_LOSS';
    const form = disposition?.form === 'غيابي' || !disposition ? 'GHIABI' : 'HADORI';

    const staging = resolveStaging({
        isJointOrIndivisible,
        ghayabiObjection: { partyId: ghayabiPartyId, path: 'PENDING' },
        parties: [
            {
                id: ghayabiPartyId,
                role: 'defendant',
                outcome,
                form,
            },
        ],
    });
    return staging === 'ACTIVE';
}

export function canOfferArt172AppealResume(
    currentStage?: Art172JudgmentSource | null,
): boolean {
    if (!currentStage) return false;
    if (!isAppealStageName(String(currentStage.stageName ?? ''))) return false;
    return isArt172AppealStayActive(currentStage);
}

export function applyArt172AppealStay(
    stage: CaseStage,
    recordedAt = getLocalTodayYmd(),
): Partial<CaseStage> {
    const event: TimelineEvent = {
        id: `art172_stay_${recordedAt}_${Date.now()}`,
        type: 'milestone',
        date: recordedAt,
        title: ART172_STAY_LABEL,
        details: ART172_STAY_BADGE,
        isSystemLog: true,
        isNew: true,
    };
    return {
        isSuspended: true,
        suspensionReason: ART172_SUSPENSION_REASON,
        timeline: [event, ...(stage.timeline ?? [])],
    };
}

export function applyArt172AppealResume(
    stage: CaseStage,
    recordedAt = getLocalTodayYmd(),
): Partial<CaseStage> {
    const event: TimelineEvent = {
        id: `art172_resume_${recordedAt}_${Date.now()}`,
        type: 'milestone',
        date: recordedAt,
        title: ART172_RESUME_LABEL,
        details: 'حُسم الاعتراض على الحكم الغيابي أو استُنفد أثره — استُؤنف السير في الاستئناف.',
        isSystemLog: true,
        isNew: true,
    };
    return {
        isSuspended: false,
        suspensionReason: undefined,
        timeline: [event, ...(stage.timeline ?? [])],
    };
}

function dossierHasCassationFinality(
    stages?: Array<{ stageName?: string | null; finalDecision?: string | null }> | null,
): boolean {
    if (!Array.isArray(stages)) return false;
    return stages.some((stage) => {
        if (!isCassationStageName(String(stage.stageName ?? ''))) return false;
        const fd = String(stage.finalDecision ?? '');
        return fd.includes('مكتسبة الدرجة القطعية') || fd.includes('اكتسب الدرجة القطعية');
    });
}

/**
 * المدعى عليه الغائب الذي لم يطعن، والنزاع غير قابل للتجزئة، والشريك الحاضر (مدعى عليه) استأنف.
 * لا يُعامل حكمه كقطعي مستقل.
 */
export function isAbsentClientCoveredByCoDefendantAppeal(params: {
    stages?: Art172JudgmentSource[] | null;
    parties?: Art172JudgmentSource['parties'];
    parentIntegrity?: DisputeIntegrity | string | null;
}): boolean {
    if (!dossierHasAppealStage(params.stages)) return false;
    if (dossierHasCassationFinality(params.stages)) return false;
    const source = resolvePriorFirstInstanceJudgmentSource(params.stages);
    if (!isMixedIndivisibleJudgmentSource(source, params.parentIntegrity)) return false;
    const partiesForDisposition =
        source?.parties && source.parties.length > 0 ? source.parties : (params.parties ?? []);
    const dispositions = normalizePartyJudgmentDispositions(source?.partyJudgmentDispositions);
    if (!clientDefendantHasGhayabiDisposition(partiesForDisposition, dispositions)) return false;
    const appealStage = findAppealStage(params.stages);
    if (!isCoveringAppealPending(appealStage)) return false;
    if (!appealFiledByCoDefendant({ source, appealStage })) return false;
    const appellantIds = readAppealAppellantIds(appealStage);
    const client = (resolveClientMarkedParty(params.parties ?? undefined)
        ?? resolveClientMarkedParty(partiesForDisposition ?? undefined)) as { id?: unknown } | null;
    const clientId = normalizePartyId(client?.id ?? null);
    if (clientId && appellantIds.includes(clientId)) return false;
    return true;
}

/** وحدة المحكوم به: لا تنفيذ ما دام اعتراض غيابي أو استئناف قائمين دون قطعية تمييز. */
export function shouldStayIndivisibleExecution(params: {
    stages?: Art172JudgmentSource[] | null;
    parentIntegrity?: DisputeIntegrity | string | null;
}): boolean {
    if (dossierHasCassationFinality(params.stages)) return false;
    const source = resolvePriorFirstInstanceJudgmentSource(params.stages);
    if (!isMixedIndivisibleJudgmentSource(source, params.parentIntegrity)) return false;
    if (isGhayabiObjectionPending({ stages: params.stages, source })) return true;
    const appeal = findAppealStage(params.stages);
    if (!appeal) return false;
    if (isArt172AppealStayActive(appeal)) return true;
    return isCoveringAppealPending(appeal);
}

/**
 * لا تُعامل الإضبارة كقطعية مستقلة: إما الغائب مشمول بطعن الشريك، أو وحدة المحكوم به تمنع التنفيذ.
 * بعد حسم الاستئناف أو اكتساب التمييز يسقط الأثر — يبقى تسجيل قطعية حكم الاستئناف نفسه متاحاً.
 */
export function blocksCivilDossierFinality(params: {
    stages?: Art172JudgmentSource[] | null;
    parties?: Art172JudgmentSource['parties'];
    parentIntegrity?: DisputeIntegrity | string | null;
}): boolean {
    if (isAbsentClientCoveredByCoDefendantAppeal(params)) return true;
    return shouldStayIndivisibleExecution({
        stages: params.stages,
        parentIntegrity: params.parentIntegrity,
    });
}
