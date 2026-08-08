/**
 * تصنيف فشل تحميل PDF — يسمح للواجهة بتمييز الملف التالف/المحمي
 * (لا تنفع إعادة المحاولة) عن الفشل العابر (شبكة/worker — تنفع إعادة المحاولة).
 */
export type VaultPdfLoadErrorKind = 'password' | 'invalid' | 'timeout' | 'transient';

export type VaultPdfSource = string | Blob;

export class VaultPdfLoadError extends Error {
    readonly kind: VaultPdfLoadErrorKind;

    constructor(kind: VaultPdfLoadErrorKind, message: string, cause?: unknown) {
        super(message);
        this.name = 'VaultPdfLoadError';
        this.kind = kind;
        if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
    }
}

export function classifyVaultPdfLoadError(err: unknown): VaultPdfLoadErrorKind {
    if (err instanceof VaultPdfLoadError) return err.kind;
    const name = String((err as { name?: unknown } | null)?.name ?? '');
    if (name === 'PasswordException') return 'password';
    if (name === 'InvalidPDFException') return 'invalid';
    const message = String((err as { message?: unknown } | null)?.message ?? '');
    if (/invalid pdf structure|pdf empty/i.test(message)) return 'invalid';
    return 'transient';
}
