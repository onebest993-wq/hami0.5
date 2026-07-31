import type { CriminalCase } from './criminalCaseModel';
import { canMutateCriminalCaseForLawyer } from './criminalCaseOwner';

export const CRIMINAL_MUTATION_DENIED_MSG =
    'لا يمكن تعديل هذه الإضبارة — مرتبطة بمحامٍ آخر أو بلا مالك مسجّل.';

/**
 * يُستدعى داخل mutating actions قبل أي تعديل على الإضبارة.
 * يُرجع رسالة خطأ أو null عند السماح.
 */
export function rejectCriminalCaseMutation(
    caseRecord: Pick<CriminalCase, 'ownerLawyerId'> | null | undefined,
    sessionOwnerLawyerId: string | null | undefined,
): string | null {
    if (!caseRecord) return 'الإضبارة غير موجودة.';
    if (!canMutateCriminalCaseForLawyer(caseRecord, sessionOwnerLawyerId)) {
        return CRIMINAL_MUTATION_DENIED_MSG;
    }
    return null;
}

/** للـ set() الصامت — يُرجع true عند رفض التعديل (مالك/غياب إضبارة). */
export function isCriminalCaseMutationBlocked(
    caseRecord: Pick<CriminalCase, 'ownerLawyerId'> | null | undefined,
    sessionOwnerLawyerId: string | null | undefined,
): boolean {
    return rejectCriminalCaseMutation(caseRecord, sessionOwnerLawyerId) !== null;
}
