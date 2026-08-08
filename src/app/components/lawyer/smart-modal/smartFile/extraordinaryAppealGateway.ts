import type { CaseStage } from '../../LawyerShared';
import { isCassationStageName } from './judgmentTypes';
import {
    resolveLastPleadingStageIndex,
} from './pleadingStageClassification';

export const EXTRAORDINARY_APPEAL_LABELS = {
    retrial: 'إعادة المحاكمة',
    cassation_correction: 'تصحيح القرار التمييزي',
} as const;

export const CASSATION_CORRECTION_STAGE_NAME = 'تصحيح قرار';
export const CASSATION_CORRECTION_TAB_LABEL = CASSATION_CORRECTION_STAGE_NAME;

export function isCassationCorrectionStageName(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    if (!s) return false;
    return s === CASSATION_CORRECTION_STAGE_NAME || (s.includes('تصحيح') && s.includes('قرار'));
}

function stageNameOf(stage: CaseStage | undefined): string {
    return String(stage?.stageName ?? stage?.name ?? '').trim();
}

export function isDossierFinalized(status: string | undefined, stages: CaseStage[]): boolean {
    if (isFinalityPhrase(status)) return true;
    return stages.some((stage) => isFinalityPhrase(stage?.finalDecision));
}

function isFinalityPhrase(value: unknown): boolean {
    const text = String(value ?? '').trim();
    if (!text) return false;
    return (
        text.includes('مكتسبة الدرجة القطعية')
        || text.includes('اكتسب الدرجة القطعية')
        || text.includes('اكتسب القرار الدرجة القطعية')
    );
}

export function isExtraordinaryTypeConsumed(
    stages: CaseStage[],
    type: string,
    caseStatus?: string,
): boolean {
    const needle = String(type).trim();
    if (!needle) return false;
    const status = String(caseStatus ?? '');
    if (needle === EXTRAORDINARY_APPEAL_LABELS.retrial && status.includes('إعادة المحاكمة')) {
        return true;
    }
    if (
        needle === EXTRAORDINARY_APPEAL_LABELS.cassation_correction
        && status.includes('التصحيح')
    ) {
        return true;
    }
    if (needle === EXTRAORDINARY_APPEAL_LABELS.cassation_correction) {
        const cassationIdx = findCassationStageIndex(stages);
        return cassationIdx < 0 || isCassationCorrectionConsumedForStage(stages, cassationIdx);
    }
    return stages.some((stage) => {
        const t = String(stage?.extraordinaryAppealType ?? '').trim();
        if (!t) return false;
        if (t === needle) return true;
        if (needle === EXTRAORDINARY_APPEAL_LABELS.retrial && t.includes('إعادة')) return true;
        return false;
    });
}

export function findCassationStageIndex(stages: CaseStage[]): number {
    for (let i = stages.length - 1; i >= 0; i--) {
        if (isCassationStageName(stageNameOf(stages[i]))) return i;
    }
    return -1;
}

/** تصحيح قرار تمييزي — مرة واحدة لكل دورة تمييز (يُتاح مجدداً بعد نقض وتمييز جديد). */
export function isCassationCorrectionConsumedForStage(
    stages: CaseStage[],
    cassationStageIndex: number,
): boolean {
    if (cassationStageIndex < 0 || cassationStageIndex >= stages.length) return true;
    const cassation = stages[cassationStageIndex];
    if (!isCassationStageName(stageNameOf(cassation))) return true;

    for (let i = cassationStageIndex + 1; i < stages.length; i++) {
        const name = stageNameOf(stages[i]);
        if (isCassationStageName(name)) break;
        if (isCassationCorrectionStageName(name)) return true;
    }
    return false;
}

export function canRequestCassationCorrection(
    stages: CaseStage[],
    cassationStageIndex: number,
    caseStatus?: string,
): boolean {
    if (cassationStageIndex < 0) return false;
    if (String(caseStatus ?? '').includes('التصحيح')) return false;
    return !isCassationCorrectionConsumedForStage(stages, cassationStageIndex);
}

/**
 * بعد قبول طلب التصحيح — آخر مرحلة مرافعة قبل «تصحيح قرار» (وليس التمييز).
 */
export function resolveCorrectionAcceptReturnTargetStageIndex(stages: CaseStage[]): number {
    if (!Array.isArray(stages) || stages.length === 0) return 0;

    let correctionIdx = -1;
    for (let i = stages.length - 1; i >= 0; i--) {
        if (isCassationCorrectionStageName(stageNameOf(stages[i]))) {
            correctionIdx = i;
            break;
        }
    }

    const pleadingIdx = resolveLastPleadingStageIndex(
        stages,
        correctionIdx >= 0 ? correctionIdx : stages.length,
    );
    if (pleadingIdx >= 0) return pleadingIdx;

    return resolveRetrialTargetStageIndex(stages);
}

export function resolveRetrialTargetStageIndex(stages: CaseStage[]): number {
    if (!Array.isArray(stages) || stages.length === 0) return 0;

    const cassationIdx = findCassationStageIndex(stages);
    const beforeIdx = cassationIdx >= 0 ? cassationIdx : stages.length;
    const pleadingIdx = resolveLastPleadingStageIndex(stages, beforeIdx);
    if (pleadingIdx >= 0) return pleadingIdx;

    return Math.max(0, stages.length - 1);
}

export function shouldShowCassationCorrectionTabLabel(
    stage: CaseStage,
    _stages: CaseStage[],
    _caseStatus?: string,
): boolean {
    return isCassationCorrectionStageName(stageNameOf(stage));
}

export function shouldAllowExtraordinaryAppealsWhenArchived(
    status: string | undefined,
    stages: CaseStage[],
): boolean {
    return isDossierFinalized(status, stages);
}

/** طعن استثنائي قيد النظر — يحتاج مدخل إجراءات حتى على مرحلة التمييز النشطة. */
export function isExtraordinaryAppealInProgress(status: string | undefined): boolean {
    const s = String(status ?? '');
    return s.includes('التصحيح') || s.includes('إعادة المحاكمة');
}

/**
 * متى نعرض مدخل الإجراءات المبسّط (legal-only):
 * - أرشيف قطعي، أو
 * - قيد نظر تصحيح/إعادة محاكمة (حتى لو المرحلة تمييز وليست مؤرشفة).
 */
export function shouldShowExtraordinaryLegalEntry(input: {
    isViewingArchived: boolean;
    showWorkSurface: boolean;
    status?: string;
    stages: CaseStage[];
}): boolean {
    if (input.showWorkSurface) return false;
    if (isExtraordinaryAppealInProgress(input.status)) return true;
    return (
        input.isViewingArchived
        && shouldAllowExtraordinaryAppealsWhenArchived(input.status, input.stages)
    );
}
