import type { TimelineEvent } from '../../LawyerShared';

/** معرّفات مواعيد الخط الزمني للمُهل القانونية — ليست جلسات مرافعة. */
export const LEGAL_DEADLINE_APPT_ID_PREFIXES = [
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
    return /مرافعة قادمة|موعد المرافعة|جلسة مرافعة|محضر الجلسة/i.test(title);
}

export function resolveLegalDeadlineDateLabel(event: TimelineEvent): string {
    const title = String(event.title ?? '').trim();
    if (/تمييز/i.test(title)) return 'آخر موعد للتمييز';
    if (/اعتراض.*غياب|غيابي/i.test(title)) return 'آخر موعد للاعتراض الغيابي';
    if (/إعادة المحاكمة/i.test(title)) return 'آخر موعد لطلب إعادة المحاكمة';
    if (/طعن نهائي/i.test(title)) return 'آخر موعد للطعن النهائي';
    if (/الحكم البدائي/i.test(title) && /طعن/i.test(title)) return 'آخر موعد للاستئناف';
    if (/الحكم الاستئنافي/i.test(title) && /طعن/i.test(title)) return 'آخر موعد للتمييز';
    if (/تاريخ الحكم|تاريخ القرار/i.test(title)) return 'تاريخ صدور القرار';
    return 'آخر موعد قانوني';
}
