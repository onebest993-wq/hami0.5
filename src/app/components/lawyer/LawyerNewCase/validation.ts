import type { Party, CaseType } from './types';
import { FIXED_FEE_KEYWORDS, UNIVERSAL_BLOCKED_WORDS, CIVIL_ONLY_BLOCKED_WORDS } from './constants';

export interface ValidationResult {
    errorMap: Record<string, string>;
    stageOptions: string[];
    caseNumberError: string | null;
}

const GENERIC_ERROR = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة';

/** مراحل الحكم الأصلي التي يُغطى بها الطعن الاستثنائي (بدلاً من القيمة) */
export const UNDERLYING_STAGE_OPTIONS = [
    'بداءة بدرجة أولى',
    'بداءة بدرجة أخيرة',
    'استئناف',
] as const;

/** @deprecated استخدم UNDERLYING_STAGE_OPTIONS */
export const RETRIAL_TARGET_STAGE_OPTIONS = UNDERLYING_STAGE_OPTIONS;

export type UnderlyingStage = (typeof UNDERLYING_STAGE_OPTIONS)[number];

const EXTRAORDINARY_PROCEDURE_MARKERS = [
    'إعادة المحاكمة',
    'اعتراض على الحكم الغيابي',
    'اعتراض الغير',
] as const;

/** مراحل طعن استثنائية — تُخفى القيمة وتُعرض مرحلة الحكم الأصلي */
export const isExtraordinaryProcedureStage = (stage: string): boolean =>
    EXTRAORDINARY_PROCEDURE_MARKERS.some((m) => stage.includes(m));

/** @deprecated استخدم isExtraordinaryProcedureStage */
export const isRetrialStage = isExtraordinaryProcedureStage;

export const getUnderlyingStageFieldLabel = (stage: string): string => {
    if (stage.includes('إعادة المحاكمة')) return 'مرحلة المطلوب إعادة محاكمتها';
    if (stage.includes('اعتراض على الحكم الغيابي')) return 'مرحلة الحكم المُعترض عليه غيابياً';
    if (stage.includes('اعتراض الغير')) return 'مرحلة الحكم المُعترض عليه اعتراض الغير';
    return 'مرحلة الحكم الأصلي';
};

/** اعتراض غيابي — يخص أحكام البداءة فقط (لا استئناف كمرحلة أصلية) */
export const isAbsentJudgmentObjectionStage = (stage: string): boolean =>
    stage.includes('اعتراض على الحكم الغيابي');

/**
 * خيارات المرحلة الأصلية حسب نوع الطعن الاستثنائي.
 * الاعتراض على الحكم الغيابي: بداءة أولى/أخيرة فقط — الاستئناف مسار مستقل لاحقاً.
 */
export const getUnderlyingStageOptions = (currentStage: string): readonly string[] => {
    if (isAbsentJudgmentObjectionStage(currentStage)) {
        return ['بداءة بدرجة أولى', 'بداءة بدرجة أخيرة'] as const;
    }
    return UNDERLYING_STAGE_OPTIONS;
};

export const computeStageOptions = (court: string): string[] => {
    const c = court.toLowerCase();
    if (c.includes('بداءة')) {
        return ['بداءة بدرجة أخيرة', 'بداءة بدرجة أولى', 'اعتراض على الحكم الغيابي', 'اعتراض الغير', 'إعادة المحاكمة'];
    }
    if (c.includes('استئناف')) {
        return ['استئناف', 'اعتراض على الحكم الغيابي', 'اعتراض الغير', 'إعادة المحاكمة'];
    }
    return ['بداءة بدرجة أولى', 'بداءة بدرجة أخيرة', 'استئناف', 'اعتراض على الحكم الغيابي', 'اعتراض الغير', 'إعادة المحاكمة'];
};

export const getBlockedWordsForJurisdiction = (jurisdiction: CaseType | null): string[] => {
    if (jurisdiction === 'personal') return UNIVERSAL_BLOCKED_WORDS;
    return [...UNIVERSAL_BLOCKED_WORDS, ...CIVIL_ONLY_BLOCKED_WORDS];
};

export const getBlockedWordsError = (
    court: string,
    type: string,
    jurisdiction: CaseType | null = 'civil',
): Record<string, string> => {
    const blockedWords = getBlockedWordsForJurisdiction(jurisdiction);
    const errors: Record<string, string> = {};
    if (blockedWords.some(w => court.toLowerCase().includes(w))) errors['court'] = GENERIC_ERROR;
    if (blockedWords.some(w => type.toLowerCase().includes(w))) errors['type'] = GENERIC_ERROR;
    return errors;
};

export const getStageCourtMismatchErrors = (court: string, stage: string): Record<string, string> => {
    const c = court.toLowerCase();
    const errors: Record<string, string> = {};
    if (c.includes('بداءة') && stage.includes('استئناف')) errors['stage'] = GENERIC_ERROR;
    if (c.includes('استئناف') && stage.includes('بداءة')) errors['court'] = GENERIC_ERROR;
    return errors;
};

/** تطابق محكمة الاختصاص مع مرحلة الحكم الأصلي للطعن الاستثنائي */
export const getRetrialTargetCourtMismatchErrors = (
    court: string,
    underlyingStage: string,
): Record<string, string> => {
    const raw = getStageCourtMismatchErrors(court, underlyingStage);
    const errors: Record<string, string> = {};
    if (raw['stage']) errors['retrialTargetStage'] = raw['stage'];
    if (raw['court']) errors['court'] = raw['court'];
    return errors;
};

export const computeStageForValue = (value: number, currentStage: string) => {
    if (currentStage === 'بداءة بدرجة أولى' && value <= 1000000) return 'بداءة بدرجة أخيرة';
    if (currentStage === 'بداءة بدرجة أخيرة' && value > 1000000) return 'بداءة بدرجة أولى';
    return currentStage;
};

