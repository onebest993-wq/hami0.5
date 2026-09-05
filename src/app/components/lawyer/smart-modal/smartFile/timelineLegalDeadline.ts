import type { TimelineEvent } from '../../LawyerShared';

/** معرّفات مواعيد الخط الزمني للمُهل القانونية — ليست جلسات مرافعة. */
const LEGAL_DEADLINE_APPT_ID_PREFIXES = [
    'appt_appeal_deadline_',
    'appt_cassation_deadline_',
    'appt_review_deadline_',
    'appt_final_appeal_deadline_',
    'appt_default_objection_deadline_',
    'appt_judgment_',
] as const;

export function isLegalDeadlineTimelineEvent(event: TimelineEvent): boolean {
    const id = String(event.id ?? '');
    if (LEGAL_DEADLINE_APPT_ID_PREFIXES.some((prefix) => id.startsWith(prefix))) return true;
    const title = String(event.title ?? '').trim();
    if (!title) return false;
    return /مهلة|آخر موعد طعن|آخر موعد على|موعد الطعن|تاريخ الحكم|تاريخ القرار/i.test(title);
}

/** موعد مرافعة فعلي — لا يُطبَّق على التمييز، التصحيح، ولا مُهل الطعن. */
export function isPleadingHearingAppointment(event: TimelineEvent): boolean {
    if (event.type !== 'appointment') return false;
    if (isLegalDeadlineTimelineEvent(event)) return false;
    if (event.subType === 'pleading') return true;
    const title = String(event.title ?? '');
    if (/ختام\s*المرافعة|حجز\s*الدعوى\s*للقرار/i.test(title)) return false;
    return /مرافعة|جلسة مرافعة|محضر الجلسة/i.test(title);
}

/** مواعيد غير المرافعات فقط — جلسة المرافعة تُفتح في سجل الجلسات. */
export function shouldOpenAppointmentEditor(event: TimelineEvent): boolean {
    return event.type === 'appointment' && !isPleadingHearingAppointment(event);
}

export function isJudgmentDateTimelineEvent(event: TimelineEvent): boolean {
    const id = String(event.id ?? '');
    if (id.startsWith('appt_judgment_')) return true;
    return /^تاريخ (الحكم|القرار|قرار)/.test(String(event.title ?? '').trim());
}

/** مواعيد المهلة المحسوبة — لا تُعرض في السجل المدني (لا إرشاد بالمدد المتبقية). */
export function shouldHideDeadlineTeachingEvent(event: TimelineEvent): boolean {
    if (!isLegalDeadlineTimelineEvent(event)) return false;
    /*
     * تاريخ القرار التمييزي في مرآة التقويم كان يُعرض كـ«آخر موعد للتمييز»
     * رغم أن التمييز آخر درجة — أخفه من السجل المدني.
     */
    const title = String(event.title ?? '').trim();
    if (/تاريخ القرار التمييزي/i.test(title)) return true;
    return !isJudgmentDateTimelineEvent(event);
}

export function resolveLegalDeadlineDateLabel(event: TimelineEvent): string {
    const title = String(event.title ?? '').trim();
    /* تاريخ القرار قبل أي تطابق عام على كلمة «تمييز» */
    if (isJudgmentDateTimelineEvent(event) || /^تاريخ (الحكم|القرار|قرار)/.test(title)) {
        return 'تاريخ صدور القرار';
    }
    if (/مهلة التمييز|آخر موعد للتمييز|آخر موعد طعن على الحكم الاستئنافي/i.test(title)) {
        return 'آخر موعد للتمييز';
    }
    if (/اعتراض.*غياب|غيابي/i.test(title)) return 'آخر موعد للاعتراض الغيابي';
    if (/إعادة المحاكمة/i.test(title)) return 'آخر موعد لطلب إعادة المحاكمة';
    if (/طعن نهائي/i.test(title)) return 'آخر موعد للطعن النهائي';
    if (/الحكم البدائي/i.test(title) && /طعن/i.test(title)) return 'آخر موعد للاستئناف';
    if (/الحكم الاستئنافي/i.test(title) && /طعن/i.test(title)) return 'آخر موعد للتمييز';
    return 'آخر موعد قانوني';
}
