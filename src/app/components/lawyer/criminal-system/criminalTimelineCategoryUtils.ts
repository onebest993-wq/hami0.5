import {
    INVESTIGATION_EVENT_CATEGORIES,
} from '@/app/types/criminal';

export const PRIVATE_RIGHT_WAIVER_REQUEST_TYPE = 'قرار قضائي: صلح وتنازل عن الحق الشخصي';

/** فئة حدث التايم لاين — تُشغّل إسقاط الحق الشخصي تلقائياً عند الحفظ في الـ Store. */
export const PRIVATE_RIGHT_WAIVER_TIMELINE_CATEGORY = 'قرار صلح وتنازل عن الحق الشخصي';

/** خيار القرار الختامي — إسقاط الحق الشخصي دون إغلاق الدعوى. */
export const PRIVATE_RIGHT_WAIVER_DECISION_VALUE = 'private_right_waiver' as const;
export const PRIVATE_RIGHT_WAIVER_DECISION_LABEL = '🤝 صلح وتنازل عن الحق الشخصي';

export function isPrivateRightWaiverDecisionValue(value: string): boolean {
    return String(value ?? '').trim() === PRIVATE_RIGHT_WAIVER_DECISION_VALUE;
}

const LEGACY_PRIVATE_RIGHT_WAIVER_CATEGORIES = [
    'قرار صلح وتنازل عن الحق الشخصي (قرار قضائي)',
] as const;

export function isPrivateRightWaiverTimelineCategory(category: string): boolean {
    const c = String(category ?? '').trim();
    return c === PRIVATE_RIGHT_WAIVER_TIMELINE_CATEGORY || (LEGACY_PRIVATE_RIGHT_WAIVER_CATEGORIES as readonly string[]).includes(c);
}

/**
 * خيارات مادة 130 — الإحالة من زر الترويسة؛ غلق/انقضاء/صلح من «قرارات القاضي».
 * @deprecated KEEP — واجهة StageCloserModal + اختبارات criminalStageUtils؛ ليست حقل persist بل قائمة ثابتة للتوافق.
 */
export const INVESTIGATION_ARTICLE_130_DECISIONS = [
    { value: 'referral', label: 'إحالة إلى محكمة الموضوع' },
    { value: 'closing', label: 'غلق الدعوى نهائياً' },
    { value: 'temporary_closing', label: 'غلق الدعوى مؤقتاً' },
    { value: 'expiration', label: 'انقضاء / سقوط الدعوى الجزائية' },
] as const;

/** أسباب غلق الدعوى الجزائية في مرحلة التحقيق — مادة 130؛ نوع الحقل على سجل القضية. */
export const INVESTIGATION_CLOSURE_REASONS = [
    { value: 'insufficient_evidence', label: 'لعدم كفاية الأدلة' },
    { value: 'unknown_perpetrator', label: 'الفاعل مجهول' },
    { value: 'force_majeure', label: 'الحادث قضاء وقدر' },
    { value: 'not_punishable_by_law', label: 'الفعل لا يعاقب عليه القانون' },
    { value: 'no_defendant_responsibility', label: 'عدم مسؤولية المتهم' },
] as const;

export type InvestigationClosureReason = (typeof INVESTIGATION_CLOSURE_REASONS)[number]['value'];

export const INVESTIGATION_TIMELINE_OTHER_CATEGORY = 'إجراء مخصص (إدخال يدوي)';

export const INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY = 'تدوين إفادة (مشتكي / شاهد)';

export function isInvestigationAffidavitTimelineCategory(category: string): boolean {
    const c = String(category ?? '').trim();
    return c === INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY || c === 'تدوين إفادة (مشتكي / مخبر / شاهد)';
}

export const INVESTIGATION_TIMELINE_CATEGORIES = [
    INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY,
    'تدوين أقوال المتهم',
    'إصدار أمر (استقدام / قبض وتحري)',
    'قرار توقيف المتهم',
    'طلب إخلاء سبيل بكفالة / بتعهد',
    'مخاطبة مراجع رسمية',
    'ورود تقارير رسمية',
    INVESTIGATION_TIMELINE_OTHER_CATEGORY,
] as const;

/** تصنيفات قديمة محفوظة في التايم لاين — للعرض والتوافق فقط. */
/** مسمى مدمج قديم — يُحوَّل عند العرض ولا يُعرض حرفياً. */
export const LEGACY_MERGED_STATEMENTS_TIMELINE_CATEGORY = 'تدوين أقوال (مشتكي/شاهد/متهم)';

