/**
 * محرك احتساب مواعيد انتهاء القرارات/الطعون بأيام قانونية
 * مع تخطي الجمعة والسبت (عطلة نهاية الأسبوع في العراق).
 *
 * ملاحظة: لا يوجد src/features/ في المشروع — الموقع الرسمي تحت خدمات التقويم.
 */
import { LEGAL_DEADLINES } from '@/app/constants/legal';
import { formatDateToLocalYmd, getLocalTodayYmd } from '@/app/utils/executionStateMachine';

/** أنواع الطعن/المهلة المعتمدة في الثوابت القانونية + مسارات شائعة */
export type LegalDecisionType =
    | 'APPEAL'
    | 'APPEAL_PRESENCE'
    | 'CASSATION'
    | 'OBJECTION'
    | 'RETRIAL'
    | 'ATTACHMENT_OBJECTION'
    | 'VOLUNTARY_EXECUTION'
    | 'EXPERT_REPORT_OBJECTION'
    | 'RESPONSE_BRIEF'
    | 'INTERLOCUTORY_216'
    | 'EXECUTION_GRIEVANCE'
    | 'EXECUTION_CASSATION';

const DECISION_DURATION_DAYS: Record<LegalDecisionType, number> = {
    APPEAL: LEGAL_DEADLINES.APPEAL_DEADLINE,
    APPEAL_PRESENCE: LEGAL_DEADLINES.APPEAL_PRESENCE,
    CASSATION: LEGAL_DEADLINES.CASSATION_DEADLINE,
    OBJECTION: LEGAL_DEADLINES.OBJECTION_DEADLINE,
    RETRIAL: LEGAL_DEADLINES.RETRIAL_DEADLINE,
    ATTACHMENT_OBJECTION: LEGAL_DEADLINES.ATTACHMENT_OBJECTION,
    VOLUNTARY_EXECUTION: LEGAL_DEADLINES.VOLUNTARY_EXECUTION,
    EXPERT_REPORT_OBJECTION: LEGAL_DEADLINES.EXPERT_REPORT_OBJECTION,
    RESPONSE_BRIEF: LEGAL_DEADLINES.RESPONSE_BRIEF,
    INTERLOCUTORY_216: 7,
    EXECUTION_GRIEVANCE: 3,
    EXECUTION_CASSATION: 7,
};

const DECISION_TYPE_LABELS_AR: Record<LegalDecisionType, string> = {
    APPEAL: 'استئناف',
    APPEAL_PRESENCE: 'استئناف حضوري',
    CASSATION: 'تمييز',
    OBJECTION: 'اعتراض على حكم غيابي',
    RETRIAL: 'إعادة محاكمة',
    ATTACHMENT_OBJECTION: 'طعن بقرار حجز احتياطي',
    VOLUNTARY_EXECUTION: 'تنفيذ رضائي',
    EXPERT_REPORT_OBJECTION: 'طعن في تقرير خبرة',
    RESPONSE_BRIEF: 'لائحة جوابية',
    INTERLOCUTORY_216: 'تمييز قرار إعدادي / مستعجل (م 216)',
    EXECUTION_GRIEVANCE: 'تظلم تنفيذي',
    EXECUTION_CASSATION: 'تمييز تنفيذي',
};

export type LegalDeadlineCalculation = {
    startDateYmd: string;
    decisionType: LegalDecisionType;
    decisionTypeLabel: string;
    durationLegalDays: number;
    /** أول يوم يُحتسب ضمن المدة (اليوم التالي لتاريخ القرار/التبليغ) */
    periodStartYmd: string;
    expirationYmd: string;
    remainingLegalWorkingDays: number;
};

/** جمعة = 5، سبت = 6 — لا تُحسب ضمن الأيام القانونية */
export function isIraqiLegalWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 5 || day === 6;
}

function parseYmdToLocalDate(ymd: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    const dt = new Date(y, mo - 1, d);
    if (Number.isNaN(dt.getTime())) return null;
    dt.setHours(0, 0, 0, 0);
    return dt;
}

function toYmd(date: Date): string {
    return formatDateToLocalYmd(date) || '';
}

function cloneDay(date: Date): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setHours(0, 0, 0, 0);
    return d;
}

function addCalendarDays(date: Date, days: number): Date {
    const d = cloneDay(date);
    d.setDate(d.getDate() + days);
    return d;
}

export function resolveLegalDurationDays(decisionType: LegalDecisionType): number {
    return DECISION_DURATION_DAYS[decisionType];
}

export function resolveLegalDecisionTypeLabel(decisionType: LegalDecisionType): string {
    return DECISION_TYPE_LABELS_AR[decisionType];
}

/**
 * يضيف `legalDays` يوماً قانونياً بتخطّي الجمعة والسبت.
 * يبدأ العد من اليوم التالي لـ startDate (اليوم التالي للقرار/التبليغ).
 */