export const getExceptionWarning = (claimValue: string, type: string): string | null => {
    const cleanValue = parseInt(claimValue.replace(/[^0-9]/g, '')) || 0;
    const EXCEPTION_TYPES = ['تخلي', 'شيوع', 'دين', 'استرداد', 'تعرض', 'وقف', 'تعويض'];
    const typeMatches = EXCEPTION_TYPES.some(t => type.includes(t));
    if (cleanValue > 0 && cleanValue <= 1000000 && typeMatches) {
        return 'تنبيه: الطعن في هذه الدعوى يكون أمام محكمة الاستئناف بصفتها التمييزية';
    }
    return null;
};

export const getCaseNumberError = (num: string): string | null => {
    if (!num) return null;
    const slashCount = (num.match(/\//g) || []).length;
    if (slashCount < 2) return null;
    const permissiveRegex = /^[\d\u0660-\u0669\s]+\/[\u0600-\u06FF\s]+\/[\d\u0660-\u0669\s]+$/;
    if (!permissiveRegex.test(num)) {
        return 'يرجى استخدام الصيغة: رقم/حرف/سنة (مثال: 15/ب/2026)';
    }
    return null;
};

export const getValuePlaceholder = (type: string): string => {
    if (type.includes('تخلي')) return 'أدخل بدل الإيجار السنوي (مادة 18)';
    if (type.includes('معارضة')) return 'أدخل بدل المفعة السنوي';
    if (type.includes('شفعة')) return 'القيمة المسجلة بالطابو';
    return 'مهم لتحديد الاختصاص';
};

export const isFixedFeeType = (type: string): boolean => {
    return FIXED_FEE_KEYWORDS.some(k => type.includes(k));
};

export const isEvictionOrSharing = (type: string): boolean => {
    return type.includes('تخلي') || type.includes('شيوع');
};

export const getRoleForStage = (stage: string, side: 1 | 2, count: number): string => {
    if (!stage) return side === 1 ? (count > 1 ? 'المدعين' : 'المدعي') : (count > 1 ? 'المدعى عليهم' : 'المدعى عليه');
    if (side === 1) {
        if (stage.includes('استئناف')) return count > 1 ? 'المستأنفين' : 'مستأنف';
        return count > 1 ? 'المدعين' : 'المدعي';
    }
    if (side === 2) {
        if (stage.includes('استئناف')) return count > 1 ? 'المستأنف عليهم' : 'مستأنف عليه';
        return count > 1 ? 'المدعى عليهم' : 'المدعى عليه';
    }
    return '';
};

export const getLabels = (mainCategory: string | null) => {
    switch (mainCategory) {
        case 'execution':
            return { p1Main: 'الطرف الأول', p2Main: 'الطرف الثاني', courtPlaceholder: 'مديرية التنفيذ...', typePlaceholder: 'السند التنفيذي...' };
        case 'transaction':
            return { p1Main: 'الطرف الأول', p2Main: 'الطرف الثاني', courtPlaceholder: 'دائرة كاتب العدل...', typePlaceholder: 'نوع المعاملة...' };
        default:
            return { p1Main: 'الطرف الأول', p2Main: 'الطرف الثاني', courtPlaceholder: 'اسم المحكمة المختصة...', typePlaceholder: 'أدخل نوع الدعوى...' };
    }
};

export const getAddPartyButtonText = (parties: Party[], side: 1 | 2) => {
    if (parties.length === 0) return 'إضافة طرف آخر';
    const firstStatus = parties[0].status.trim();
    if (side === 1) {
        if (firstStatus === 'مدعي') return 'إضافة مدعي آخر';
        if (firstStatus === 'مستأنف') return 'إضافة مستأنف آخر';
    } else {
        if (firstStatus === 'مدعى عليه') return 'إضافة مدعى عليه آخر';
        if (firstStatus === 'مستأنف عليه') return 'إضافة مستأنف عليه آخر';
    }
    return 'إضافة طرف آخر';
};

export const validateForm = (
    caseDetails: {
        court: string;
        type: string;
        stage: string;
        number: string;
        retrialTargetStage?: string;
    },
    errorMap: Record<string, string>,
    caseNumberError: string | null,
    parties1: Party[],
    parties2: Party[]
): { errors: Record<string, string>; firstErrorField: string | null } => {
    const errors: Record<string, string> = {};
    let firstErrorField: string | null = null;

    const hasValidationErrors = ['court', 'type', 'stage', 'retrialTargetStage'].some(key => errorMap[key]);
    if (hasValidationErrors) return { errors, firstErrorField: 'court' };

    if (!caseDetails.court) { errors['court'] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة'; if (!firstErrorField) firstErrorField = 'court'; }
    if (!caseDetails.type) { errors['type'] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة'; if (!firstErrorField) firstErrorField = 'type'; }
    if (!caseDetails.stage) { errors['stage'] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة'; if (!firstErrorField) firstErrorField = 'stage'; }
    if (isExtraordinaryProcedureStage(caseDetails.stage) && !caseDetails.retrialTargetStage?.trim()) {
        errors['retrialTargetStage'] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة';
        if (!firstErrorField) firstErrorField = 'retrialTargetStage';
    }
    if (caseNumberError) { errors['number'] = caseNumberError; if (!firstErrorField) firstErrorField = 'number'; }

    parties1.forEach(p => { if (!p.name) errors[`party_${p.id}`] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة'; });
    parties2.forEach(p => { if (!p.name) errors[`party_${p.id}`] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة'; });

    return { errors, firstErrorField };
};
