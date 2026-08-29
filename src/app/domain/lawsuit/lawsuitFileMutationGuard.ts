import type { FileData } from './lawsuitFileTypes';
import { isLawsuitArchived, isLawsuitInTrash } from '@/app/utils/lawsuitTrash';

type LawsuitFileMutationTarget = {
    status?: string | null;
};

/** Null-safe archive check for mutation guards — delegates to `isLawsuitArchived`. */
function lawsuitTargetIsArchived(file: LawsuitFileMutationTarget | null | undefined): boolean {
    return isLawsuitArchived({ status: file?.status ?? undefined });
}

function isLawsuitFileDeleted(file: LawsuitFileMutationTarget | null | undefined): boolean {
    return isLawsuitInTrash({ status: file?.status ?? undefined });
}

export function isLawsuitFileMutationBlocked(file: LawsuitFileMutationTarget | null | undefined): boolean {
    return lawsuitTargetIsArchived(file) || isLawsuitFileDeleted(file);
}

/** رسالة عربية عند رفض التعديل — null إذا مسموح */
export function rejectLawsuitFileMutation(file: LawsuitFileMutationTarget | null | undefined): string | null {
    if (!file) return 'السجل غير موجود.';
    if (isLawsuitFileDeleted(file)) return 'الإضبارة في سلة المحذوفات — لا يمكن التعديل.';
    if (lawsuitTargetIsArchived(file)) return 'الإضبارة مؤرشفة — للقراءة فقط.';
    return null;
}

export function assertLawsuitFileMutable(
    file: FileData | LawsuitFileMutationTarget | null | undefined,
): FileData | LawsuitFileMutationTarget {
    const msg = rejectLawsuitFileMutation(file);
    if (msg) throw new Error(msg);
    return file as FileData;
}
