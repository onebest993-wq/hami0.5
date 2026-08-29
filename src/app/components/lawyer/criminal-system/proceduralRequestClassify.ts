import type { JudicialDecision } from '@/app/types/criminal';
import {
    ARREST_ORDER_TEMPLATE,
    ARREST_SUMMON_TEMPLATE,
    ASSET_SEIZURE_TEMPLATE,
    BAIL_RELEASE_TEMPLATE,
    COMPLAINT_COURT_REFERRAL_TEMPLATE,
    CUSTOM_JUDICIAL_DECISION_TYPE,
    CUSTOM_LAWYER_MOTION_TYPE,
    DEFENDANT_BAIL_TEMPLATE,
    DETENTION_DECISION_TEMPLATE,
    INVESTIGATION_PURGE_JUDICIAL_TEMPLATES,
    INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE,
    JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
    JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE,
    JUVENILE_SOCIAL_INQUIRY_REFERRAL_TEMPLATE,
    SUMMON_ORDER_TEMPLATE,
    ORDER_ENFORCEMENT_TEMPLATES,
    isJuvenileJudgeCassationAppealableTemplate,
    isJuvenileJudgeDecisionTemplate,
    normalizeProceduralRequestTemplate,
    UNKNOWN_PERPETRATOR_ALLOWED_JUDICIAL_TEMPLATES,
} from './proceduralRequestTemplateCore';


export const JUDICIAL_DECISION_FIXED_TEMPLATES = [
    SUMMON_ORDER_TEMPLATE,
    ARREST_ORDER_TEMPLATE,
    DETENTION_DECISION_TEMPLATE,
    DEFENDANT_BAIL_TEMPLATE,
] as const;

export const JUDICIAL_DECISION_TEMPLATES = [
    ...JUDICIAL_DECISION_FIXED_TEMPLATES,
    ASSET_SEIZURE_TEMPLATE,
    CUSTOM_JUDICIAL_DECISION_TYPE,
] as const;

/**
 * خيارات قرارات القاضي في مودال الطلب.
 * - التحقيق: كل القوالب.
 * - المحاكمة: يدوي فقط.
 * - `حجز الأموال`: يُحقن ديناميكياً فقط عند وجود متهم هارب (تمرّر `includeAssetSeizure: true`).
 */
export function judicialDecisionModalTemplates(
    trialCourtManualOnly: boolean,
    options?: {
        includeAssetSeizure?: boolean;
        isInvestigationPhase?: boolean;
        /** إدراج «إحالة إلى مكتب البحث الاجتماعي» عند وجود متهم حدث. */
        hasJuvenileDefendant?: boolean;
        /** يقيّد القوالب فقط حين كل المتهمين مجهولين — لا عند وجود معلوم + مجهول. */
        isAllDefendantsUnknown?: boolean;
    },
): readonly string[] {
    if (trialCourtManualOnly) {
        return options?.includeAssetSeizure
            ? [ASSET_SEIZURE_TEMPLATE, CUSTOM_JUDICIAL_DECISION_TYPE]
            : [CUSTOM_JUDICIAL_DECISION_TYPE];
    }
    let investigationPurge = options?.isInvestigationPhase
        ? [...INVESTIGATION_PURGE_JUDICIAL_TEMPLATES]
        : [];
    const base = options?.includeAssetSeizure
        ? [...JUDICIAL_DECISION_TEMPLATES]
        : JUDICIAL_DECISION_TEMPLATES.filter((t) => t !== ASSET_SEIZURE_TEMPLATE);
    let merged: readonly string[];
    if (!investigationPurge.length) {
        merged = base;
    } else {
        const seen = new Set<string>();
        const next: string[] = [];
        for (const t of [...investigationPurge, ...base]) {
            if (seen.has(t)) continue;
            seen.add(t);
            next.push(t);
        }
        merged = next;
    }
    merged = merged.filter((t) => t !== INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE);
    if (options?.isAllDefendantsUnknown) {
        const allowed = new Set<string>(UNKNOWN_PERPETRATOR_ALLOWED_JUDICIAL_TEMPLATES);
        return merged.filter((t) => allowed.has(t));
    }
    if (options?.hasJuvenileDefendant) {
        return merged.filter((t) => !isJuvenileJudgeDecisionTemplate(t));
    }
    return merged;
}

/** طلبات محامٍ — مسار pending / approved / rejected.
 *  ملاحظة: BAIL_RELEASE_TEMPLATE احتُفظ به للتعرف على البيانات القديمة فقط؛
 *  المسار الجديد للتكفيل هو قرار قضائي مباشر عبر DEFENDANT_BAIL_TEMPLATE. */
export const LAWYER_MOTION_TEMPLATES = [BAIL_RELEASE_TEMPLATE, CUSTOM_LAWYER_MOTION_TYPE] as const;

