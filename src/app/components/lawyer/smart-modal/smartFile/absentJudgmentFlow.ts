import { addDaysYmd } from './judgmentTypes';

/** مدة الاعتراض على الحكم الغيابي من تاريخ التبليغ (أيام) */
export const ABSENT_JUDGMENT_OBJECTION_DAYS = 10;

export function isAbsentJudgmentForm(
    judgmentForm?: string | null,
    lastJudgmentType?: string | null,
): boolean {
    const raw = String(judgmentForm ?? lastJudgmentType ?? '').trim();
    return raw === 'غيابي' || raw.startsWith('غيابي');
}

/** مرحلة نظر الاعتراض على الحكم الغيابي (بعد فتح إضبارة الاعتراض). */
export function isAbsentObjectionStageName(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    return s.includes('اعتراض على الحكم الغيابي') || s.includes('اعتراض غيابي');
}

export type AbsentObjectionJudgmentOption = { value: string; label: string };

/** خيارات قرار الحكم في مرحلة الاعتراض — القيم الداخلية تبقى لتوافق منطق الأحكام. */
export function absentObjectionJudgmentOptions(): AbsentObjectionJudgmentOption[] {
    return [
        {
            value: 'إجابة الدعوى بالكامل',
            label: 'تأييد الحكم الغيابي (المعترض عليه ربح الدعوى)',
        },
        {
            value: 'رد الدعوى كلياً',
            label: 'تعديل الحكم الغيابي بالكامل',
        },
        {
            value: 'رد الدعوى جزئياً',
            label: 'تعديل جزئي للحكم الغيابي',
        },
        { value: 'الصلح', label: 'الصلح' },
        { value: 'التنازل عن الدعوى', label: 'التنازل عن الدعوى' },
    ];
}

export function computeAbsentObjectionDeadline(notificationDateYmd: string): string {
    return addDaysYmd(notificationDateYmd, ABSENT_JUDGMENT_OBJECTION_DAYS);
}

export function daysRemainingUntil(deadlineYmd: string, today = new Date()): number {
    const deadline = new Date(deadlineYmd);
    const diff = deadline.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function shouldShowAbsentJudgmentFooter(stage?: {
    judgmentForm?: string | null;
    lastJudgmentType?: string | null;
    isPleadingsClosed?: boolean;
    isUnderObjection?: boolean;
    finalDecision?: string | null;
} | null): boolean {
    if (!stage?.isPleadingsClosed) return false;
    if (stage.isUnderObjection) return false;
    if (!isAbsentJudgmentForm(stage.judgmentForm, stage.lastJudgmentType)) return false;
    const fd = String(stage.finalDecision ?? '');
    if (fd.includes('رد الدعوى كلياً') || fd.includes('ضد الموكل')) return false;
    return true;
}

export function isAwaitingAbsentJudgmentNotification(stage?: {
    judgmentForm?: string | null;
    lastJudgmentType?: string | null;
    isPleadingsClosed?: boolean;
    absentJudgmentNotificationDate?: string | null;
    awaitingAbsentJudgmentNotification?: boolean;
    finalDecision?: string | null;
} | null): boolean {
    if (!shouldShowAbsentJudgmentFooter(stage)) return false;
    if (hasAbsentJudgmentNotificationRecorded(stage)) return false;
    return true;
}

export function hasAbsentJudgmentNotificationRecorded(stage?: {
    absentJudgmentNotificationDate?: string | null;
} | null): boolean {
    return Boolean(String(stage?.absentJudgmentNotificationDate ?? '').trim());
}

export function resolveAbsentObjectionDeadline(stage?: {
    absentJudgmentNotificationDate?: string | null;
    appealDeadline?: string | null;
    legalTimers?: { defaultObjectionDeadline?: string };
} | null): string | null {
    if (stage?.legalTimers?.defaultObjectionDeadline) {
        return stage.legalTimers.defaultObjectionDeadline;
    }
    if (stage?.appealDeadline) return stage.appealDeadline;
    if (stage?.absentJudgmentNotificationDate) {
        return computeAbsentObjectionDeadline(stage.absentJudgmentNotificationDate);
    }
    return null;
}
