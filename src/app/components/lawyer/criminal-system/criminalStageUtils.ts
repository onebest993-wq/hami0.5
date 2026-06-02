import type { CaseStage, JourneyNode } from '@/app/types/criminal';
import {
    INVESTIGATION_EVENT_CATEGORIES,
    TRIAL_EVENT_CATEGORIES,
} from '@/app/types/criminal';
import { getCurrentJourneyNode, repairSameCourtRemandJourneyNodes } from './stageJourney';
import type {
    CriminalCaseStage,
    CriminalComplainant,
    CriminalDefendant,
    CriminalLawyerRole,
    CrimeType,
    DefendantStatus,
    OurRepresentation,
    TimelineEvent,
} from './criminalStore';

export type { CaseStage } from '@/app/types/criminal';
export { INVESTIGATION_EVENT_CATEGORIES, TRIAL_EVENT_CATEGORIES } from '@/app/types/criminal';

export const INVESTIGATION_LOCK_MUTATION_ERROR =
    'مرحلة التحقيق مقفلة — لا يجوز إضافة أو تعديل أو حذف إجراءات التحقيق بعد الإحالة.';

/** صفة المكتب في الدعوى — القائمة الموحدة الوحيدة في نموذج الإنشاء. */
export const OFFICE_REPRESENTATION_OPTIONS = [
    { value: 'complainant_side' as const, label: 'وكيل المشتكي / المدعي بالحق الشخصي' },
    { value: 'defendant_side' as const, label: 'وكيل المشكو منه / المتهم' },
] as const;

export function legacyRoleFromRepresentation(rep: OurRepresentation | ''): CriminalLawyerRole | '' {
    if (rep === 'defendant_side') return 'وكيل المشكو منه';
    if (rep === 'complainant_side') return 'وكيل المشتكي';
    return '';
}

export const COMPLAINANT_PARTY_BADGE = '[⚖️ المشتكي / المدعي بالحق الشخصي]';
export const DEFENDANT_PARTY_BADGE = '[👤 المشكو منه / المتهم]';
export const MUTUAL_COMPLAINT_PARTY_BADGE = '[⚖️ شكوى متقابلة]';

/** شارة صفة الحدث على بطاقة الطرف — نص مختصر دون رموز. */
export const JUVENILE_PARTY_BADGE = 'الحدث';

/** فئة سجل تاريخي قديمة — لا تُنشأ من الترويسة بعد الآن؛ تُعرض للقراءة فقط. */
export const PHYSICAL_LOCATION_TIMELINE_CATEGORY = 'تحديث الموقع المادي للإضبارة';

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
 * @deprecated للواجهة — يُستخدم في مودال إغلاق المرحلة (محاكمة) واختبارات التوافق.
 */
export const INVESTIGATION_ARTICLE_130_DECISIONS = [
    { value: 'referral', label: 'إحالة إلى محكمة الموضوع' },
    { value: 'closing', label: 'غلق الدعوى نهائياً' },
    { value: 'temporary_closing', label: 'غلق الدعوى مؤقتاً' },
    { value: 'expiration', label: 'انقضاء / سقوط الدعوى الجزائية' },
] as const;

export type InvestigationArticle130DecisionValue = (typeof INVESTIGATION_ARTICLE_130_DECISIONS)[number]['value'];

/**
 * أسباب غلق الدعوى الجزائية في مرحلة التحقيق — مادة 130 من أصول المحاكمات الجزائية العراقي.
 * تُستخدم في قرارات [غلق نهائي / غلق مؤقت] كحقل إجباري.
 */
export const INVESTIGATION_CLOSURE_REASONS = [
    { value: 'insufficient_evidence', label: 'لعدم كفاية الأدلة' },
    { value: 'unknown_perpetrator', label: 'الفاعل مجهول' },
    { value: 'force_majeure', label: 'الحادث قضاء وقدر' },
    { value: 'not_punishable_by_law', label: 'الفعل لا يعاقب عليه القانون' },
    { value: 'no_defendant_responsibility', label: 'عدم مسؤولية المتهم' },
] as const;

export type InvestigationClosureReason = (typeof INVESTIGATION_CLOSURE_REASONS)[number]['value'];

export function isInvestigationClosureReason(v: string): v is InvestigationClosureReason {
    return INVESTIGATION_CLOSURE_REASONS.some((o) => o.value === v);
}

export function investigationClosureReasonLabel(v: InvestigationClosureReason | string): string {
    return INVESTIGATION_CLOSURE_REASONS.find((o) => o.value === v)?.label ?? '';
}

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

