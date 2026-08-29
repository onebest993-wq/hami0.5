/**
 * مسنَدات أسماء مراحل الطعن — نصّ خالص بلا اعتماديات.
 *
 * كانت تسكن `judgmentTypes` (٥٥٥ سطراً)، فاضطر كلٌّ من `pleadingStageClassification`
 * و`extraordinaryAppealGateway` إلى استيرادها منه بينما هو يستورد منهما تصنيف
 * مراحل المرافعة — دائرتا استيراد على محور مجال الأحكام.
 *
 * التعريفات منقولة حرفياً كما كانت؛ لا تغيير في السلوك القانوني.
 * الشقيقة: `absentJudgmentStageNames` لمرحلة الاعتراض الغيابي.
 */

/** مرحلة الاستئناف — تستثني التمييز صراحةً */
export function isAppealStageName(stageName?: string): boolean {
    const s = String(stageName ?? '');
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
