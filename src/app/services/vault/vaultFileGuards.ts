import { isAllowedVaultImageMeta, isScriptableVaultMedia } from '@/app/services/vault/vaultPreviewUrlSafety';

export const VAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

export type VaultUploadKind = 'image' | 'pdf';

export function isVaultImageFile(file: File): boolean {
    return isAllowedVaultImageMeta(file.type || '', file.name);
}

export function isVaultPdfFile(file: File): boolean {
    const mime = (file.type || '').toLowerCase();
    const name = file.name.toLowerCase();
    if (isScriptableVaultMedia(mime, name)) return false;
    return mime === 'application/pdf' || name.endsWith('.pdf');
}

export function reportVaultPersistFailure(err: unknown, fileLabel: string): string {
    if (err instanceof Error && err.message === 'vault persist failed') {
        return 'تعذر حفظ الملف على الجهاز — قد تكون مساحة التخزين ممتلئة';
    }
    if (err instanceof Error && err.message === 'vault blob write timeout') {
        return `استغرق حفظ ${fileLabel} وقتاً طويلاً — جرّب ملفاً أصغر أو أعد المحاولة`;
    }
    if (err instanceof Error && err.message === 'vault save timeout') {
        return `استغرق رفع ${fileLabel} وقتاً طويلاً — أعد المحاولة`;
    }
    if (err instanceof Error && err.message === 'file too large') {
        return 'يتجاوز الحد الأقصى 50MB';
    }
    return `فشل حفظ ${fileLabel}`;
}