export const LEGACY_INVESTIGATION_TIMELINE_CATEGORIES = [
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

export type InvestigationTimelineCategory = (typeof INVESTIGATION_TIMELINE_CATEGORIES)[number];

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

/** تصنيفات المحاكمة (الجنح / الجنايات) — بما فيها المسميات القديمة المتوافقة. */
const LEGACY_TRIAL_TIMELINE_CATEGORIES = [
    'تأجيل الجلسة/المراجعة',
    'تأجيل الجلسة',
    'نطق بالقرار',
    'قرار حكم',
    'قرار حكم غيابي',
    'قرار حكم وجاهي',
    'جلسة محاكمة',
    'جلسة مرافعة',
    'قرار إفراج',
    'إحالة لعدم الاختصاص',
    'قرار إحالة إلى المحكمة المختصة',
    'ضم وإغلاق إضبارة',
] as const;

export function isTrialTimelineCategory(category: string): boolean {
    const c = normalizeTimelineCategoryForDisplay(String(category ?? '').trim());
    if ((TRIAL_EVENT_CATEGORIES as readonly string[]).includes(c as (typeof TRIAL_EVENT_CATEGORIES)[number])) {
        return true;
    }
    if ((LEGACY_TRIAL_TIMELINE_CATEGORIES as readonly string[]).includes(c as (typeof LEGACY_TRIAL_TIMELINE_CATEGORIES)[number])) {
        return true;
    }
    if (c === 'قرار تمييزي (نقض وإعادة)') return true;
    return false;
}

/** حدث تحقيقي — يُقفل بعد الإحالة. */
export function isLockedInvestigationTimelineEvent(category: string, eventType?: string): boolean {
    if (String(eventType ?? '').trim() === 'investigation') return true;
    return isInvestigationTimelineCategory(category);
}

export function caseStageFromStoredStage(stage: string): CaseStage | null {
    const key = stageToProceduralKey(stage);
    if (key === 'investigation' || key === 'juvenile_investigation') return 'investigation';
    if (key === 'misdemeanor' || key === 'juvenile_trial') return 'misdemeanor';
    if (key === 'felony') return 'felony';
    if (String(stage ?? '').trim() === 'cassation_court') return 'cassation';
    return null;
}

export function storedStageFromCaseStage(caseStage: CaseStage): CriminalCaseStage {
    if (caseStage === 'investigation') return 'مرحلة التحقيق';
    if (caseStage === 'misdemeanor') return 'محكمة الجنح';
    if (caseStage === 'felony') return 'محكمة الجنايات';
    return 'cassation_court';
}

/** مزامنة الرحلة — يحافظ على مراحل الأحداث المخزنة ولا يُعيدها لمسار بالغ افتراضياً. */
export function syncStoredStageFromJourneyCaseStage(
    caseStage: CaseStage,
    existingStoredStage?: string,
): CriminalCaseStage {
    const existing = String(existingStoredStage ?? '').trim();
    if (caseStage === 'investigation' && isInvestigationStoredStage(existing)) {
        return existing as CriminalCaseStage;
    }
    if (caseStage === 'misdemeanor' && existing === 'محكمة الأحداث') {
        return 'محكمة الأحداث';
    }
    return storedStageFromCaseStage(caseStage);
}

export function resolveCaseStageFromRecord(
    record: { caseStage?: CaseStage; basics?: { stage?: string }; isSentToCassation?: boolean } | undefined,
): CaseStage {
    const explicit = String(record?.caseStage ?? '').trim();
    if (
        explicit === 'investigation' ||
        explicit === 'misdemeanor' ||
        explicit === 'felony' ||
        explicit === 'cassation'
    ) {
        return explicit;
    }
    if (record?.isSentToCassation) return 'cassation';
    const fromStage = caseStageFromStoredStage(String(record?.basics?.stage ?? ''));
    return fromStage ?? 'investigation';
}

/** المرحلة التشغيلية الحالية — كما يراها المحامي (إعادة فتح التحقيق، مسار الرحلة، ثم السجل). */
export function resolveOperationalCaseStage(
    record:
        | {
              caseStage?: CaseStage;
              basics?: { stage?: string };
              isSentToCassation?: boolean;
              isInvestigationLocked?: boolean;
              stageJourney?: JourneyNode[];
          }
        | undefined,
): CaseStage {
    if (!record) return 'investigation';

    const fromRecord = resolveCaseStageFromRecord(record);
    const journeyRaw = Array.isArray(record.stageJourney) ? record.stageJourney : [];
    const journey = journeyRaw.length > 0 ? repairSameCourtRemandJourneyNodes(journeyRaw) : [];

    if (fromRecord === 'investigation' && record.isInvestigationLocked !== true) {
        return 'investigation';
    }

    if (journey.length > 0) {
        const fromJourney = getCurrentJourneyNode(journey)?.stage;
        if (
            fromJourney === 'investigation' ||
            fromJourney === 'misdemeanor' ||
            fromJourney === 'felony' ||
            fromJourney === 'cassation'
        ) {
            return fromJourney;
        }
    }

    return fromRecord;
}

/**
 * مرحلة أهلية الضم — تُطابق «خزانة الأضابير» ومرحلة التحقيق الفعّالة،
 * لا مجرد caseStage القديم أو عقدة رحلة عالقة بعد إعادة التحقيق.
 */
export function resolveMergeEligibilityStage(
    record:
        | {
              caseStage?: CaseStage;
              basics?: { stage?: string };
              isSentToCassation?: boolean;
              isInvestigationLocked?: boolean;
              stageJourney?: JourneyNode[];
          }
        | undefined,
): CaseStage {
    if (!record) return 'investigation';

    // يُطابق CriminalDashboard: isInvestigationPhase = (resolveCaseStageFromRecord === 'investigation')
    const fromRecord = resolveCaseStageFromRecord(record);
    if (fromRecord === 'investigation') {
        return 'investigation';
    }

    const stored = String(record.basics?.stage ?? '').trim();
    const investigationLocked = record.isInvestigationLocked === true;
    const journeyRaw = Array.isArray(record.stageJourney) ? record.stageJourney : [];

    // عقدة تحقيق «current» صريحة — قبل repair الذي قد يُعيد تفعيل محكمة قديمة.
    if (journeyRaw.length > 0) {
        const rawCurrent = getCurrentJourneyNode(journeyRaw)?.stage;
        if (rawCurrent === 'investigation') return 'investigation';
    }

    if (isInvestigationStoredStage(stored) && !investigationLocked) {
        return 'investigation';
    }

    if (journeyRaw.length > 0) {
        const journey = repairSameCourtRemandJourneyNodes(journeyRaw);
        const fromJourney = getCurrentJourneyNode(journey)?.stage;
        if (
            fromJourney === 'investigation' ||
            fromJourney === 'misdemeanor' ||
            fromJourney === 'felony' ||
            fromJourney === 'cassation'
        ) {
            return fromJourney;
        }
    }

    return resolveCaseStageFromRecord(record);
}

/** مرحلة تحقيق كما في اللوحة أو في خزانة الأضابير — مرحلة مخزنة أو محكمة/رقم تحقيق. */
export function isInvestigationMergeBucket(
    record:
        | {
              caseStage?: CaseStage;
              basics?: { stage?: string };
              location?: {
                  investigationCourtName?: string;
                  investigationDossierNumber?: string;
                  baseRegisterNumberAndDate?: string;
              };
          }
        | undefined,
): boolean {
    if (!record) return false;
    if (resolveCaseStageFromRecord(record) === 'investigation') return true;
    if (isInvestigationStoredStage(String(record.basics?.stage ?? ''))) return true;
    const loc = record.location ?? {};
    if (String(loc.investigationCourtName ?? '').trim()) return true;
    if (String(loc.investigationDossierNumber ?? '').trim()) return true;
    if (String(loc.baseRegisterNumberAndDate ?? '').trim()) return true;
    return false;
}

/**
 * سِلّة المرحلة للضم — من `basics.stage` في الخزانة (محكمة الأحداث/تحقيق الأحداث منفصلان عن البالغين).
 */
export type MergeStageBucket =
    | 'investigation'
    | 'juvenile_investigation'
    | 'misdemeanor'
    | 'felony'
    | 'juvenile_trial'
    | 'cassation';

export function resolveMergeStageBucket(
    record:
        | {
              caseStage?: CaseStage;
              basics?: { stage?: string };
              isSentToCassation?: boolean;
          }
        | undefined,
): MergeStageBucket {
    if (!record) return 'investigation';

    const stored = String(record.basics?.stage ?? '').trim();
    const procKey = stored ? stageToProceduralKey(stored) : null;
    if (procKey === 'juvenile_investigation') return 'juvenile_investigation';
    if (procKey === 'juvenile_trial') return 'juvenile_trial';
    if (procKey === 'investigation') return 'investigation';
    if (procKey === 'misdemeanor') return 'misdemeanor';
    if (procKey === 'felony') return 'felony';
    if (procKey === 'cassation') return 'cassation';

    if (record.isSentToCassation) return 'cassation';
    const fromRecord = resolveCaseStageFromRecord(record);
    if (fromRecord === 'cassation') return 'cassation';
    if (fromRecord === 'misdemeanor') return 'misdemeanor';
    if (fromRecord === 'felony') return 'felony';
    if (fromRecord === 'investigation') return 'investigation';
    return 'investigation';
}

/**
 * مرحلة المقارنة عند الضم — تُطابق عرض الخزانة واللوحة، لا مسار الرحلة وحده.
 */
export function resolveMergeComparisonStage(
    record:
        | {
              caseStage?: CaseStage;
              basics?: { stage?: string };
              isSentToCassation?: boolean;
              isInvestigationLocked?: boolean;
              stageJourney?: JourneyNode[];
          }
        | undefined,
): CaseStage {
    if (!record) return 'investigation';

    const bucket = resolveMergeStageBucket(record);
    if (bucket === 'juvenile_investigation' || bucket === 'investigation') return 'investigation';
    if (bucket === 'juvenile_trial') return 'misdemeanor';
    if (bucket === 'misdemeanor' || bucket === 'felony' || bucket === 'cassation') return bucket;
    return resolveMergeEligibilityStage(record);
}

export function isTrialCaseStage(caseStage: CaseStage): boolean {
    return caseStage === 'misdemeanor' || caseStage === 'felony';
}

export function sortTimelineEventsDesc<T extends { date?: string }>(events: T[]): T[] {
    return [...events].sort((a, b) => {
        const aT = Date.parse(String(a.date ?? '').trim());
        const bT = Date.parse(String(b.date ?? '').trim());
        const aKey = Number.isFinite(aT) ? aT : 0;
        const bKey = Number.isFinite(bT) ? bT : 0;
        return bKey - aKey;
    });
}

/** دمج عرضي لأحداث التحقيق + المحاكمة مع ترتيب زمني تنازلي. */
export function buildCombinedTimelineView<T extends TimelineEvent>(investigation: T[], trial: T[]): T[] {
    return sortTimelineEventsDesc([...investigation, ...trial]);
}

/** إجراءات المسار الإجرائي التي تستهدف متهماً (توقيف/كفالة/أقوال/أمر قبض). */
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

/** تسمية موقع الإضبارة المادي للعرض في الترويسة. */
export function formatPhysicalLocationLabel(loc: string, customName?: string): string {
    const custom = String(customName ?? '').trim();
    if (loc === 'judge_desk') return 'على مكتب القاضي';
    if (loc === 'investigator_room') return 'في غرفة المحقق';
    if (loc === 'prosecution') return 'لدى الادعاء العام';
    if (loc === 'police_station') return 'في مركز الشرطة';
    if (loc === 'archive') return 'في الأرشيف';
    if (loc === 'custom') return custom || 'مكان مخصص';
    return custom || 'موقع الإضبارة';
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

export function isInvestigationBailCategory(category: string): boolean {
    const c = String(category ?? '').trim();
    return (
        c === 'طلب إخلاء سبيل بكفالة / بتعهد' ||
        c === 'قرار إخلاء سبيل بكفالة / بتعهد' ||
        c === 'قرار إخلاء سبيل (بكفالة / بتعهد)'
    );
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

export function isInvestigationBailCategoryLegacy(category: string): boolean {
    const c = String(category ?? '').trim();
    return c === 'إخلاء سبيل بكفالة' || c === 'قرار قبول الكفالة';
}

export function isBailCategory(category: string): boolean {
    return isInvestigationBailCategory(category) || isInvestigationBailCategoryLegacy(category);
}

export function isDetentionExtensionCategoryLegacy(category: string): boolean {
    return String(category ?? '').trim() === 'تمديد توقيف المتهم';
}

export function isDetentionExtensionCategory(category: string): boolean {
    return isInvestigationDetentionCategory(category) || isDetentionExtensionCategoryLegacy(category);
}

/** شارة العمود في شبكة الخصوم حسب جهة الطرف (وليس صفة المكتب). */
export function partyColumnBadge(partyKind: 'complainant' | 'defendant'): string {
    return partyKind === 'complainant' ? COMPLAINANT_PARTY_BADGE : DEFENDANT_PARTY_BADGE;
}

export type CriminalActionParty = {
    id: string;
    fullName: string;
    isJuvenile?: boolean;
    isUnderSeven?: boolean;
    source: 'complainant' | 'defendant';
    /** متوفى — يُستبعد من القوائم الإجرائية الحية. */
    isDeceased?: boolean;
    /**
     * ⚖️ ازدواجية الصفة — هذا الطرف داخل دعوى متقابلة (إمّا case-level
     * isMutualComplaint=true، أو complainant ذو isCrossComplaint=true). يَستخدمه
     * المُنسِّق الموحّد لاستبدال «مشتكي:/متهم:» ببادئة موحَّدة تَمنع التَناقض في الواجهة.
     */
    inMutualComplaint?: boolean;
    /** مشتكٍ يُعامَل كمتهم (شكوى متقابلة على مستوى الكيس أو isCrossComplaint شخصياً). */
    isAccusedAsComplainant?: boolean;
};

/** @deprecated استخدم buildAllParties من partyContextFilter — يُبقى للتوافق. */
export function buildConcernedParties(
    complainants: Array<{ id: string; fullName: string; isJuvenile?: boolean; isUnderSeven?: boolean }>,
    defendants: Array<{ id: string; fullName: string; isJuvenile?: boolean; isUnderSeven?: boolean }>,
): CriminalActionParty[] {
    return [
        ...complainants.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            isJuvenile: c.isJuvenile,
            isUnderSeven: c.isUnderSeven,
            source: 'complainant' as const,
            isDeceased: false,
        })),
        ...defendants.map((d) => ({
            id: d.id,
            fullName: d.fullName,
            isJuvenile: d.isJuvenile,
            isUnderSeven: d.isUnderSeven,
            source: 'defendant' as const,
            isDeceased: false,
        })),
    ];
}

