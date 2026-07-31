import type { FileData } from '@/app/components/lawyer/LawyerShared';

export type LawsuitFileMutationTarget = {
    status?: string | null;
};

export function isLawsuitFileArchived(file: LawsuitFileMutationTarget | null | undefined): boolean {
    return String(file?.status ?? '').trim() === 'archived';
}

export function isLawsuitFileDeleted(file: LawsuitFileMutationTarget | null | undefined): boolean {
    return String(file?.status ?? '').trim() === 'deleted';
}

export function isLawsuitFileMutationBlocked(file: LawsuitFileMutationTarget | null | undefined): boolean {
    return isLawsuitFileArchived(file) || isLawsuitFileDeleted(file);
}

/** رسالة عربية عند رفض التعديل — null إذا مسموح */
export function rejectLawsuitFileMutation(file: LawsuitFileMutationTarget | null | undefined): string | null {
    if (!file) return 'السجل غير موجود.';
    if (isLawsuitFileDeleted(file)) return 'الإضبارة في سلة المحذوفات — لا يمكن التعديل.';
    if (isLawsuitFileArchived(file)) return 'الإضبارة مؤرشفة — للقراءة فقط.';
    return null;
}

export function assertLawsuitFileMutable(
    file: FileData | LawsuitFileMutationTarget | null | undefined,
): FileData | LawsuitFileMutationTarget {
    const msg = rejectLawsuitFileMutation(file);
    if (msg) throw new Error(msg);
    return file as FileData;
}
