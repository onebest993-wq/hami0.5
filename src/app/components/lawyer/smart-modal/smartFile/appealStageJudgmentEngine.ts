import type { CaseStage } from '../../LawyerShared';
import type { StageOutcome, AppealStageMetadata } from '../../lawyerShared/stageTransitionMetadataTypes';
import { resolveClientMarkedParty } from './clientMarkedParty';
import {
    isAppellantAppealRole,
    isAppelleeAppealRole,
    extractParentheticalUnderlyingSide,
} from './partyRoleClassification';
import { isAppealStageName, isCassationStageName } from './judgmentTypes';
import { isCassationCorrectionStageName } from './extraordinaryAppealGateway';
import {
    readAppellantPartyIds,
    readAppelleePartyIds,
    normalizePartyId,
    stageOutcomeToLegacyAppealOutcome,
} from './judgmentStageMetadataTypes';
import {
    CASSATION_JUDGMENT_AFFIRMED,
    CASSATION_JUDGMENT_DISMISS_FORMAL,
    CASSATION_JUDGMENT_REMANDED,
    CASSATION_JUDGMENT_REVERSE_FINAL,
    classifyCassationJudgmentEffect,
} from '@/app/domain/lawsuit/cassationArt210';

type ClientAppealRole = 'appellant' | 'appellee' | null;

/** @deprecated استخدم StageOutcome — يُحافظ لتوافق UI */
export type AppealClientOutcome = 'win' | 'loss' | 'partial' | 'unknown';

export type CassationClientOutcome = 'win' | 'loss' | 'remand_favorable' | 'remand_adverse' | 'unknown';

type AppealJudgmentEffect = 'AFFIRM' | 'QUASH_FULL' | 'QUASH_PARTIAL' | 'DISMISS_FORMAL';

const APPELLANT_WIN_JUDGMENTS = new Set([
    'فسخ الحكم البدائي كلياً',
    'فسخ الحكم المستأنف كلياً',
    'رد الاستئناف شكلاً',
]);

const APPELLEE_WIN_JUDGMENTS = new Set([
    'تأييد الحكم البدائي ورد الاستئناف',
    'تأييد الحكم المستأنف ورد الاستئناف',
]);

function classifyAppealJudgmentEffect(judgmentType: string): AppealJudgmentEffect | null {
    const t = String(judgmentType ?? '').trim();
    if (!t) return null;
    if (t.includes('جزئياً')) return 'QUASH_PARTIAL';
    if (APPELLANT_WIN_JUDGMENTS.has(t)) return 'QUASH_FULL';
    if (APPELLEE_WIN_JUDGMENTS.has(t)) return 'AFFIRM';
    if (t.includes('رد') && t.includes('شكل')) return 'DISMISS_FORMAL';
    return null;
}

/** موقف موكلك في مرحلة الاستئناف — metadata أولاً ثم fallback legacy */
export function resolveClientAppealRole(
    parties?: Array<{
        id?: number | string;
        role?: string;
        isClient?: boolean;
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    }> | null,
    options?: {
        appellantPartyIds?: Array<number | string>;
        appelleePartyIds?: Array<number | string>;
        appealMetadata?: AppealStageMetadata | null;
    },
): ClientAppealRole {
    const client = resolveClientMarkedParty(parties);
    if (!client) return null;

    const meta = options?.appealMetadata;
    const appellantIds = options?.appellantPartyIds?.length
        ? options.appellantPartyIds.map((id) => String(id))
        : readAppellantPartyIds(meta);
    const allPartyIds = parties?.map((p) => p.id).filter((id) => id != null) as Array<number | string>;
    const appelleeIds = options?.appelleePartyIds?.length
        ? options.appelleePartyIds.map((id) => String(id))
        : readAppelleePartyIds(meta, allPartyIds);

    const clientId = normalizePartyId(client.id);
    if (clientId && appellantIds.length > 0) {
        if (appellantIds.includes(clientId)) return 'appellant';
        if (appelleeIds.includes(clientId)) return 'appellee';
        return 'appellee';
    }

    const role = String(client.role ?? '').trim();
    if (isAppelleeAppealRole(role)) return 'appellee';
    if (isAppellantAppealRole(role)) return 'appellant';

    const underlying = extractParentheticalUnderlyingSide(role);
    if (underlying === 'المدعى عليه') return 'appellee';
    if (underlying === 'المدعي') return 'appellant';

    return null;
}

/** نتيجة موكلك في مرحلة الاستئناف — StageOutcome صريح */
export function resolveAppealStageClientOutcome(
    judgmentType: string,
    clientRole: ClientAppealRole,
): StageOutcome | null {
    const effect = classifyAppealJudgmentEffect(judgmentType);
    if (!effect || !clientRole) return null;

    if (effect === 'QUASH_PARTIAL') return 'PARTIAL';

    if (effect === 'AFFIRM') {
        return clientRole === 'appellant' ? 'LOSS' : 'WIN';
    }

    if (effect === 'QUASH_FULL' || effect === 'DISMISS_FORMAL') {
        return clientRole === 'appellant' ? 'WIN' : 'LOSS';
    }

    return null;
}