/**
 * 🔖 بادئة الصفة الموحَّدة:
 *  - إن كان الطرف داخل شكوى متقابلة (ازدواجية صفة) → بادئة مُحايدة «الطرف:» لمَنع
 *    التَناقض البصري في القوائم (إذ تتداخل صفة المشتكي والمتهم على نفس الشخص).
 *  - وإلا → نَستخدم البادئة الكلاسيكية «مشتكي:» أو «متهم:».
 */
/** ترميز اسم الحدث إلى الأحرف الأولى (مثل: أ. م. ع). */
export function anonymizeJuvenilePartyName(fullName: string): string {
    const parts = String(fullName ?? '')
        .trim()
        .split(/\s+/)
        .filter((p) => p.length > 0);
    if (!parts.length) return '—';
    return parts.map((p) => `${p.charAt(0)}.`).join(' ');
}

export function displayPartyNameForCase(
    fullName: string,
    options: { isJuvenile?: boolean; isConfidential?: boolean; forExportOrPrint?: boolean },
): string {
    const raw = String(fullName ?? '').trim() || '—';
    if (raw.startsWith('مشكو منه مجهول') || raw.startsWith('حدث مجهول')) return raw;
    if (!options.isJuvenile) return raw;
    if (options.isConfidential || options.forExportOrPrint) {
        return anonymizeJuvenilePartyName(raw);
    }
    return raw;
}

