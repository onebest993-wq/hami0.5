/** صور إضبارة المقر — jpeg/png/webp/gif فقط، سقف طول يمنع رسم SVG/HTML. */
export const HQ_DOSSIER_IMAGE_MAX = 350_000;
export const HQ_DOSSIER_IMAGE_OK = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;

export function sanitizeHqDossierImage(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    if (!HQ_DOSSIER_IMAGE_OK.test(raw) || raw.length > HQ_DOSSIER_IMAGE_MAX) return null;
    return raw;
}
