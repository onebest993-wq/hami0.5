/**
 * صور هوية النقابة — تحقق من data URL قبل التخزين/الإرسال.
 * القصّ متعمّد حتى لا يُسقط جسم التسجيل (مئات الكيلوبايت) طلب الإنشاء.
 */

export const IDENTITY_IMAGE_DATA_URL_RE =
    /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]{64,}$/i;

/** معاينة صغيرة داخل POST /signup — فوق هذا الحد يفشل الإنشاء غالباً */
export const SIGNUP_IDENTITY_PREVIEW_MAX_CHARS = 12_000;

/** معاينة مقر القيادة في KV */
export const KV_IDENTITY_PREVIEW_MAX_CHARS = 80_000;

export function isIdentityImageDataUrl(value: string | null | undefined): boolean {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '[omitted]') return false;
    return IDENTITY_IMAGE_DATA_URL_RE.test(raw);
}

export function clipIdentityImageDataUrl(
    value: string | null | undefined,
    maxChars: number,
): string | null {
    const raw = String(value ?? '').trim();
    if (!isIdentityImageDataUrl(raw)) return null;
    if (raw.length <= maxChars) return raw;
    const clipped = raw.slice(0, maxChars);
    return isIdentityImageDataUrl(clipped) ? clipped : null;
}

export function compactIdentityPreviewForSignup(value: string | null | undefined): string | null {
    return clipIdentityImageDataUrl(value, SIGNUP_IDENTITY_PREVIEW_MAX_CHARS);
}

export function compactIdentityPreviewForKv(value: string | null | undefined): string | null {
    return clipIdentityImageDataUrl(value, KV_IDENTITY_PREVIEW_MAX_CHARS);
}

export function assertLawyerIdentityImagesReady(
    idFrontDataUrl: string | null | undefined,
    idBackDataUrl: string | null | undefined,
): string | null {
    if (!isIdentityImageDataUrl(idFrontDataUrl)) {
        return 'صورة وجه هوية النقابة مطلوبة — اختر من المعرض أو الكاميرا';
    }
    if (!isIdentityImageDataUrl(idBackDataUrl)) {
        return 'صورة ظهر هوية النقابة مطلوبة — اختر من المعرض أو الكاميرا';
    }
    return null;
}
