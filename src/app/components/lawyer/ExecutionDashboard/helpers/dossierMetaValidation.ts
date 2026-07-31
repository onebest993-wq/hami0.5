/** تحقق مسودة تعديل بيانات الإضبارة قبل الحفظ */
export type DossierMetaValidationDraft = Record<string, string> | null | undefined;

export type DossierMetaValidationResult =
    | { ok: true; message?: undefined }
    | { ok: false; message: string };

const MAX_DIRECTORATE = 160;
const MAX_FILE_NUMBER = 40;
const MAX_FREE_TEXT = 200;
const MAX_PROPERTY_NUMBER = 80;

/** عرض موحّد: 444/2024 */
export function formatDossierFileRef(fileNumber: string, fileYear: string): string {
    const n = String(fileNumber ?? '').trim();
    const y = String(fileYear ?? '').trim();
    if (n && y) return `${n}/${y}`;
    if (n.includes('/') || n.includes('-')) return n;
    return n || y;
}

/** يفكّك 444/2024 أو 444 / 2024 إلى رقم وسنة */
export function parseDossierFileRef(raw: string): { fileNumber: string; fileYear: string } {
    const cleaned = String(raw ?? '').trim().replace(/\s+/g, '');
    if (!cleaned) return { fileNumber: '', fileYear: '' };

    const slashParts = cleaned.split('/');
    if (slashParts.length >= 2) {
        return {
            fileNumber: slashParts[0] || '',
            fileYear: slashParts[1] || '',
        };
    }

    const dashMatch = cleaned.match(/^(.+?)[-ـ](\d{4})$/);
    if (dashMatch) {
        return { fileNumber: dashMatch[1] || '', fileYear: dashMatch[2] || '' };
    }

    return { fileNumber: cleaned, fileYear: '' };
}

function resolveDraftFileParts(draft: Record<string, string>): {
    fileNumber: string;
    fileYear: string;
} {
    const rawNumber = String(draft.fileNumber ?? '').trim();
    const rawYear = String(draft.fileYear ?? '').trim();

    if (rawNumber.includes('/') || /[-ـ]\d{4}$/.test(rawNumber.replace(/\s+/g, ''))) {
        const parsed = parseDossierFileRef(rawNumber);
        return {
            fileNumber: parsed.fileNumber,
            fileYear: parsed.fileYear || rawYear,
        };
    }

    return {
        fileNumber: rawNumber,
        fileYear: rawYear,
    };
}

export function validateDossierMetaDraft(
    draft: DossierMetaValidationDraft,
    options?: { isEviction?: boolean },
): DossierMetaValidationResult {
    if (!draft) {
        return { ok: false, message: 'تعذر الحفظ — لا توجد مسودة' };
    }

    const directorate = String(draft.directorate ?? '').trim();
    const { fileNumber, fileYear } = resolveDraftFileParts(draft);

    if (!directorate) {
        return { ok: false, message: 'اسم المديرية / الجهة مطلوب' };
    }
    if (directorate.length > MAX_DIRECTORATE) {
        return { ok: false, message: `اسم المديرية طويل جداً (حدّه ${MAX_DIRECTORATE} حرفاً)` };
    }
    if (!fileNumber) {
        return { ok: false, message: 'رقم الإضبارة مطلوب' };
    }
    if (fileNumber.length > MAX_FILE_NUMBER) {
        return { ok: false, message: 'رقم الإضبارة طويل جداً' };
    }
    if (!fileYear) {
        return { ok: false, message: 'أدخل رقم الإضبارة بالصيغة: رقم/سنة (مثال: 444/2024)' };
    }
    if (!/^\d{4}$/.test(fileYear)) {
        return { ok: false, message: 'سنة الإضبارة يجب أن تكون أربعة أرقام' };
    }

    for (const [key, label, max] of [
        ['docNumber', 'رقم القرار', MAX_FREE_TEXT],
        ['classification', 'التصنيف', MAX_FREE_TEXT],
    ] as const) {
        const v = String(draft[key] ?? '').trim();
        if (v.length > max) {
            return { ok: false, message: `${label} طويل جداً` };
        }
    }

    if (options?.isEviction) {
        const propertyNumber = String(draft.property_number ?? '').trim();
        if (!propertyNumber) {
            return { ok: false, message: 'رقم العقار مطلوب في إضبارة التخلية' };
        }
        if (propertyNumber.length > MAX_PROPERTY_NUMBER) {
            return { ok: false, message: 'رقم العقار طويل جداً' };
        }
        for (const key of ['district', 'property_type', 'full_address'] as const) {
            if (String(draft[key] ?? '').trim().length > MAX_FREE_TEXT) {
                return { ok: false, message: 'أحد حقول العقار طويل جداً' };
            }
        }
    }

    return { ok: true };
}