export function formatConcernedPartyLabel(
    party: CriminalActionParty,
    opts?: { anonymizeJuvenile?: boolean },
): string {
    const name = displayPartyNameForCase(String(party.fullName ?? '').trim() || '—', {
        isJuvenile: Boolean(party.isJuvenile),
        isConfidential: opts?.anonymizeJuvenile === true,
        forExportOrPrint: opts?.anonymizeJuvenile === true,
    });
    if (party.inMutualComplaint) {
        const prefix = party.isUnderSeven ? 'الطرف-صغير' : party.isJuvenile ? 'الطرف-حدث' : 'الطرف';
        return `${prefix}: ${name}`;
    }
    if (party.source === 'complainant') {
        if (party.isUnderSeven) return `مشتكي/مجني عليه-صغير: ${name}`;
        return party.isJuvenile ? `مشتكي/مجني عليه-حدث: ${name}` : `مشتكي: ${name}`;
    }
    if (party.isUnderSeven) return `مشكو منه/متهم-صغير: ${name}`;
    return party.isJuvenile ? `مشكو منه/متهم-حدث: ${name}` : `متهم: ${name}`;
}

/** تسمية عرض حالة طلب المحامي (القيم المخزنة pending | approved | rejected). */
export function formatLawyerRequestStatusLabel(status: 'pending' | 'approved' | 'rejected' | 'executed'): string {
    if (status === 'executed') return 'قرار نافذ / مُنفَّذ';
    if (status === 'approved') return 'تم القبول (موافقة)';
    if (status === 'rejected') return 'تم الرفض';
    return 'قيد النظر';
}

export type InvestigationLogStatus = 'awaiting_response' | 'response_received' | 'returned_for_revision';

/** تسمية عرض حالة إجراء المتابعة/الدليل. */
export function formatInvestigationLogStatusLabel(status: InvestigationLogStatus): string {
    if (status === 'response_received') return 'ورد التقرير / الجواب';
    if (status === 'returned_for_revision') return 'أُعيد للتعديل';
    return 'بانتظار الإجابة';
}

export function normalizeInvestigationLogStatus(raw: unknown): InvestigationLogStatus {
    const v = String(raw ?? '').trim();
    if (v === 'response_received' || v === 'completed' || v === 'مُنجز' || v.includes('ورد')) return 'response_received';
    if (v === 'returned_for_revision' || v.includes('أُعيد') || v.includes('اعيد')) return 'returned_for_revision';
    if (v === 'awaiting_response' || v === 'pending' || v.includes('انتظار') || v.includes('النظر')) return 'awaiting_response';
    return 'awaiting_response';
}

/** قائمة الأطراف المستهدفة بالإجراءات (توقيف/كفالة/إفادات…) — مدمجة عند الشكوى المتقابلة. */
export function buildCriminalActionParties(
    complainants: Array<{
        id: string;
        fullName: string;
        isJuvenile?: boolean;
        isUnderSeven?: boolean;
        isCrossComplaint?: boolean;
    }>,
    defendants: Array<{ id: string; fullName: string; isJuvenile?: boolean; isUnderSeven?: boolean }>,
    isMutualComplaint: boolean,
): CriminalActionParty[] {
    // ⚖️ المعيار الموحَّد للشكوى المتقابلة: case-level OR per-complainant flag.
    //    أي مشتكٍ يحمل `isCrossComplaint=true` يُعامَل كمتهم حتى لو لم يَكن الكيس بأكمله متقابلاً.
    const accusedComplainants = complainants.filter(
        (c) => isMutualComplaint || c.isCrossComplaint === true,
    );
    /**
     * 🏷️ علم `inMutualComplaint` يُوضَع على كل طرف في الكيس عندما تَكون الشكوى متقابلة
     *    على مستوى الكيس (isMutualComplaint=true)، أو يَحمل المُشتكي شخصياً علم
     *    isCrossComplaint=true — هذا يُتيح للمُنسِّق استبدال «مشتكي:/متهم:» ببادئة موحَّدة.
     */
    const partiesAreDual = isMutualComplaint || accusedComplainants.length > 0;
    if (accusedComplainants.length === 0) {
        return defendants.map((d) => ({
            id: d.id,
            fullName: d.fullName,
            isJuvenile: d.isJuvenile,
            isUnderSeven: d.isUnderSeven,
            source: 'defendant' as const,
            inMutualComplaint: partiesAreDual,
        }));
    }
    return [
        ...accusedComplainants.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            isJuvenile: c.isJuvenile,
            isUnderSeven: c.isUnderSeven,
            source: 'complainant' as const,
            inMutualComplaint: true,
            isAccusedAsComplainant: true,
        })),
        ...defendants.map((d) => ({
            id: d.id,
            fullName: d.fullName,
            isJuvenile: d.isJuvenile,
            isUnderSeven: d.isUnderSeven,
            source: 'defendant' as const,
            inMutualComplaint: true,
        })),
    ];
}

/**
 * هل هذا المشتكي يَكتسب صفة المتهم؟
 *  - إذا كان `caseRecord.isMutualComplaint === true` (شكوى متقابلة على مستوى الكيس)، فكل المشتكين متّهمون.
 *  - أو إذا كان `complainant.isCrossComplaint === true` (تخصيص لمشتكٍ بعينه).
 */