/** جسر UI legacy */
export function toAppealClientOutcome(outcome: StageOutcome | null | undefined): AppealClientOutcome {
    return stageOutcomeToLegacyAppealOutcome(outcome ?? null);
}

function findPriorAppealStageIndex(stages: CaseStage[], fromIndex: number): number {
    for (let i = fromIndex - 1; i >= 0; i--) {
        const stage = stages[i];
        if (!stage) continue;
        if (isAppealStageName(stage.stageName)) return i;
    }
    return -1;
}

function readPriorJudgmentTypeFromStage(stage: CaseStage | undefined | null): string | null {
    if (!stage) return null;
    const fromMeta = stage.appealMetadata?.priorJudgmentType;
    if (fromMeta && String(fromMeta).trim()) return String(fromMeta).trim();
    return null;
}

export function resolvePriorAppealJudgmentForCassation(
    stages: CaseStage[],
    cassationIndex: number,
): string | null {
    const cassation = stages[cassationIndex];
    const fromCassationMeta = cassation?.appealMetadata?.priorJudgmentType;
    if (fromCassationMeta && String(fromCassationMeta).trim()) {
        return String(fromCassationMeta).trim();
    }
    const appealIdx = findPriorAppealStageIndex(stages, cassationIndex);
    if (appealIdx < 0) return null;
    return readPriorJudgmentTypeFromStage(stages[appealIdx]);
}

export function resolvePriorAppealStageOutcome(
    stages: CaseStage[],
    cassationIndex: number,
): StageOutcome | null {
    const appealIdx = findPriorAppealStageIndex(stages, cassationIndex);
    if (appealIdx < 0) return null;
    return stages[appealIdx]?.clientStageOutcome ?? null;
}

export function resolveCassationClientOutcome(
    cassationJudgment: string,
    clientRole: ClientAppealRole,
    appealJudgment: string | null,
    priorAppealStageOutcome?: StageOutcome | null,
): CassationClientOutcome {
    const c = String(cassationJudgment ?? '').trim();

    const appealOutcome: StageOutcome | null =
        priorAppealStageOutcome
        ?? (appealJudgment && clientRole
            ? resolveAppealStageClientOutcome(appealJudgment, clientRole)
            : null);

    const effect = classifyCassationJudgmentEffect(c);

    if (effect === 'REVERSED_FINAL') {
        if (clientRole === 'appellant') return 'win';
        if (clientRole === 'appellee') return 'loss';
        return 'unknown';
    }

    if (effect === 'REVERSED_REMANDED' || c === CASSATION_JUDGMENT_REMANDED) {
        if (appealOutcome === 'LOSS') return 'remand_favorable';
        if (appealOutcome === 'WIN') return 'remand_adverse';
        if (appealOutcome === 'PARTIAL') {
            return clientRole === 'appellee' ? 'remand_favorable' : clientRole === 'appellant' ? 'remand_adverse' : 'unknown';
        }
        return 'unknown';
    }

    if (effect === 'AFFIRMED' || effect === 'DISMISS_FORMAL') {
        if (appealOutcome === 'WIN') return 'win';
        if (appealOutcome === 'LOSS') return 'loss';
        if (appealOutcome === 'PARTIAL') {
            return clientRole === 'appellant' ? 'win' : clientRole === 'appellee' ? 'loss' : 'unknown';
        }
        return 'unknown';
    }

    return 'unknown';
}

function stageLabel(stage: CaseStage | undefined | null): string {
    return String(stage?.stageName ?? stage?.name ?? '').trim();
}

function readCassationJudgmentFromStage(stage: CaseStage | undefined | null): string | null {
    if (!stage) return null;
    if (stage.clientStageOutcome === 'FINALIZED') return CASSATION_JUDGMENT_AFFIRMED;
    const fd = String(stage.finalDecision ?? '').trim();
    if (fd === CASSATION_JUDGMENT_AFFIRMED || fd === CASSATION_JUDGMENT_DISMISS_FORMAL) return fd;
    if (fd === CASSATION_JUDGMENT_REVERSE_FINAL || (fd.includes('نقض') && fd.includes('الموضوع'))) {
        return CASSATION_JUDGMENT_REVERSE_FINAL;
    }
    if (fd === CASSATION_JUDGMENT_REMANDED || (fd.includes('نقض') && fd.includes('إعادة'))) {
        return CASSATION_JUDGMENT_REMANDED;
    }
    return null;
}

function findCassationStageIndexBeforeCorrection(
    stages: CaseStage[],
    correctionStageIndex: number,
): number {
    for (let i = correctionStageIndex - 1; i >= 0; i--) {
        const name = stageLabel(stages[i]);
        if (isCassationStageName(name)) return i;
        if (isCassationCorrectionStageName(name)) continue;
    }
    return -1;
}

