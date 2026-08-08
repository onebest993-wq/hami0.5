import type { CaseStage } from '../../LawyerShared';
import { resolveClientMarkedParty } from './interpleaderJudgmentEngine';
import {
    isAppellantAppealRole,
    isAppelleeAppealRole,
} from './partyRoleClassification';
import { isAppealStageName, isCassationStageName } from './judgmentTypes';
import { isCassationCorrectionStageName } from './extraordinaryAppealGateway';

export type ClientAppealRole = 'appellant' | 'appellee' | null;
export type AppealClientOutcome = 'win' | 'loss' | 'partial' | 'unknown';
export type CassationClientOutcome = 'win' | 'loss' | 'remand_favorable' | 'remand_adverse' | 'unknown';

const APPELLANT_WIN_ON_APPEAL = new Set([
    'فسخ الحكم البدائي كلياً',
    'فسخ الحكم المستأنف كلياً',
    'رد الاستئناف شكلاً',
]);

const APPELLEE_WIN_ON_APPEAL = new Set([
    'تأييد الحكم البدائي ورد الاستئناف',
    'تأييد الحكم المستأنف ورد الاستئناف',
]);

/** موقف موكلك في مرحلة الاستئناف — من صفة الطرف لا من عمود الهيدر فقط */
export function resolveClientAppealRole(
    parties?: Array<{
        role?: string;
        isClient?: boolean;
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    }> | null,
): ClientAppealRole {
    const client = resolveClientMarkedParty(parties);
    if (!client) return null;
    const role = String(client.role ?? '').trim();
    if (isAppelleeAppealRole(role)) return 'appellee';
    if (isAppellantAppealRole(role)) return 'appellant';
    return null;
}

export function resolveAppealStageClientOutcome(
    judgmentType: string,
    clientRole: ClientAppealRole,
): AppealClientOutcome {
    const t = String(judgmentType ?? '').trim();
    if (!t || !clientRole) return 'unknown';
    if (t.includes('جزئياً')) return 'partial';

    if (APPELLANT_WIN_ON_APPEAL.has(t)) {
        return clientRole === 'appellant' ? 'win' : 'loss';
    }
    if (APPELLEE_WIN_ON_APPEAL.has(t)) {
        return clientRole === 'appellee' ? 'win' : 'loss';
    }
    return 'unknown';
}

export function findPriorAppealStageIndex(stages: CaseStage[], fromIndex: number): number {
    for (let i = fromIndex - 1; i >= 0; i--) {
        const stage = stages[i];
        if (!stage) continue;
        if (isAppealStageName(stage.stageName)) return i;
    }
    return -1;
}

export function extractAppealJudgmentTypeFromStage(stage: CaseStage | undefined | null): string | null {
    if (!stage) return null;
    const fromMeta = stage.appealMetadata?.priorJudgmentType;
    if (fromMeta && String(fromMeta).trim()) return String(fromMeta).trim();

    const fd = String(stage.finalDecision ?? '');
    if (fd.includes('فسخ الحكم البدائي كلياً') || fd.includes('فسخ الحكم البدائي')) {
        return 'فسخ الحكم البدائي كلياً';
    }
    if (fd.includes('فسخ الحكم المستأنف كلياً')) return 'فسخ الحكم المستأنف كلياً';
    if (fd.includes('تأييد الحكم البدائي') || fd.includes('تأييد الحكم المستأنف')) {
        return 'تأييد الحكم البدائي ورد الاستئناف';
    }
    if (fd.includes('رد الاستئناف شكلاً')) return 'رد الاستئناف شكلاً';

    for (const ev of stage.timeline ?? []) {
        const blob = `${ev.title ?? ''} ${ev.details ?? ''}`;
        if (blob.includes('فسخ الحكم البدائي كلياً')) return 'فسخ الحكم البدائي كلياً';
        if (blob.includes('فسخ الحكم المستأنف كلياً')) return 'فسخ الحكم المستأنف كلياً';
        if (blob.includes('تأييد الحكم البدائي ورد الاستئناف')) {
            return 'تأييد الحكم البدائي ورد الاستئناف';
        }
        if (blob.includes('تأييد الحكم المستأنف ورد الاستئناف')) {
            return 'تأييد الحكم المستأنف ورد الاستئناف';
        }
        if (blob.includes('رد الاستئناف شكلاً')) return 'رد الاستئناف شكلاً';
    }

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
    return extractAppealJudgmentTypeFromStage(stages[appealIdx]);
}

/**
 * نتيجة قرار التمييز لموكلك — تعتمد على قرار الاستئناف الذي يُصدَّق أو يُنقض.
 */
export function resolveCassationClientOutcome(
    cassationJudgment: string,
    clientRole: ClientAppealRole,
    appealJudgment: string | null,
): CassationClientOutcome {
    const c = String(cassationJudgment ?? '').trim();
    const appealOutcome = appealJudgment
        ? resolveAppealStageClientOutcome(appealJudgment, clientRole)
        : 'unknown';

    if (c === 'نقض الحكم وإعادة الإضبارة') {
        if (appealOutcome === 'loss') return 'remand_favorable';
        if (appealOutcome === 'win') return 'remand_adverse';
        if (appealOutcome === 'partial') {
            return clientRole === 'appellee' ? 'remand_favorable' : clientRole === 'appellant' ? 'remand_adverse' : 'unknown';
        }
        return 'unknown';
    }

    if (c === 'تصديق الحكم' || c === 'رد الطعن التمييزي شكلاً') {
        if (appealOutcome === 'win') return 'win';
        if (appealOutcome === 'loss') return 'loss';
        if (appealOutcome === 'partial') {
            return clientRole === 'appellant' ? 'win' : clientRole === 'appellee' ? 'loss' : 'unknown';
        }
        return 'unknown';
    }

    return 'unknown';
}

