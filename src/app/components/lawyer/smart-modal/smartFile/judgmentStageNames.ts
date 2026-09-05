/**
 * مسنَدات أسماء مراحل الطعن — نصّ خالص بلا اعتماديات.
 *
 * كانت تسكن `judgmentTypes` (٥٥٥ سطراً)، فاضطر كلٌّ من `pleadingStageClassification`
 * و`extraordinaryAppealGateway` إلى استيرادها منه بينما هو يستورد منهما تصنيف
 * مراحل المرافعة — دائرتا استيراد على محور مجال الأحكام.
 *
 * الشقيقة: `absentJudgmentStageNames` لمرحلة الاعتراض الغيابي.
 */

/**
 * مرحلة الاستئناف ذاتها (الاستئناف / استئناف).
 * لا تُعدّ طعوناً استثنائية مقيَّدة بطبقة الاستئناف — مثل اعتراض الغير (استئناف).
 */
export function isAppealStageName(stageName?: string): boolean {
    const s = String(stageName ?? '').trim();
    if (!s) return false;
    if (s.includes('اعتراض الغير') || s.includes('حكم الغير')) return false;
    if (s.includes('إعادة المحاكمة') || s.includes('إعادة محاكمة')) return false;
    if (
        s.includes('اعتراض على الحكم الغيابي')
        || s.includes('الاعتراض على الحكم الغيابي')
        || s.includes('اعتراض غيابي')
    ) {
        return false;
    }
    return s.includes('استئناف') && !s.includes('التمييز');
}

/** مرحلة التمييز — تستثني الاستئناف صراحةً */
export function isCassationStageName(stageName?: string): boolean {
    const s = String(stageName ?? '');
    return s === 'التمييز' || (s.includes('تمييز') && !s.includes('استئناف'));
}

const CASSATION_CORRECTION_STAGE_NAME = 'تصحيح قرار';

/** مرحلة تصحيح القرار التمييزي — نصّ خالص بلا بوّابة الطعون */
export function isCassationCorrectionStageName(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    if (!s) return false;
    return s === CASSATION_CORRECTION_STAGE_NAME || (s.includes('تصحيح') && s.includes('قرار'));
}