/** خيارات حاوية طلبات المحامي في المودال (التحقيق). */
export const LAWYER_MOTION_DROPDOWN_TEMPLATES = [CUSTOM_LAWYER_MOTION_TYPE] as const;

/** خيارات طلبات المحامي في المودال — المحاكمة: يدوي فقط. */
export function lawyerMotionModalTemplates(
    trialCourtManualOnly: boolean,
    options?: { isAllDefendantsUnknown?: boolean },
): readonly string[] {
    if (options?.isAllDefendantsUnknown) return [CUSTOM_LAWYER_MOTION_TYPE];
    return trialCourtManualOnly ? [CUSTOM_LAWYER_MOTION_TYPE] : LAWYER_MOTION_DROPDOWN_TEMPLATES;
}

/** كل خيارات المودال (مجموعتان). */
export const PROCEDURAL_REQUEST_TYPE_OPTIONS = [
    ...JUDICIAL_DECISION_TEMPLATES,
    ...LAWYER_MOTION_TEMPLATES,
] as const;

export type ProceduralRequestTypeOption = (typeof PROCEDURAL_REQUEST_TYPE_OPTIONS)[number];

const JUDICIAL_DECISION_TEMPLATE_SET = new Set<string>([
    ...JUDICIAL_DECISION_TEMPLATES,
    ...INVESTIGATION_PURGE_JUDICIAL_TEMPLATES,
    ARREST_SUMMON_TEMPLATE,
    COMPLAINT_COURT_REFERRAL_TEMPLATE,
    JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
    JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE,
    JUVENILE_SOCIAL_INQUIRY_REFERRAL_TEMPLATE,
]);
const ORDER_ENFORCEMENT_TEMPLATE_SET = new Set<string>(ORDER_ENFORCEMENT_TEMPLATES);
const LAWYER_MOTION_TEMPLATE_SET = new Set<string>(LAWYER_MOTION_TEMPLATES);

export function isJudicialDecisionTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return JUDICIAL_DECISION_TEMPLATE_SET.has(key) || isJuvenileJudgeDecisionTemplate(key);
}

export function isLawyerMotionTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return LAWYER_MOTION_TEMPLATE_SET.has(key) || isCustomLawyerMotionTemplate(key);
}

/**
 * القرارات التحضيرية القابلة للتمييز — قائمة بيضاء صارمة لمنطق القانون العراقي:
 *   1) `قرار توقيف المتهم` — يَطعن المتهم/وكيله حصراً.
 *   2) `حجز الأموال` (المتهم الهارب — م 121 أصول جزائية) — يَطعن المتهم/وكيله حصراً.
 *   3) `تكفيل المتهم` — قد يَطعن أيٌّ من الطرفين (المشتكي/الادعاء العام أو المتهم/وكيله).
 *   4) `طلب إخلاء سبيل بكفالة / بتعهد` — قالب الكفالة القديم؛ يُحتفظ به للتوافق مع البيانات السابقة.
 * أي قرار آخر (إصدار أوامر استقدام/قبض، تدوينات…) لا تظهر عليه ايقونة التمييز.
 */
export const CASSATION_APPEALABLE_PREPARATORY_TEMPLATES = new Set<string>([
    DETENTION_DECISION_TEMPLATE,
    DEFENDANT_BAIL_TEMPLATE,
    ASSET_SEIZURE_TEMPLATE,
    BAIL_RELEASE_TEMPLATE,
    JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
    JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE,
]);

export function isDetentionDecisionTemplate(template: string | undefined): boolean {
    return normalizeProceduralRequestTemplate(String(template ?? '').trim()) === DETENTION_DECISION_TEMPLATE;
}

/** هل القالب هو قرار «تكفيل المتهم» الجديد؟ */
export function isDefendantBailTemplate(template: string | undefined): boolean {
    return normalizeProceduralRequestTemplate(String(template ?? '').trim()) === DEFENDANT_BAIL_TEMPLATE;
}

/**
 * قرارات قضائية تُسجَّل في السجل دون تغيير تلقائي لحالة المتهم في مصفوفة `defendants`
 * (تُدار عبر بطاقة التوقيف الحية — LiveDetentionCard).
 * لا يمنع تحديث حقول `accused*` للمشتكي المتقابل.
 */
export function isJudicialDefendantStatusDocumentationOnly(template: string | undefined): boolean {
    return isDetentionDecisionTemplate(template);
}

/** هل القالب هو قرار «حجز الأموال» على متهم هارب؟ */
export function isAssetSeizureTemplate(template: string | undefined): boolean {
    return normalizeProceduralRequestTemplate(String(template ?? '').trim()) === ASSET_SEIZURE_TEMPLATE;
}

export function isOrderEnforcementTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return ORDER_ENFORCEMENT_TEMPLATE_SET.has(key);
}

export function resolveOrderEnforcementKindFromTemplate(
    template: string | undefined,
): 'summons' | 'arrest' | undefined {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    if (key === ARREST_ORDER_TEMPLATE) return 'arrest';
    if (key === SUMMON_ORDER_TEMPLATE) return 'summons';
    return undefined;
}