function stageLabel(stage: CaseStage | undefined | null): string {
    return String(stage?.stageName ?? stage?.name ?? '').trim();
}

/** قرار التمييز المُصدَّق — من الحكم النهائي أو السجل الزمني */
export function extractCassationJudgmentTypeFromStage(
    stage: CaseStage | undefined | null,
): string | null {
    if (!stage) return null;
    const fd = String(stage.finalDecision ?? '').trim();
    if (fd === 'تصديق الحكم' || fd === 'رد الطعن التمييزي شكلاً') return fd;
    if (fd === 'نقض الحكم وإعادة الإضبارة' || (fd.includes('نقض') && fd.includes('إعادة'))) {
        return 'نقض الحكم وإعادة الإضبارة';
    }

    for (const ev of stage.timeline ?? []) {
        const blob = `${ev.title ?? ''} ${ev.details ?? ''}`;
        if (blob.includes('رد الطعن التمييزي شكلاً')) return 'رد الطعن التمييزي شكلاً';
        if (
            blob.includes('تصديق الحكم')
            || blob.includes('صدقت محكمة التمييز')
            || blob.includes('صدق محكمة التمييز')
        ) {
            return 'تصديق الحكم';
        }
        if (blob.includes('نقض الحكم') && blob.includes('إعادة')) {
            return 'نقض الحكم وإعادة الإضبارة';
        }
    }

    if (fd.includes('منقوض') || fd.includes('إعادة')) return 'نقض الحكم وإعادة الإضبارة';
    return null;
}

export function findCassationStageIndexBeforeCorrection(
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

/**
 * رد طلب التصحيح — يُثبت القرار التمييزي.
 * من طلب التصحيح يخسر عند الرفض إذا كان القرار التمييزي ضد موكله.
 */
function resolveCassationStandingClientOutcome(
    stages: CaseStage[],
    cassationStageIndex: number,
    clientRole: ClientAppealRole,
): AppealClientOutcome {
    const cassationJudgment = extractCassationJudgmentTypeFromStage(stages[cassationStageIndex]);
    if (!cassationJudgment) return 'unknown';

    const appealJudgment = resolvePriorAppealJudgmentForCassation(stages, cassationStageIndex);
    const cassationOutcome = resolveCassationClientOutcome(
        cassationJudgment,
        clientRole,
        appealJudgment,
    );

    if (cassationOutcome === 'win' || cassationOutcome === 'remand_favorable') return 'win';
    if (cassationOutcome === 'loss' || cassationOutcome === 'remand_adverse') return 'loss';
    return 'unknown';
}

/** رد طلب التصحيح — يُثبت القرار التمييزي السابق */
export function resolveCorrectionRejectedClientOutcome(
    stages: CaseStage[],
    correctionStageIndex: number,
    clientRole: ClientAppealRole,
): AppealClientOutcome {
    const cassationIdx = findCassationStageIndexBeforeCorrection(stages, correctionStageIndex);
    if (cassationIdx < 0) return 'unknown';
    return resolveCassationStandingClientOutcome(stages, cassationIdx, clientRole);
}

/** قبول طلب التصحيح — يُلغي القفل القطعي السابق لمن كان متضرراً من التمييز */
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
): string {
    const outcome = resolveCassationClientOutcome(cassationJudgment, clientRole, appealJudgment);
    if (outcome === 'remand_favorable') {
        return '✅ نقض الحكم التمييزي — إعادة الإضبارة قد تُعيد لصالح الموكل';
    }
    if (outcome === 'remand_adverse') {
        return '❌ نقض الحكم التمييزي — إعادة الإضبارة بعد خسارة الموكل في الاستئناف';
    }
    return 'تم نقض الحكم التمييزي وإعادة الإضبارة';
}

export function buildAppealArchiveTimelineTitle(
    judgmentType: string,
    clientRole: ClientAppealRole,
    transitioningToCassation = false,
): string {
    const outcome = resolveAppealStageClientOutcome(judgmentType, clientRole);
    const t = String(judgmentType ?? '').trim();

    if (transitioningToCassation && outcome === 'loss') {
        return `❌ خسارة مرحلة الاستئناف (${t}) — انتقال للتمييز`;
    }
    if (transitioningToCassation && outcome === 'win') {
        return `✅ كسب مرحلة الاستئناف (${t}) — انتقال للتمييز`;
    }
    if (outcome === 'win') return `✅ حكم الاستئناف لصالح الموكل (${t})`;
    if (outcome === 'loss') return `❌ حكم الاستئناف ضد الموكل (${t})`;
    if (outcome === 'partial') return `⚠️ حكم استئناف جزئي (${t}) — يحق للطرفين الطعن فيما حُسم`;
    return `➡️ حكم بـ ${t} والانتقال`;
}