export function isComplainantAlsoAccused(
    complainant: { isCrossComplaint?: boolean },
    caseRecord: { isMutualComplaint?: boolean },
): boolean {
    return complainant.isCrossComplaint === true || caseRecord.isMutualComplaint === true;
}

/** المسار الإجرائي — القيم المخزنة ثابتة؛ التسميات المرئية تُشتق عبر formatProceduralStageLabel. */
export const CRIMINAL_PROCEDURAL_STAGES = [
    { value: 'مرحلة التحقيق' as const, key: 'investigation', label: 'مرحلة التحقيق' },
    { value: 'تحقيق الأحداث' as const, key: 'juvenile_investigation', label: 'تحقيق - أحداث' },
    { value: 'محكمة الأحداث' as const, key: 'juvenile_trial', label: 'محكمة - أحداث' },
    { value: 'محكمة الجنح' as const, key: 'misdemeanor', label: 'محكمة الجنح' },
    { value: 'محكمة الجنايات' as const, key: 'felony', label: 'محكمة الجنايات' },
    {
        value: 'cassation_court' as const,
        key: 'cassation',
        label: 'محكمة التمييز / الاستئناف بصفتها التمييزية',
    },
] as const;

/** خيارا مرحلة الدعوى فقط عندما يكون كل المتهمين أحداثاً. */
export const JUVENILE_EXCLUSIVE_FORM_STAGE_OPTIONS = [
    { value: 'تحقيق الأحداث' as const, label: 'تحقيق - أحداث' },
    { value: 'محكمة الأحداث' as const, label: 'محكمة - أحداث' },
] as const;

const JUVENILE_EXCLUSIVE_STAGE_VALUES = new Set<string>(
    JUVENILE_EXCLUSIVE_FORM_STAGE_OPTIONS.map((o) => o.value),
);

const ADULT_FORM_STAGE_VALUES = new Set<string>(
    CRIMINAL_PROCEDURAL_STAGES.filter(
        (opt) => opt.key !== 'juvenile_investigation' && opt.key !== 'juvenile_trial',
    ).map((opt) => opt.value),
);

export type CriminalProceduralKey = (typeof CRIMINAL_PROCEDURAL_STAGES)[number]['key'];

const BASE_PROCEDURAL_STAGE_LABELS: Record<CriminalProceduralKey, string> = {
    investigation: 'مرحلة التحقيق',
    juvenile_investigation: 'تحقيق - أحداث',
    juvenile_trial: 'محكمة - أحداث',
    misdemeanor: 'محكمة الجنح',
    felony: 'محكمة الجنايات',
    cassation: 'محكمة التمييز / الاستئناف بصفتها التمييزية',
};

const JUVENILE_MERGED_STAGE_LABELS: Record<CriminalProceduralKey, string> = {
    ...BASE_PROCEDURAL_STAGE_LABELS,
};

/** مرحلة تحقيق (عامة أو أحداث) — للتحقق من حقول الموقع والتسميات. */
export function isInvestigationStoredStage(stage: string): boolean {
    return stage === 'مرحلة التحقيق' || stage === 'تحقيق الأحداث';
}

export function isJuvenileExclusiveStoredStage(stage: string): boolean {
    return JUVENILE_EXCLUSIVE_STAGE_VALUES.has(String(stage ?? '').trim());
}

/** مراحل نموذج الإضبارة الجديدة — حسب تركيب المتهمين (بالغ/حدث). */
export function resolveNewCaseStageSelectOptions(
    partyMix: 'adults_only' | 'juveniles_only' | 'mixed',
): ReadonlyArray<{ value: CriminalCaseStage; label: string }> {
    if (partyMix === 'juveniles_only') {
        return JUVENILE_EXCLUSIVE_FORM_STAGE_OPTIONS;
    }
    return CRIMINAL_PROCEDURAL_STAGES.filter(
        (opt) => opt.key !== 'juvenile_investigation' && opt.key !== 'juvenile_trial',
    ).map((opt) => ({
        value: opt.value,
        label: BASE_PROCEDURAL_STAGE_LABELS[opt.key],
    }));
}

export function isStageAllowedForNewCasePartyMix(
    stage: string,
    partyMix: 'adults_only' | 'juveniles_only' | 'mixed',
): boolean {
    const raw = String(stage ?? '').trim();
    if (!raw) return true;
    if (partyMix === 'juveniles_only') return JUVENILE_EXCLUSIVE_STAGE_VALUES.has(raw);
    return ADULT_FORM_STAGE_VALUES.has(raw);
}

/** تسمية مرحلة للعرض فقط — لا تغيّر قيمة الـ enum المخزنة. */
export function formatProceduralStageLabel(key: CriminalProceduralKey, isJuvenile = false): string {
    return isJuvenile ? JUVENILE_MERGED_STAGE_LABELS[key] : BASE_PROCEDURAL_STAGE_LABELS[key];
}

/** تسمية مرحلة من قيمة المخزن (مثل «محكمة الجنح»). */
export function formatCriminalStageLabel(stage: string, isJuvenile = false): string {
    const key = stageToProceduralKey(stage);
    if (!key) return String(stage ?? '').trim() || '—';
    return formatProceduralStageLabel(key, isJuvenile);
}

export function formatCriminalStageOptionLabel(
    opt: (typeof CRIMINAL_PROCEDURAL_STAGES)[number],
    isJuvenile = false,
): string {
    return formatProceduralStageLabel(opt.key, isJuvenile);
}

export function isValidCriminalStage(v: string): v is CriminalCaseStage {
    return (
        v === 'مرحلة التحقيق' ||
        v === 'تحقيق الأحداث' ||
        v === 'محكمة الأحداث' ||
        v === 'محكمة الجنح' ||
        v === 'محكمة الجنايات' ||
        v === 'cassation_court'
    );
}

/** توحيد قيمة المرحلة المخزنة — دون تحويل مسار الأحداث إلى مسار بالغ. */
export function normalizeLegacyCriminalStage(stage: string, _crimeType?: CrimeType | ''): CriminalCaseStage | '' {
    const raw = String(stage ?? '').trim();
    if (!raw) return '';
    return isValidCriminalStage(raw) ? raw : '';
}

/** تحويل اسم محكمة قديم (عرض/إحالة) إلى مرحلة بالغ — للمحركات التي لا تستخدم «محكمة الأحداث» كمرحلة. */
export function mapLegacyJuvenileCourtNameToAdultStage(
    courtName: string,
    crimeType?: CrimeType | '',
): CriminalCaseStage {
    const raw = String(courtName ?? '').trim();
    if (raw !== 'محكمة الأحداث') return 'محكمة الجنح';
    return crimeType === 'جناية' ? 'محكمة الجنايات' : 'محكمة الجنح';
}