export function isArrestSummonDecisionTemplate(template: string | undefined): boolean {
    return isOrderEnforcementTemplate(template);
}

/** @deprecated */
export const isDetentionRequestTemplate = isDetentionDecisionTemplate;

export function requiresDetentionDateRange(template: string | undefined): boolean {
    return isDetentionDecisionTemplate(template);
}

export type DetentionUrgency = 'ok' | 'warning' | 'overdue';

export function computeDetentionUrgency(endDate: string | undefined): DetentionUrgency {
    const raw = String(endDate ?? '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!m) return 'ok';
    const end = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
    const hoursLeft = (end.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft < 0) return 'overdue';
    if (hoursLeft <= 48) return 'warning';
    return 'ok';
}

export function isCustomLawyerMotionTemplate(template: string | undefined): boolean {
    return normalizeProceduralRequestTemplate(template) === CUSTOM_LAWYER_MOTION_TYPE;
}

export function isCustomJudicialTemplate(template: string | undefined): boolean {
    return normalizeProceduralRequestTemplate(template) === CUSTOM_JUDICIAL_DECISION_TYPE;
}

export function isComplaintCourtReferralTemplate(template: string | undefined): boolean {
    return normalizeProceduralRequestTemplate(template) === COMPLAINT_COURT_REFERRAL_TEMPLATE;
}

export function resolveRequestEntryLane(
    template: string | undefined,
): 'judicial' | 'lawyer' | '' {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    if (!key) return '';
    if (isJudicialDecisionTemplate(key)) return 'judicial';
    if (isLawyerMotionTemplate(key)) return 'lawyer';
    return '';
}

export function resolveStoredRequestTypeFields(
    template: string,
    customName: string,
    isAppealableFlag: boolean,
): { type: string; proceduralTemplate: string; isAppealable?: boolean } {
    const tpl = normalizeProceduralRequestTemplate(template);
    if (isCustomJudicialTemplate(tpl) || isCustomLawyerMotionTemplate(tpl)) {
        const type = String(customName ?? '').trim();
        return {
            type,
            proceduralTemplate: tpl,
            isAppealable: isAppealableFlag ? true : undefined,
        };
    }
    if (isComplaintCourtReferralTemplate(tpl)) {
        return {
            type: tpl,
            proceduralTemplate: tpl,
            isAppealable: undefined,
        };
    }
    if (isJuvenileJudgeCassationAppealableTemplate(tpl)) {
        return {
            type: tpl,
            proceduralTemplate: tpl,
            isAppealable: true,
        };
    }
    return {
        type: tpl,
        proceduralTemplate: tpl,
        isAppealable: undefined,
    };
}

export function resolveRequestTypeTemplateFromStored(
    type: string,
    proceduralTemplate?: string,
): { template: string; customName: string } {
    const tpl = normalizeProceduralRequestTemplate(String(proceduralTemplate ?? type ?? '').trim());
    if (isCustomJudicialTemplate(tpl) || isCustomLawyerMotionTemplate(tpl)) {
        return { template: tpl, customName: String(type ?? '').trim() };
    }
    return { template: tpl, customName: '' };
}

/**
 * هل يحقّ الطعن التمييزي على هذا القرار؟
 *
 * قائمة بيضاء صارمة — لا تظهر ايقونة الطعن إلا للحالات الآتية:
 *   • قرار حاسم (dispositive) — حكم نهائي.
 *   • قرار توقيف المتهم.
 *   • قرار حجز أموال المتهم الهارب.
 *   • قرار تكفيل المتهم.
 *   • قرار إيداع دار الملاحظة / تسليم الحدث لوليه بتعهد (قاضي الأحداث).
 *   • قرار قضائي مخصص يدوي عند تفعيل «قابل للتمييز» صراحةً.
 *   • أي طلب من طلبات المحامي بعد البتّ به (قابل للتمييز تلقائياً).
 *   • قالب الكفالة القديم — للتوافق مع البيانات السابقة.
 * أيّ قرار آخر (إصدار أوامر، تدوينات…) لا تظهر له ايقونة طعن.
 */
export function isDecisionCassationAppealable(decision: JudicialDecision): boolean {
    if (decision.decisionType === 'dispositive') return true;
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    const title = normalizeProceduralRequestTemplate(decision.title);
    const key = template || title;
    if (CASSATION_APPEALABLE_PREPARATORY_TEMPLATES.has(key) || CASSATION_APPEALABLE_PREPARATORY_TEMPLATES.has(title)) {
        return true;
    }
    if (isCustomJudicialTemplate(template) || isCustomJudicialTemplate(title)) {
        return decision.isAppealable === true;
    }
    if (isLawyerMotionTemplate(template) || isLawyerMotionTemplate(title)) {
        return true;
    }
    return false;
}

