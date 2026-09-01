/**
 * مراحل الدعوى حسب المحكمة — منطق النواة، بلا نموذج NewCase.
 * يُستخدم لتوليد الدعوى الحادثة / المتقابلة من إضبارة قائمة، لا لنموذج الفتح الجديد.
 */
export function computeLawsuitStageOptions(court: string): string[] {
    const c = court.toLowerCase();
    if (c.includes('بداءة')) {
        return [
            'بداءة بدرجة أخيرة',
            'بداءة بدرجة أولى',
            'اعتراض على الحكم الغيابي',
            'اعتراض الغير',
            'إعادة المحاكمة',
        ];
    }
    if (c.includes('استئناف')) {
        return ['استئناف', 'اعتراض على الحكم الغيابي', 'اعتراض الغير', 'إعادة المحاكمة'];
    }
    return [
        'بداءة بدرجة أولى',
        'بداءة بدرجة أخيرة',
        'استئناف',
        'اعتراض على الحكم الغيابي',
        'اعتراض الغير',
        'إعادة المحاكمة',
    ];
}

export const OPENING_STAGE_FIRST_DEGREE = 'بداءة بدرجة أولى';
export const OPENING_STAGE_LAST_DEGREE = 'بداءة بدرجة أخيرة';

/** عتبة المادة 31 مرافعات — فوقها بداءة بدرجة أولى، وإلا بدرجة أخيرة. */
export const LAWSUIT_FIRST_INSTANCE_DEGREE_THRESHOLD = 1_000_000;

export function parseLawsuitClaimValueAmount(claimValue: string | undefined): number {
    return parseInt(String(claimValue ?? '').replace(/[^0-9]/g, ''), 10) || 0;
}

export type OpeningLawsuitStageInput = {
    claimValue: string;
    isUndeterminedValue: boolean;
    isFixedFee: boolean;
    caseType: string;
};

function forcesLastDegreeType(caseType: string): boolean {
    return caseType.includes('تخلي') || caseType.includes('شيوع');
}

/** طعون واستئناف تبقى في قائمة الفتح — الفلترة تخص درجتي البداءة فقط. */
export const OPENING_LATE_STAGE_OPTIONS = [
    'استئناف',
    'اعتراض على الحكم الغيابي',
    'اعتراض الغير',
    'إعادة المحاكمة',
] as const;

/**
 * درجة البداءة عند الإنشاء: أولى أو أخيرة حصراً حسب القيمة.
 * أقل من مليون / غير مقدّرة / رسم مقطوع / تخلي أو شيوع → بدرجة أخيرة فقط.
 * أكثر من مليون دون تلك الحالات → بدرجة أولى فقط.
 */
export function computeOpeningDegreeOptions(input: OpeningLawsuitStageInput): string[] {
    const type = String(input.caseType ?? '');
    const amount = parseLawsuitClaimValueAmount(input.claimValue);

    if (forcesLastDegreeType(type) || input.isUndeterminedValue || input.isFixedFee) {
        return [OPENING_STAGE_LAST_DEGREE];
    }
    if (amount > LAWSUIT_FIRST_INSTANCE_DEGREE_THRESHOLD) {
        return [OPENING_STAGE_FIRST_DEGREE];
    }
    if (amount > 0) {
        return [OPENING_STAGE_LAST_DEGREE];
    }
    return [OPENING_STAGE_FIRST_DEGREE, OPENING_STAGE_LAST_DEGREE];
}

export function computeOpeningLawsuitStageOptions(input: OpeningLawsuitStageInput): string[] {
    return [...computeOpeningDegreeOptions(input), ...OPENING_LATE_STAGE_OPTIONS];
}

export function isOpeningDegreeStage(stage: string): boolean {
    return stage === OPENING_STAGE_FIRST_DEGREE || stage === OPENING_STAGE_LAST_DEGREE;
}

/**
 * يُثبّت درجة البداءة عندما لا يبقى إلا خيار واحد.
 * لا يمسّ الاستئناف أو الطعون الاستثنائية، ولا يختار مرحلة تلقائياً إن بقيت الدرجتان.
 */
export function snapOpeningStageToDegrees(currentStage: string, degrees: string[]): string {
    if (currentStage && !isOpeningDegreeStage(currentStage)) return currentStage;
    if (degrees.includes(currentStage)) return currentStage;
    if (degrees.length === 1) return degrees[0]!;
    return currentStage;
}