export function stageToProceduralKey(stage: string): CriminalProceduralKey | null {
    if (stage === 'مرحلة التحقيق') return 'investigation';
    if (stage === 'تحقيق الأحداث') return 'juvenile_investigation';
    if (stage === 'محكمة الأحداث') return 'juvenile_trial';
    if (stage === 'محكمة الجنح') return 'misdemeanor';
    if (stage === 'محكمة الجنايات') return 'felony';
    if (stage === 'cassation_court') return 'cassation';
    return null;
}

export function hasJuvenileParty(
    defendants: Pick<CriminalDefendant, 'isJuvenile'>[],
    complainants: Pick<CriminalComplainant, 'isJuvenile'>[],
): boolean {
    return defendants.some((d) => d.isJuvenile === true) || complainants.some((c) => c.isJuvenile === true);
}

export function hasJuvenileComplainant(
    complainants: Pick<CriminalComplainant, 'isJuvenile' | 'isUnderSeven'>[],
): boolean {
    return complainants.some((c) => c.isJuvenile === true || c.isUnderSeven === true);
}

export function hasJuvenileAccused(defendants: Pick<CriminalDefendant, 'isJuvenile'>[]): boolean {
    return defendants.some((d) => d.isJuvenile === true);
}

/** كل المتهمين في النطاق (أو الإضبارة) أحداث — للتسميات فقط. */
export function isJuvenileOnlyDefendantScope(
    defendants: Pick<CriminalDefendant, 'id' | 'isJuvenile'>[],
    scopedDefendantIds?: string[],
): boolean {
    const ids = (scopedDefendantIds ?? []).map((x) => String(x ?? '').trim()).filter(Boolean);
    const pool = ids.length ? defendants.filter((d) => ids.includes(d.id)) : defendants;
    return pool.length > 0 && pool.every((d) => d.isJuvenile === true);
}

/** هل تُعرَض عقدة المسار بمحكمة الأحداث بدل الجنح/الجنايات؟ */
export function shouldUseJuvenileTrialJourneyLabels(
    defendants: Pick<CriminalDefendant, 'id' | 'isJuvenile'>[],
    context?: { defendantIds?: string[]; storedStage?: string },
): boolean {
    const stored = String(context?.storedStage ?? '').trim();
    if (stored === 'محكمة الأحداث') return true;
    return isJuvenileOnlyDefendantScope(defendants, context?.defendantIds);
}

export type CourtDisplayContext = {
    hasJuvenileDefendant?: boolean;
    storedCourtName?: string;
};

export type InvestigationDepositLocationFields = {
    investigationPapersAt?: string;
    policeStationName?: string;
    investigationOfficeName?: string;
    investigationCourtName?: string;
};

/** مكان إيداع أوراق التحقيق: [نوع الجهة + اسم الجهة] — مثال: مركز شرطة الجمهوري */
export function formatInvestigationDepositLocation(loc: InvestigationDepositLocationFields): string {
    const papersAt = String(loc.investigationPapersAt ?? '').trim();
    const name =
        papersAt === 'مركز شرطة'
            ? String(loc.policeStationName ?? '').trim()
            : papersAt === 'مكتب تحقيق قضائي'
              ? String(loc.investigationOfficeName ?? '').trim()
              : String(loc.investigationCourtName ?? '').trim();
    if (papersAt && name) {
        if (name.startsWith(papersAt) || name.includes(papersAt)) return name;
        return `${papersAt} ${name}`;
    }
    return name || papersAt || '';
}

export type TrialCourtHeaderFields = {
    courtName?: string;
    courtCaseNumber?: string;
    caseNumber?: string;
};

/** ترويسة محكمة الموضوع — صنف المحكمة + الاسم الفعلي (رقم الدعوى في سطر منفصل). */
export function formatTrialCourtHeaderPrimary(
    caseStage: 'misdemeanor' | 'felony',
    loc: TrialCourtHeaderFields,
): string {
    const courtName = String(loc.courtName ?? '').trim();
    const stageLabel = caseStage === 'felony' ? 'محكمة الجنايات' : 'محكمة الجنح';
    if (!courtName) return stageLabel;
    const nameAlreadyIncludesStage =
        caseStage === 'felony'
            ? /جنايات|جناية/.test(courtName)
            : /جنح|جنحة/.test(courtName);
    if (nameAlreadyIncludesStage) return courtName;
    return `${stageLabel} — ${courtName}`;
}

/** اسم المحكمة/المسار المعروض في الترويسة — عرض فقط؛ القيمة المخزنة للمرحلة لا تتغير. */
export function resolveCourtDisplayName(stage: string, ctx: CourtDisplayContext = {}): string {
    const stored = String(ctx.storedCourtName ?? '').trim();
    if (stored) return stored;

    const key = stageToProceduralKey(stage);
    if (key) {
        if (ctx.hasJuvenileDefendant) {
            return formatProceduralStageLabel(key, true);
        }
        return BASE_PROCEDURAL_STAGE_LABELS[key];
    }

    return String(stage ?? '').trim() || '—';
}

export function resolveStageListLabel(stage: string, hasJuvenileDefendant: boolean): string {
    return formatCriminalStageLabel(stage, hasJuvenileDefendant);
}

export function isJuvenileTrialStage(stage: string, defendants: Pick<CriminalDefendant, 'isJuvenile'>[]): boolean {
    return (stage === 'محكمة الجنح' || stage === 'محكمة الجنايات') && hasJuvenileAccused(defendants);
}

export function isReferralTrialStage(v: string): v is 'محكمة الجنح' | 'محكمة الجنايات' {
    return v === 'محكمة الجنح' || v === 'محكمة الجنايات';
}

/** صفة المكتب في الترويسة — اختيار المحامي عند الإنشاء. */
export function representationRoleBadge(rep: OurRepresentation | ''): string {
    const opt = OFFICE_REPRESENTATION_OPTIONS.find((o) => o.value === rep);
    return opt ? `[${opt.label}]` : '';
}

export function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

/** مكان إيداع/توقيف الحدث — قيم تخزينية (لا تغيّر enums المرحلة). */
export type JuvenileDetentionPlacement = 'juvenile_observation' | 'rehabilitation_school';

export type SocialInquiryWorkflowStatus = 'not_requested' | 'under_preparation' | 'submitted';

