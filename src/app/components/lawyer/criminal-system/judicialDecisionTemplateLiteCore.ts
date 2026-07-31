import type { JudicialDecision } from '@/app/types/criminal';

export const CUSTOM_LAWYER_MOTION_TYPE = 'طلب محامٍ مخصص (إدخال يدوي)';
export const CUSTOM_JUDICIAL_DECISION_TYPE = 'قرار قضائي مخصص (إدخال يدوي)';
export const DETENTION_DECISION_TEMPLATE = 'قرار توقيف المتهم';
export const BAIL_RELEASE_TEMPLATE = 'طلب إخلاء سبيل بكفالة / بتعهد';
export const DEFENDANT_BAIL_TEMPLATE = 'تكفيل المتهم';
export const ASSET_SEIZURE_TEMPLATE = 'حجز الأموال';
export const JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE = 'قرار إيداع دار الملاحظة';
export const JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE = 'تسليم الحدث لوليه بتعهد';
export const INVESTIGATION_CLOSURE_FINAL_TEMPLATE = 'غلق الدعوى نهائياً (مادة 130)';

const LEGACY_TEMPLATE_ALIASES: Record<string, string> = {
    'إجراء مخصص (إدخال يدوي)': CUSTOM_LAWYER_MOTION_TYPE,
    'إجراء قضائي مخصص (إدخال يدوي)': CUSTOM_LAWYER_MOTION_TYPE,
    'طلب محامٍ مخصص (إدخال يدوي)': CUSTOM_LAWYER_MOTION_TYPE,
    'قرار قضائي مخصص (إدخال يدوي)': CUSTOM_JUDICIAL_DECISION_TYPE,
    'إحالة الشكوى إلى محكمة أخرى': 'إحالة الشكوى إلى محكمة أخرى',
    'إصدار أمر استقدام / قبض': 'إصدار أمر (استقدام / قبض وتحري)',
    'إصدار أمر (استقدام / قبض)': 'إصدار أمر (استقدام / قبض وتحري)',
    'إصدار أمر استقدام': 'إصدار أمر استقدام',
    'إصدار أمر قبض': 'إصدار أمر قبض',
    'قرار إخلاء سبيل بكفالة / تعهد': BAIL_RELEASE_TEMPLATE,
    'قرار توقيف / تمديد توقيف': DETENTION_DECISION_TEMPLATE,
    'قرار توقيف ابتداءً': DETENTION_DECISION_TEMPLATE,
    'قرار تمديد توقيف': DETENTION_DECISION_TEMPLATE,
    [INVESTIGATION_CLOSURE_FINAL_TEMPLATE]: 'غلق نهائي شخصي (مادة 130)',
};

const CASSATION_APPEALABLE_PREPARATORY_TEMPLATES = new Set<string>([
    DETENTION_DECISION_TEMPLATE,
    DEFENDANT_BAIL_TEMPLATE,
    ASSET_SEIZURE_TEMPLATE,
    BAIL_RELEASE_TEMPLATE,
    JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
    JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE,
]);

export function normalizeProceduralRequestTemplate(template: string | undefined): string {
    const key = String(template ?? '').trim();
    return LEGACY_TEMPLATE_ALIASES[key] ?? key;
}

export function isDetentionDecisionTemplate(template: string | undefined): boolean {
    return normalizeProceduralRequestTemplate(String(template ?? '').trim()) === DETENTION_DECISION_TEMPLATE;
}

export function isDefendantBailTemplate(template: string | undefined): boolean {
    return normalizeProceduralRequestTemplate(String(template ?? '').trim()) === DEFENDANT_BAIL_TEMPLATE;
}

export function isAssetSeizureTemplate(template: string | undefined): boolean {
    return normalizeProceduralRequestTemplate(String(template ?? '').trim()) === ASSET_SEIZURE_TEMPLATE;
}

function isCustomLawyerMotionTemplate(template: string | undefined): boolean {
    return normalizeProceduralRequestTemplate(template) === CUSTOM_LAWYER_MOTION_TYPE;
}

function isCustomJudicialTemplate(template: string | undefined): boolean {
    return normalizeProceduralRequestTemplate(template) === CUSTOM_JUDICIAL_DECISION_TYPE;
}

function isLawyerMotionTemplate(template: string | undefined): boolean {
    return normalizeProceduralRequestTemplate(String(template ?? '').trim()) === BAIL_RELEASE_TEMPLATE ||
        isCustomLawyerMotionTemplate(template);
}

export function isDecisionCassationAppealable(decision: JudicialDecision): boolean {
    if (decision.decisionType === 'dispositive') return true;
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    const title = normalizeProceduralRequestTemplate(decision.title);
    const key = template || title;
    if (
        CASSATION_APPEALABLE_PREPARATORY_TEMPLATES.has(key) ||
        CASSATION_APPEALABLE_PREPARATORY_TEMPLATES.has(title)
    ) {
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