function resolveCassationStandingClientOutcome(
    stages: CaseStage[],
    cassationStageIndex: number,
    clientRole: ClientAppealRole,
): AppealClientOutcome {
    const cassationJudgment = readCassationJudgmentFromStage(stages[cassationStageIndex]);
    if (!cassationJudgment) return 'unknown';

    const priorAppealOutcome = resolvePriorAppealStageOutcome(stages, cassationStageIndex);
    const appealJudgment = resolvePriorAppealJudgmentForCassation(stages, cassationStageIndex);
    const cassationOutcome = resolveCassationClientOutcome(
        cassationJudgment,
        clientRole,
        appealJudgment,
        priorAppealOutcome,
    );

    if (cassationOutcome === 'win' || cassationOutcome === 'remand_favorable') return 'win';
    if (cassationOutcome === 'loss' || cassationOutcome === 'remand_adverse') return 'loss';
    return 'unknown';
}

export function resolveCorrectionRejectedClientOutcome(
    stages: CaseStage[],
    correctionStageIndex: number,
    clientRole: ClientAppealRole,
): AppealClientOutcome {
    const cassationIdx = findCassationStageIndexBeforeCorrection(stages, correctionStageIndex);
    if (cassationIdx < 0) return 'unknown';
    return resolveCassationStandingClientOutcome(stages, cassationIdx, clientRole);
}

export function resolveCorrectionAcceptedClientOutcome(
    stages: CaseStage[],
    correctionStageIndex: number,
    clientRole: ClientAppealRole,
): AppealClientOutcome {
    const cassationIdx = findCassationStageIndexBeforeCorrection(stages, correctionStageIndex);
    if (cassationIdx < 0) return 'unknown';
    const standing = resolveCassationStandingClientOutcome(stages, cassationIdx, clientRole);
    if (standing === 'win') return 'loss';
    if (standing === 'loss') return 'win';
    return 'unknown';
}

export function buildCassationRemandTimelineTitle(
    cassationJudgment: string,
    clientRole: ClientAppealRole,
    appealJudgment: string | null,
    priorAppealStageOutcome?: StageOutcome | null,
): string {
    const outcome = resolveCassationClientOutcome(
        cassationJudgment,
        clientRole,
        appealJudgment,
        priorAppealStageOutcome,
    );
    if (outcome === 'remand_favorable') {
        return '\u2705 نقض الحكم التمييزي \u2014 إعادة الإضبارة قد تُعيد لصالح الموكل';
    }
    if (outcome === 'remand_adverse') {
        return '\u274c نقض الحكم التمييزي \u2014 إعادة الإضبارة بعد خسارة الموكل في الاستئناف';
    }
    return 'تم نقض الحكم التمييزي وإعادة الإضبارة';
}

export function buildAppealArchiveTimelineTitle(
    judgmentType: string,
    clientRole: ClientAppealRole,
    transitioningToCassation = false,
): string {
    const outcome = toAppealClientOutcome(resolveAppealStageClientOutcome(judgmentType, clientRole));
    const t = String(judgmentType ?? '').trim();

    if (transitioningToCassation && outcome === 'loss') {
        return `\u274c خسارة مرحلة الاستئناف (${t}) \u2014 انتقال للتمييز`;
    }
    if (transitioningToCassation && outcome === 'win') {
        return `\u2705 كسب مرحلة الاستئناف (${t}) \u2014 انتقال للتمييز`;
    }
    if (outcome === 'win') return `\u2705 حكم الاستئناف لصالح الموكل (${t})`;
    if (outcome === 'loss') return `\u274c حكم الاستئناف ضد الموكل (${t})`;
    if (outcome === 'partial') return `\u26a0\ufe0f حكم استئناف جزئي (${t}) \u2014 يحق للطرفين الطعن فيما حُسم`;
    return `\u27a1\ufe0f حكم بـ ${t} والانتقال`;
}

export function cassationOutcomeToStageOutcome(
    outcome: CassationClientOutcome,
): StageOutcome | null {
    if (outcome === 'win' || outcome === 'remand_favorable') return 'WIN';
    if (outcome === 'loss' || outcome === 'remand_adverse') return 'LOSS';
    return null;
}

export {
    ART172_COVERAGE_NOTICE,
    ART172_RESUME_LABEL,
    ART172_STAY_BADGE,
    ART172_STAY_LABEL,
    ART172_SUSPENSION_REASON,
    ART191_EXECUTION_STAY_NOTICE,
    applyArt172AppealResume,
    applyArt172AppealStay,
    blocksCivilDossierFinality,
    canOfferArt172AppealResume,
    canOfferArt172AppealStay,
    isAbsentClientCoveredByCoDefendantAppeal,
    isArt172AppealStayActive,
    isGhayabiObjectionPending,
    isMixedIndivisibleJudgmentSource,
    shouldStayIndivisibleExecution,
} from './art172AppealStay';
