import { isVaultImageFile, isVaultPdfFile, VAULT_MAX_FILE_SIZE } from '@/app/services/vaultUploadService';

export type ComposeSaveBlockReason = 'empty' | 'type' | 'size';

export const COMPOSE_SAVE_BLOCK_TOAST: Record<ComposeSaveBlockReason, string> = {
    empty: 'أضف عنواناً أو نصاً أو مرفقاً',
    type: 'المرفق يجب أن يكون صورة أو PDF فقط',
    size: 'حجم المرفق يتجاوز الحد المسموح (50 م.ب)',
};

export function resolveComposeSaveBlock(params: {
    title: string;
    plain: string;
    attachmentFile: File | null;
}): ComposeSaveBlockReason | null {
    const { title, plain, attachmentFile } = params;
    if (!title.trim() && !plain && !attachmentFile) return 'empty';
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
