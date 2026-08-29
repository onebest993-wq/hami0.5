import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { parseLocalNotificationDate } from '@/app/utils/executionStateMachineChrono';
import { addDaysYmd as addDaysYmdFromUtils } from './judgmentDateUtils';
import { JUDGMENT_TYPE_VOID } from './judgmentConstants';
import type { SmartFileAttachment } from './judgmentPayloadTypes';

export { JUDGMENT_TYPE_VOID } from './judgmentConstants';

export function str(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

export function parseJudgmentDateInput(judgmentDate: unknown): Date {
    const jdRaw = str(judgmentDate).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(jdRaw)) {
        return parseLocalNotificationDate(jdRaw);
    }
    if (judgmentDate instanceof Date && !Number.isNaN(judgmentDate.getTime())) {
        return judgmentDate;
    }
    if (typeof judgmentDate === 'number') {
        return new Date(judgmentDate);
    }
    const parsed = new Date(str(judgmentDate));
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function addDaysYmd(base: Date | string, days: number): string {
    return addDaysYmdFromUtils(base, days);
}

export function prependTimeline(
    stage: CaseStage,
    event: TimelineEvent,
): TimelineEvent[] {
    return [event, ...(stage.timeline ?? [])];
}

export function stageAttachments(stage: CaseStage): SmartFileAttachment[] {
    if (!Array.isArray(stage.attachments)) return [];
    return stage.attachments as SmartFileAttachment[];
}

export const JUDGMENT_TYPE_SULH = 'الصلح';
export const JUDGMENT_TYPE_SULH_LEGACY = 'تصديق الصلح والتسوية';
export const JUDGMENT_TYPE_WAIVER = 'التنازل عن الدعوى';
/**
 * @deprecated KEEP — قيمة picker قديمة في سجلات الأحكام المحفوظة.
 * تُقرأ في isNonMeritTerminationType + judgmentConfirm/scenarioArchive.
 */
export const JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY = 'إبطال عريضة الدعوى';

export function isSulhJudgmentType(type: string): boolean {
    return type === JUDGMENT_TYPE_SULH || type === JUDGMENT_TYPE_SULH_LEGACY;
}

export function isNonMeritTerminationType(type: string): boolean {
    return (
        isSulhJudgmentType(type)
        || type === JUDGMENT_TYPE_WAIVER
        || type === JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY
    );
}

export const JUDGMENT_TYPE_FULL_WIN = 'إجابة الدعوى بالكامل';

/** منطوق موضوع الدعوى في البداءة / أحوال شخصية (ليس استئنافاً ولا تمييزاً). */
export function isSubjectMatterJudgmentType(type: string): boolean {
    const t = String(type ?? '').trim();
    return (
        t === JUDGMENT_TYPE_FULL_WIN
        || t === 'إجابة الدعوى'
        || t === 'رد الدعوى كلياً'
        || t === 'رد الدعوى جزئياً'
    );
}

/** أحكام لصالح المدعي/إنهاء رضائي — الطعن التمييزي للمدعى عليه فقط (ما عدا الإبطال). */
export function isDefendantOnlyCassationJudgmentType(type: string): boolean {
    return (
        type === JUDGMENT_TYPE_FULL_WIN
        || type === 'إجابة الدعوى'
        || isSulhJudgmentType(type)
        || type === JUDGMENT_TYPE_WAIVER
    );
}