const LEGACY_INVESTIGATION_TIMELINE_CATEGORIES = [
    LEGACY_MERGED_STATEMENTS_TIMELINE_CATEGORY,
    'تدوين أقوال (مشتكي / شاهد / متهم)',
    'تدوين إفادة (مشتكي / مخبر / شاهد)',
    'قرار إخلاء سبيل (بكفالة / بتعهد)',
    'مخاطبة جهة رسمية / خبراء / أدلة جنائية',
    'ورود تقرير رسمي / طبي / كشف المخطط',
    PRIVATE_RIGHT_WAIVER_TIMELINE_CATEGORY,
    'قرار غلق الدعوى (مادة 130 أصول)',
    'قرار إحالة إلى محكمة الموضوع',
    'تقديم طعن تمييزي على قرار قاضي التحقيق',
    'إجراء آخر (إدخال يدوي)',
] as const;

export function isInvestigationTimelineCategory(category: string): boolean {
    const c = normalizeTimelineCategoryForDisplay(String(category ?? '').trim());
    if ((INVESTIGATION_EVENT_CATEGORIES as readonly string[]).includes(c as (typeof INVESTIGATION_EVENT_CATEGORIES)[number])) {
        return true;
    }
    return (
        (INVESTIGATION_TIMELINE_CATEGORIES as readonly string[]).includes(c as (typeof INVESTIGATION_TIMELINE_CATEGORIES)[number]) ||
        (LEGACY_INVESTIGATION_TIMELINE_CATEGORIES as readonly string[]).includes(
            c as (typeof LEGACY_INVESTIGATION_TIMELINE_CATEGORIES)[number],
        )
    );
}

/** حدث تحقيقي — يُقفل بعد الإحالة. */
export function isLockedInvestigationTimelineEvent(category: string, eventType?: string): boolean {
    if (String(eventType ?? '').trim() === 'investigation') return true;
    return isInvestigationTimelineCategory(category);
}

export function isInvestigationPersonalDefendantCategory(category: string): boolean {
    const c = String(category ?? '').trim();
    return (
        c === 'تدوين أقوال المتهم' ||
        c === 'إصدار أمر (استقدام / قبض وتحري)' ||
        c === 'إصدار أمر (استقدام / قبض وتحري)' ||
        c === 'إصدار أمر (استقدام / قبض)' ||
        c === 'قرار توقيف المتهم' ||
        c === 'قرار توقيف ابتداءً' ||
        c === 'قرار تمديد توقيف' ||
        c === 'قرار توقيف / تمديد توقيف' ||
        c === 'طلب إخلاء سبيل بكفالة / بتعهد' ||
        c === 'قرار إخلاء سبيل بكفالة / بتعهد' ||
        c === 'قرار إخلاء سبيل (بكفالة / بتعهد)' ||
        c === 'إصدار أمر قبض/توقيف' ||
        c === 'تمديد توقيف المتهم'
    );
}

/** إجراءات إدارية/وثائقية — لا تُظهر اختيار المتهم. */
export function isInvestigationNonPersonalCategory(category: string): boolean {
    const c = String(category ?? '').trim();
    if (isInvestigationPersonalDefendantCategory(c)) return false;
    return (
        c === 'مخاطبة مراجع رسمية' ||
        c === 'ورود تقارير رسمية' ||
        c === INVESTIGATION_TIMELINE_OTHER_CATEGORY ||
        c === 'تدوين إفادة (مشتكي / شاهد)' ||
        c === 'تدوين إفادة (مشتكي / مخبر / شاهد)' ||
        c === 'مخاطبة جهة رسمية / خبراء / أدلة جنائية' ||
        c === 'ورود تقرير رسمي / طبي / كشف المخطط' ||
        c === 'قرار غلق الدعوى (مادة 130 أصول)' ||
        c === 'قرار غلق الدعوى' ||
        c === 'قرار إحالة إلى محكمة الموضوع' ||
        isPrivateRightWaiverTimelineCategory(c) ||
        isInvestigationCassationAppealCategory(c)
    );
}

