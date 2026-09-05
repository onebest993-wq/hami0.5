import { isVaultImageFile, isVaultPdfFile, VAULT_MAX_FILE_SIZE } from '@/app/services/vault/vaultFileGuards';

type ComposeSaveBlockReason = 'empty' | 'type' | 'size' | 'unsigned';

export const COMPOSE_SAVE_BLOCK_TOAST: Record<ComposeSaveBlockReason, string> = {
    empty: 'أضف عنواناً أو نصاً أو مرفقاً',
    type: 'المرفق يجب أن يكون صورة أو PDF فقط',
    size: 'حجم المرفق يتجاوز الحد المسموح (50 م.ب)',
    unsigned: 'يرجى تسجيل الدخول أولاً لحفظ المرفق',
};

export function resolveComposeSaveBlock(params: {
    title: string;
    plain: string;
    attachmentFile: File | null;
    hasSession?: boolean;
}): ComposeSaveBlockReason | null {
    const { title, plain, attachmentFile, hasSession = true } = params;
    if (!title.trim() && !plain && !attachmentFile) return 'empty';
    if (attachmentFile && !hasSession) return 'unsigned';
    if (
        attachmentFile &&
        !isVaultImageFile(attachmentFile) &&
        !isVaultPdfFile(attachmentFile)
    ) {
        return 'type';
    }
    if (attachmentFile && attachmentFile.size > VAULT_MAX_FILE_SIZE) return 'size';
    return null;
}
