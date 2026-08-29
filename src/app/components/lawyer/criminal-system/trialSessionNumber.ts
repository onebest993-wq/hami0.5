/**
 * رقم الجلسة — بدائية بلا اعتماديات.
 *
 * كان هذا السطر ساكناً في `trialSessionsEngine` (٤٠٧ كيلوبايت بإغلاقه الثابت:
 * محرّك النقض والقرارات وسجلّ الجلسات). وبطاقة الأرشيف لا تحتاج منه إلا تحويل
 * «الجلسة ٣» إلى الرقم ٣ لتعرض «المرافعة القادمة». استيراد واحد لدالّة من ثلاثة
 * أسطر كان يشحن المحرّك كلّه إلى مقطع شبكة الأرشيف.
 *
 * يبقى `trialSessionsEngine` يُصدّرها إعادةَ تصدير، فمن يستوردها من هناك لا يتغيّر
 * ولا تُنسَخ القاعدة في موضعين.
 */

/** «الجلسة ٣» → 3. الافتراضي 1 لأن أول جلسة هي الأصل حين يغيب الرقم أو يفسد. */
export function parseTrialSessionNumber(sessionNumber: string): number {
    const n = Number.parseInt(String(sessionNumber ?? '').replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

export function isFirstTrialSessionNumber(sessionNumber: string): boolean {
    return parseTrialSessionNumber(sessionNumber) === 1;
}