export const JUVENILE_DETENTION_PLACEMENT_OPTIONS: ReadonlyArray<{
    value: JuvenileDetentionPlacement;
    label: string;
}> = [
    {
        value: 'juvenile_observation',
        label: 'دار ملاحظة الأحداث (قيد التحقيق/المحاكمة)',
    },
    {
        value: 'rehabilitation_school',
        label: 'مدرسة تأهيل الأحداث (محكوم)',
    },
] as const;

export function juvenileDetentionPlacementLabel(code: JuvenileDetentionPlacement | ''): string {
    const hit = JUVENILE_DETENTION_PLACEMENT_OPTIONS.find((o) => o.value === code);
    return hit?.label ?? '';
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

export function isValidJuvenileDetentionPlacement(v: string): v is JuvenileDetentionPlacement {
    return v === 'juvenile_observation' || v === 'rehabilitation_school';
}

export function isValidSocialInquiryWorkflowStatus(v: string): v is SocialInquiryWorkflowStatus {
    return v === 'not_requested' || v === 'under_preparation' || v === 'submitted';
}

export function socialInquiryWorkflowLabel(status: SocialInquiryWorkflowStatus | ''): string {
    if (status === 'not_requested') return 'لم يُطلب بعد';
    if (status === 'under_preparation') return 'قيد الإعداد';
    if (status === 'submitted') return 'مُستلم ومُودع';
    return '—';
}

export const JUVENILE_REMEDIAL_DECISION_OPTIONS: ReadonlyArray<{
    value:
        | 'juvenile_deliver_guardian'
        | 'juvenile_behavioral_surveillance'
        | 'juvenile_reform_boys';
    label: string;
}> = [
    { value: 'juvenile_deliver_guardian', label: 'التسليم للولي أو ضامن بموجب تعهد' },
    { value: 'juvenile_behavioral_surveillance', label: 'مراقبة السلوك' },
    { value: 'juvenile_reform_boys', label: 'الإيداع في مدرسة تأهيل الأحداث' },
] as const;

export const CONFIDENTIAL_SESSION_BADGE = '[🔒 جلسة سرية بحكم القانون]';

/** تسميات عرض حالة المتهم/الحدث — القيم المخزنة تبقى كما هي. */
export const DEFENDANT_STATUS_UI_LABELS: Record<DefendantStatus, string> = {
    حر: 'حر',
    مستقدم: 'مستقدم',
    هارب: 'هارب',
    'ملقى القبض عليه': 'ملقى القبض عليه',
    موقوف: 'موقوف',
    مكفل: 'مكفل',
    bailed_pending_appeal: 'كفالة معلقة (بانتظار الادعاء العام)',
    psychiatric_eval: 'مُودع للفحص العقلي',
    provisional_delivery: 'مسلّم لوليه / لضامنه',
    behavioral_surveillance: 'تحت مراقبة السلوك',
    juvenile_detention: 'موقوف (دار الملاحظة)',
    متوفى: 'متوفى',
    'مشمول بالعفو': 'مشمول بالعفو',
};

const JUVENILE_ONLY_DEFENDANT_STATUSES: readonly DefendantStatus[] = [
    'provisional_delivery',
    'behavioral_surveillance',
    'juvenile_detention',
];

const ADULT_ONLY_DEFENDANT_STATUSES: readonly DefendantStatus[] = ['حر', 'مستقدم', 'ملقى القبض عليه', 'موقوف'];

/** الحالات الأساسية الخمس — نص عرض/قيمة واحدة وفق أصول المحاكمات الجزائية. */
export const CORE_DEFENDANT_STATUSES = ['حر', 'مستقدم', 'هارب', 'موقوف', 'مكفل'] as const;
export type CoreDefendantStatus = (typeof CORE_DEFENDANT_STATUSES)[number];

export type DefendantStatusCaseType = 'misdemeanor' | 'felony';
export type DefendantStatusProceduralStage = 'investigation' | 'trial';
export type DefendantStatusSelectOption = { value: DefendantStatus; label: string };

/** خيارات حالة الحدث في التحقيق — قيم التخزين + تسمية قانونية للعرض. */
export const JUVENILE_DEFENDANT_STATUS_SELECT_OPTIONS: readonly DefendantStatusSelectOption[] = [
    { value: 'حر', label: 'حر' },
    { value: 'مستقدم', label: 'مستقدم' },
    { value: 'هارب', label: 'هارب' },
    { value: 'juvenile_detention', label: 'موقوف (دار الملاحظة)' },
    { value: 'provisional_delivery', label: 'مسلّم لوليه / لضامنه' },
] as const;

/** حالات الحدث القابلة للتحويل من حالة البالغ — لا «مكفل» (الحدث لا يُكفَّل). */
const JUVENILE_STATUS_LIST: readonly CoreDefendantStatus[] = ['حر', 'مستقدم', 'هارب', 'موقوف'];
const MISDEMEANOR_INVESTIGATION_ADULT: readonly CoreDefendantStatus[] = ['حر', 'مستقدم', 'هارب', 'موقوف', 'مكفل'];
const TRIAL_OR_FELONY_ADULT: readonly CoreDefendantStatus[] = ['موقوف', 'مكفل', 'هارب'];

export function formatDefendantStatusLabel(status: DefendantStatus | '' | string): string {
    const key = String(status ?? '').trim();
    if (!key) return '—';
    return DEFENDANT_STATUS_UI_LABELS[key as DefendantStatus] ?? key;
}

export function isJuvenileOnlyDefendantStatus(status: string): boolean {
    return (JUVENILE_ONLY_DEFENDANT_STATUSES as readonly string[]).includes(String(status ?? '').trim());
}

export function isAdultOnlyDefendantStatus(status: string): boolean {
    return (ADULT_ONLY_DEFENDANT_STATUSES as readonly string[]).includes(String(status ?? '').trim());
}

/** نوع الجريمة لفرز حالة المتهم (جنحة / جناية). */
export function resolveDefendantStatusCaseType(params: {
    crimeType?: CrimeType | '';
    stage?: string;
}): DefendantStatusCaseType {
    const stage = String(params.stage ?? '').trim();
    if (stage === 'محكمة الجنايات') return 'felony';
    const ct = String(params.crimeType ?? '').trim();
    if (ct === 'جناية') return 'felony';
    return 'misdemeanor';
}

/** المرحلة الإجرائية: تحقيق أو محاكمة. */
export function resolveDefendantStatusProceduralStage(stage: string): DefendantStatusProceduralStage {
    const s = String(stage ?? '').trim();
    if (!s || isInvestigationStoredStage(s)) return 'investigation';
    return 'trial';
}

/** فرز ديناميكي حاسم: caseType + proceduralStage + isJuvenile — نصوص كلمة واحدة. */
export function filterDefendantStatusOptions(params: {
    caseType: DefendantStatusCaseType;
    proceduralStage: DefendantStatusProceduralStage;
    isJuvenile: boolean;
}): CoreDefendantStatus[] {
    const { caseType, proceduralStage, isJuvenile } = params;

    if (isJuvenile) {
        return [];
    }

    if (caseType === 'felony') {
        return [...TRIAL_OR_FELONY_ADULT];
    }

    if (caseType === 'misdemeanor' && proceduralStage === 'investigation') {
        return [...MISDEMEANOR_INVESTIGATION_ADULT];
    }

    return [...TRIAL_OR_FELONY_ADULT];
}

/** تحويل قيم قديمة/موسّعة إلى إحدى الحالات الخمس الأساسية للعرض والاختيار. */
export function coerceDefendantStatusToCore(status: DefendantStatus | '' | string): CoreDefendantStatus | '' {
    const s = String(status ?? '').trim();
    if (!s) return '';
    if ((CORE_DEFENDANT_STATUSES as readonly string[]).includes(s)) return s as CoreDefendantStatus;
    if (s === 'juvenile_detention' || s === 'ملقى القبض عليه') return 'موقوف';
    if (s === 'provisional_delivery' || s === 'behavioral_surveillance' || s === 'bailed_pending_appeal') return 'مكفل';
    return '';
}

/** تسمية عرض مختصرة للحالة — مع تسميات قانونية خاصة بالحدث. */
export function formatDefendantStatusShortLabel(status: DefendantStatus | '' | string): string {
    const key = String(status ?? '').trim();
    if (!key) return '—';
    if (key === 'juvenile_detention') return 'موقوف (دار الملاحظة)';
    if (key === 'provisional_delivery') return 'مسلّم لوليه / لضامنه';
    const core = coerceDefendantStatusToCore(status);
    if (core) return core;
    return formatDefendantStatusLabel(key);
}

export function getJuvenileDefendantStatusSelectOptions(
    currentStatus?: DefendantStatus | '',
): DefendantStatusSelectOption[] {
    const options: DefendantStatusSelectOption[] = JUVENILE_DEFENDANT_STATUS_SELECT_OPTIONS.map((o) => ({
        ...o,
    }));
    let cur = String(currentStatus ?? '').trim() as DefendantStatus;
    if (cur === 'موقوف' || cur === 'ملقى القبض عليه') cur = 'juvenile_detention';
    if (!cur) return options;
    if (options.some((o) => o.value === cur)) return options;
    const label = formatDefendantStatusShortLabel(cur);
    return [{ value: cur, label }, ...options];
}

/** خيارات القائمة المنسدلة — تصفية ثلاثية + تسمية كلمة واحدة. */
export function getDefendantStatusSelectOptions(params: {
    isJuvenile: boolean;
    crimeType?: CrimeType | '';
    stage?: string;
    caseType?: DefendantStatusCaseType;
    proceduralStage?: DefendantStatusProceduralStage;
    currentStatus?: DefendantStatus | '';
}): ReadonlyArray<DefendantStatusSelectOption> {
    if (params.isJuvenile) {
        return getJuvenileDefendantStatusSelectOptions(params.currentStatus);
    }

    const caseType =
        params.caseType ?? resolveDefendantStatusCaseType({ crimeType: params.crimeType, stage: params.stage });
    const proceduralStage =
        params.proceduralStage ?? resolveDefendantStatusProceduralStage(String(params.stage ?? ''));

    const values = filterDefendantStatusOptions({
        caseType,
        proceduralStage,
        isJuvenile: params.isJuvenile,
    });

    const options: DefendantStatusSelectOption[] = values.map((value) => ({
        value: value as DefendantStatus,
        label: value,
    }));

    const curRaw = String(params.currentStatus ?? '').trim() as DefendantStatus;
    const cur = coerceDefendantStatusToCore(curRaw) || curRaw;
    if (cur && !(values as readonly string[]).includes(cur)) {
        const label = coerceDefendantStatusToCore(curRaw) || formatDefendantStatusShortLabel(curRaw);
        return [{ value: cur as DefendantStatus, label }, ...options];
    }

    return options;
}

/** ألوان شارة/زر حالة المتهم — انطباع بصري فوري. */
export function getDefendantStatusButtonClass(status: DefendantStatus | '' | string): string {
    const s = String(status ?? '').trim();
    if (!s) return 'border-slate-600/60 bg-slate-800 text-white/50';
    if (s === 'حر') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200';
    if (s === 'مكفل' || s === 'provisional_delivery' || s === 'bailed_pending_appeal')
        return 'border-amber-500/40 bg-amber-500/15 text-amber-200';
    if (s === 'موقوف' || s === 'ملقى القبض عليه' || s === 'juvenile_detention' || s === 'psychiatric_eval')
        return 'border-red-500/40 bg-red-500/15 text-red-200';
    if (s === 'هارب' || s === 'مستقدم') return 'border-slate-500/40 bg-slate-600/35 text-slate-300';
    if (s === 'behavioral_surveillance') return 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200';
    if (s === 'متوفى' || s === 'مشمول بالعفو') return 'border-slate-500/40 bg-slate-700/40 text-slate-400';
    return 'border-slate-600/60 bg-slate-800 text-white/80';
}

/** إعادة ضبط الحالة عند تبديل توغل الحدث لتفادي بقاء قيمة غير متوافقة. */
export function normalizeDefendantStatusForJuvenileToggle(
    status: DefendantStatus | '',
    nextIsJuvenile: boolean,
): DefendantStatus | '' {
    const core = coerceDefendantStatusToCore(status);
    const s = String(status ?? '').trim() as DefendantStatus | '';
    if (!s) return '';
    if (nextIsJuvenile) {
        if (
            (JUVENILE_DEFENDANT_STATUS_SELECT_OPTIONS as readonly { value: string }[]).some(
                (o) => o.value === s,
            )
        ) {
            return s;
        }
        if (core && (JUVENILE_STATUS_LIST as readonly string[]).includes(core)) {
            if (core === 'موقوف') return 'juvenile_detention';
            return core as DefendantStatus;
        }
        return '';
    }
    if (!nextIsJuvenile && isJuvenileOnlyDefendantStatus(s)) return 'حر';
    return core ? (core as DefendantStatus) : s;
}
