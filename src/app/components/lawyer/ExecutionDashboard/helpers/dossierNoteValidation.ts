/** تحقق مسودة ملاحظة الإضبارة قبل الحفظ */
export type DossierNoteValidationDraft = {
    title?: string;
    bodyHtml?: string;
};

export type DossierNoteValidationResult =
    | { ok: true; title: string; body: string; message?: undefined }
    | { ok: false; message: string; title?: undefined; body?: undefined };

const MAX_NOTE_TITLE = 160;
const MAX_NOTE_BODY = 8000;

export function validateDossierNoteDraft(
    draft: DossierNoteValidationDraft | null | undefined,
): DossierNoteValidationResult {
    if (!draft) {
        return { ok: false, message: 'تعذر الحفظ — لا توجد مسودة ملاحظة' };
    }
    const title = String(draft.title ?? '').trim();
    const body = String(draft.bodyHtml ?? '').trim();
    if (!title || !body) {
        return { ok: false, message: 'يرجى تعبئة عنوان الملاحظة والتفاصيل' };
    }
    if (title.length > MAX_NOTE_TITLE) {
        return { ok: false, message: `عنوان الملاحظة طويل جداً (حدّه ${MAX_NOTE_TITLE} حرفاً)` };
    }
    if (body.length > MAX_NOTE_BODY) {
        return { ok: false, message: `تفاصيل الملاحظة طويلة جداً (حدّها ${MAX_NOTE_BODY} حرفاً)` };
    }
    return { ok: true, title, body };
}
