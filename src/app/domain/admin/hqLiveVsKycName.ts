import { normalizeLegalDisplayName } from '@/app/domain/profile/displayNameCorrection';

const DIGIT_AR = '٠١٢٣٤٥٦٧٨٩';
const DIGIT_FA = '۰۱۲۳۴۵۶۷۸۹';

/** طيّ للمقارنة فقط — ليس للعرض ولا لفتح ملفات العمل. */
export function foldHqLegalName(raw: unknown): string {
    return normalizeLegalDisplayName(raw)
        .toLowerCase()
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/[ىي]/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[٠-٩]/g, (ch) => String(DIGIT_AR.indexOf(ch)))
        .replace(/[۰-۹]/g, (ch) => String(DIGIT_FA.indexOf(ch)));
}

/**
 * اختلاف الاسم الحي عن الاسم المكتوب على طلب التوثيق.
 * طرف ناقص ≠ انتحال: لا تنبيه بلا طرفين للمقارنة.
 */
export function hqLiveNameDivergesFromKyc(liveName: unknown, kycName: unknown): boolean {
    const live = foldHqLegalName(liveName);
    const kyc = foldHqLegalName(kycName);
    if (!live || !kyc) return false;
    return live !== kyc;
}
