import type { CaseShareDossierModule } from './caseShareTypes';
import { CaseShareRepository } from './caseShareRepository';
import { scheduleUnregisterCriminalCaseOwnership } from './caseShareCriminalOwnershipApi';

export const LAWSUIT_CASE_SHARE_MODULES: CaseShareDossierModule[] = ['lawsuit', 'personal'];
export const EXECUTION_CASE_SHARE_MODULES: CaseShareDossierModule[] = ['execution'];
export const CRIMINAL_CASE_SHARE_MODULES: CaseShareDossierModule[] = ['criminal'];

/**
 * ينهي جلسات المشاركة المعلّقة/النشطة لإضبارة محذوفة نهائياً.
 * يُرجع عدد السجلات التي تغيّرت.
 */
export async function revokeCaseSharesForDeletedDossier(
    ownerId: string | null | undefined,
    dossierId: string | number,
    modules: CaseShareDossierModule[],
): Promise<number> {
    const uid = String(ownerId ?? '').trim();
    const dossierKey = String(dossierId ?? '').trim();
    if (!uid || !dossierKey) return 0;
    return CaseShareRepository.revokeSharesForDossier(uid, dossierKey, modules);
}

/** نسخة غير حاجزة — للمسارات التفاعلية (حذف نهائي، إلخ). */
export function scheduleRevokeCaseSharesForDeletedDossier(
    ownerId: string | null | undefined,
    dossierId: string | number,
    modules: CaseShareDossierModule[],
): void {
    void revokeCaseSharesForDeletedDossier(ownerId, dossierId, modules).catch(() => undefined);
}

export function scheduleRevokeLawsuitCaseShares(
    ownerId: string | null | undefined,
    dossierId: string | number,
): void {
    scheduleRevokeCaseSharesForDeletedDossier(ownerId, dossierId, LAWSUIT_CASE_SHARE_MODULES);
}

export function scheduleRevokeExecutionCaseShares(
    ownerId: string | null | undefined,
    dossierId: string | number,
): void {
    scheduleRevokeCaseSharesForDeletedDossier(ownerId, dossierId, EXECUTION_CASE_SHARE_MODULES);
}

export function scheduleRevokeCriminalCaseShares(
    ownerId: string | null | undefined,
    dossierId: string | number,
): void {
    scheduleRevokeCaseSharesForDeletedDossier(ownerId, dossierId, CRIMINAL_CASE_SHARE_MODULES);
    scheduleUnregisterCriminalCaseOwnership(dossierId);
}