export function isInvalidTimelineTitlePlaceholder(title: string): boolean {
    const t = String(title ?? '').trim();
    if (!t) return true;
    if (/^[!؟?.\-_\s]+$/.test(t)) return true;
    if (/^f+$/i.test(t)) return true;
    if (/^[a-z0-9]{1,4}$/i.test(t) && !/[اأإآبتثجحخدذرزسشصضطظعغفقكلمنهوي]/i.test(t)) return true;
    return false;
}

/** يحوّل التصنيفات القديمة/المدمجة إلى المسميات المعتمدة للعرض. */
export function normalizeTimelineCategoryForDisplay(category: string): string {
    const c = String(category ?? '').trim();
    if (!c) return '';
    if (
        c === LEGACY_MERGED_STATEMENTS_TIMELINE_CATEGORY ||
        c === 'تدوين أقوال (مشتكي / شاهد / متهم)' ||
        (/تدوين\s+أقوال/i.test(c) && /مشتكي/i.test(c) && /متهم/i.test(c))
    ) {
        return INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY;
    }
    if (c === 'تدوين إفادة (مشتكي / مخبر / شاهد)') return INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY;
    if (c === 'قرار إخلاء سبيل (بكفالة / بتعهد)') return 'طلب إخلاء سبيل بكفالة / بتعهد';
    if (c === 'قرار إخلاء سبيل بكفالة / بتعهد') return 'طلب إخلاء سبيل بكفالة / بتعهد';
    if (c === 'مخاطبة جهة رسمية / خبراء / أدلة جنائية') return 'مخاطبة مراجع رسمية';
    if (c === 'ورود تقرير رسمي / طبي / كشف المخطط') return 'ورود تقارير رسمية';
    if (c === 'إجراء آخر (إدخال يدوي)') return INVESTIGATION_TIMELINE_OTHER_CATEGORY;
    return c;
}

export function formatTimelineCategoryDisplayLabel(category: string): string {
    const normalized = normalizeTimelineCategoryForDisplay(category);
    return normalized || 'غير مصنف';
}

/** عنوان الحدث: التصنيف افتراضياً، أو النص اليدوي للإجراء المخصص. */
export function resolveTimelineEventTitle(category: string, manualTitle?: string): string {
    const cat = String(category ?? '').trim();
    const manual = String(manualTitle ?? '').trim();
    if (cat === INVESTIGATION_TIMELINE_OTHER_CATEGORY || cat === 'إجراء آخر (إدخال يدوي)') {
        return manual || INVESTIGATION_TIMELINE_OTHER_CATEGORY;
    }
    if (manual && !isInvalidTimelineTitlePlaceholder(manual)) return manual;
    return cat || '—';
}

export function isTimelineNextDateInvalid(eventDate: string, nextDate: string): boolean {
    const ev = String(eventDate ?? '').trim();
    const next = String(nextDate ?? '').trim();
    if (!ev || !next) return false;
    return next < ev;
}

export function isInvestigationDetentionCategory(category: string): boolean {
    const c = String(category ?? '').trim();
    return (
        c === 'قرار توقيف المتهم' ||
        c === 'قرار توقيف / تمديد توقيف' ||
        c === 'قرار توقيف ابتداءً' ||
        c === 'قرار تمديد توقيف'
    );
}

export function isInvestigationReferralCategory(category: string): boolean {
    return String(category ?? '').trim() === 'قرار إحالة إلى محكمة الموضوع';
}

export function isInvestigationCassationAppealCategory(category: string): boolean {
    return String(category ?? '').trim() === 'تقديم طعن تمييزي على قرار قاضي التحقيق';
}

export function isDetentionArrestCategory(category: string): boolean {
    const c = String(category ?? '').trim();
    return (
        c === 'إصدار أمر (استقدام / قبض وتحري)' ||
        c === 'إصدار أمر (استقدام / قبض)' ||
        c === 'إصدار أمر قبض/توقيف' ||
        c === 'إصدار أمر قبض/توقيف (من المحكمة)' ||
        c === 'إصدار أمر استقدام'
    );
}

export function resolveInvestigationTimelineEventType(category: string): 'investigation' | 'decision' {
    const c = String(category ?? '').trim();
    if (
        isInvestigationReferralCategory(c) ||
        isInvestigationCassationAppealCategory(c) ||
        isPrivateRightWaiverTimelineCategory(c) ||
        c.startsWith('قرار ')
    ) {
        return 'decision';
    }
    return 'investigation';
}
