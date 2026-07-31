/** تحقق مسودة تعديل الطرف — قبل الحفظ المتفائل */
export type PartyEditValidationDraft = {
    name?: string;
    phone?: string;
    address?: string;
    heirsOnlyEdit?: boolean;
    lockBaseInfo?: boolean;
    includeHeirsInForm?: boolean;
    heirs?: Array<{ name?: string }>;
};

export type PartyEditValidationResult =
    | { ok: true; message?: undefined }
    | { ok: false; message: string };

const MAX_PARTY_NAME = 120;
const MAX_PARTY_PHONE = 32;
const MAX_PARTY_ADDRESS = 400;
const MAX_HEIR_NAME = 120;
const MAX_HEIRS = 40;

export function validatePartyEditDraft(
    draft: PartyEditValidationDraft | null | undefined,
): PartyEditValidationResult {
    if (!draft) {
        return { ok: false, message: 'تعذر الحفظ — لا توجد مسودة تعديل' };
    }

    const heirsOnly = Boolean(draft.heirsOnlyEdit);
    const locked = Boolean(draft.lockBaseInfo);
    const editingBase = !heirsOnly && !locked;

    if (editingBase) {
        const name = String(draft.name ?? '').trim();
        if (!name) {
            return { ok: false, message: 'الاسم مطلوب قبل الحفظ' };
        }
        if (name.length > MAX_PARTY_NAME) {
            return { ok: false, message: `الاسم طويل جداً (حدّه ${MAX_PARTY_NAME} حرفاً)` };
        }
        const phone = String(draft.phone ?? '').trim();
        if (phone) {
            if (phone.length > MAX_PARTY_PHONE) {
                return { ok: false, message: 'رقم الهاتف طويل جداً' };
            }
            const digits = phone.replace(/\D/g, '');
            if (digits.length < 7) {
                return { ok: false, message: 'رقم الهاتف غير صالح — أدخل رقماً أواتركه فارغاً' };
            }
        }
        const address = String(draft.address ?? '').trim();
        if (address.length > MAX_PARTY_ADDRESS) {
            return { ok: false, message: `العنوان طويل جداً (حدّه ${MAX_PARTY_ADDRESS} حرفاً)` };
        }
    }

    if (heirsOnly || (locked && draft.includeHeirsInForm)) {
        const heirs = Array.isArray(draft.heirs) ? draft.heirs : [];
        if (heirs.length > MAX_HEIRS) {
            return { ok: false, message: `عدد الورثة يتجاوز الحد المسموح (${MAX_HEIRS})` };
        }
        const named = heirs.filter((h) => String(h?.name ?? '').trim().length > 0);
        if (heirs.length > 0 && named.length === 0) {
            return { ok: false, message: 'أدخل اسماً واحداً على الأقل لأحد الورثة' };
        }
        for (const h of heirs) {
            const hn = String(h?.name ?? '').trim();
            if (hn.length > MAX_HEIR_NAME) {
                return { ok: false, message: `اسم وريث طويل جداً (حدّه ${MAX_HEIR_NAME} حرفاً)` };
            }
        }
    }

    return { ok: true };
}