export function addLegalWorkingDaysFromStart(startDate: Date | string, legalDays: number): Date {
    const start =
        typeof startDate === 'string' ? parseYmdToLocalDate(startDate) : cloneDay(startDate);
    if (!start || !Number.isFinite(legalDays) || legalDays <= 0) {
        return start ? cloneDay(start) : new Date(NaN);
    }

    let cursor = addCalendarDays(start, 1);
    let counted = 0;
    // حماية من حلقات لا نهائية
    const hardCap = legalDays * 4 + 14;
    let steps = 0;
    while (counted < legalDays && steps < hardCap) {
        steps += 1;
        if (!isIraqiLegalWeekend(cursor)) {
            counted += 1;
            if (counted >= legalDays) break;
        }
        cursor = addCalendarDays(cursor, 1);
    }
    return cursor;
}

/** عدد الأيام القانونية (بدون جمعة/سبت) من fromInclusive إلى toInclusive */
export function countLegalWorkingDaysInclusive(fromYmd: string, toYmd: string): number {
    const from = parseYmdToLocalDate(fromYmd);
    const to = parseYmdToLocalDate(toYmd);
    if (!from || !to || to.getTime() < from.getTime()) return 0;
    let count = 0;
    let cursor = cloneDay(from);
    while (cursor.getTime() <= to.getTime()) {
        if (!isIraqiLegalWeekend(cursor)) count += 1;
        cursor = addCalendarDays(cursor, 1);
    }
    return count;
}

export function remainingLegalWorkingDaysUntil(
    expirationYmd: string,
    asOf: Date | string = getLocalTodayYmd(),
): number {
    const asOfYmd = typeof asOf === 'string' ? asOf : toYmd(asOf);
    const exp = parseYmdToLocalDate(expirationYmd);
    const today = parseYmdToLocalDate(asOfYmd);
    if (!exp || !today) return 0;
    if (exp.getTime() < today.getTime()) return 0;
    return countLegalWorkingDaysInclusive(asOfYmd, expirationYmd);
}

export function calculateLegalExpirationDate(input: {
    startDate: string | Date;
    decisionType: LegalDecisionType;
    asOf?: Date | string;
}): LegalDeadlineCalculation {
    const startDateYmd =
        typeof input.startDate === 'string'
            ? String(input.startDate).trim().slice(0, 10)
            : toYmd(input.startDate);
    const durationLegalDays = resolveLegalDurationDays(input.decisionType);
    const start = parseYmdToLocalDate(startDateYmd);
    if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(startDateYmd)) {
        return {
            startDateYmd,
            decisionType: input.decisionType,
            decisionTypeLabel: resolveLegalDecisionTypeLabel(input.decisionType),
            durationLegalDays,
            periodStartYmd: startDateYmd,
            expirationYmd: startDateYmd,
            remainingLegalWorkingDays: 0,
        };
    }

    const periodStart = addCalendarDays(start, 1);
    const expiration = addLegalWorkingDaysFromStart(start, durationLegalDays);
    const expirationYmd = toYmd(expiration);
    const periodStartYmd = toYmd(periodStart);

    return {
        startDateYmd,
        decisionType: input.decisionType,
        decisionTypeLabel: resolveLegalDecisionTypeLabel(input.decisionType),
        durationLegalDays,
        periodStartYmd,
        expirationYmd,
        remainingLegalWorkingDays: remainingLegalWorkingDaysUntil(
            expirationYmd,
            input.asOf ?? getLocalTodayYmd(),
        ),
    };
}

/** بيانات عرض بطاقة التقويم: مصدر القرار + المتبقي من أيام العمل القانونية */
export function describeLegalDeadlineForCalendarCard(input: {
    expirationYmd: string;
    decisionSource?: string | null;
    decisionTypeLabel?: string | null;
    asOf?: Date | string;
}): {
    expirationYmd: string;
    decisionSource: string;
    remainingLegalWorkingDays: number;
    summaryAr: string;
} {
    const remaining = remainingLegalWorkingDaysUntil(input.expirationYmd, input.asOf);
    const decisionSource =
        (input.decisionSource && String(input.decisionSource).trim()) ||
        (input.decisionTypeLabel && String(input.decisionTypeLabel).trim()) ||
        'مهلة قانونية';
    const summaryAr =
        remaining <= 0
            ? `${decisionSource} — انتهت المهلة (${input.expirationYmd})`
            : `${decisionSource} — متبقٍ ${remaining} يوم عمل قانوني · ينتهي ${input.expirationYmd}`;
    return {
        expirationYmd: input.expirationYmd,
        decisionSource,
        remainingLegalWorkingDays: remaining,
        summaryAr,
    };
}

export function isLegalDecisionType(value: string): value is LegalDecisionType {
    return Object.prototype.hasOwnProperty.call(DECISION_DURATION_DAYS, value);
}
