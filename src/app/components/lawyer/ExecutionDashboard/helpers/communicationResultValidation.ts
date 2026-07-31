/** تحقق مسودة نتيجة المخاطبة قبل الحفظ */
export type CommunicationResultDraft = {
    purpose?: string;
    letterNum?: string;
    letterDate?: string;
    result?: string;
};

export type CommunicationResultValidation =
    | { ok: true; message?: undefined }
    | { ok: false; message: string };

const MAX_PURPOSE = 160;
const MAX_LETTER_NUM = 40;
const MAX_RESULT = 2000;

export function validateCommunicationResultDraft(
    draft: CommunicationResultDraft | null | undefined,
): CommunicationResultValidation {
    if (!draft) {
        return { ok: false, message: 'تعذر الحفظ — لا توجد مسودة نتيجة' };
    }
    const result = String(draft.result ?? '').trim();
    if (!result) {
        return { ok: false, message: 'أدخل مضمون الإجابة' };
    }
    if (result.length > MAX_RESULT) {
        return { ok: false, message: `مضمون الإجابة طويل جداً (حدّه ${MAX_RESULT} حرفاً)` };
    }
    const purpose = String(draft.purpose ?? '').trim();
    if (purpose.length > MAX_PURPOSE) {
        return { ok: false, message: 'اسم الجهة طويل جداً' };
    }
    const letterNum = String(draft.letterNum ?? '').trim();
    if (letterNum.length > MAX_LETTER_NUM) {
        return { ok: false, message: 'رقم الكتاب طويل جداً' };
    }
    const letterDate = String(draft.letterDate ?? '').trim();
    if (letterDate && !/^\d{4}-\d{2}-\d{2}$/.test(letterDate)) {
        return { ok: false, message: 'تاريخ الكتاب غير صالح' };
    }
    return { ok: true };
}
