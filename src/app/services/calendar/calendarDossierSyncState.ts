const lastSyncedFingerprintByLawyer = new Map<string, string>();

export function shouldSkipDossierSyncForFingerprint(lawyerId: string, fingerprint: string): boolean {
    return lastSyncedFingerprintByLawyer.get(lawyerId) === fingerprint;
}

export function markDossierSyncFingerprint(lawyerId: string, fingerprint: string): void {
    lastSyncedFingerprintByLawyer.set(lawyerId, fingerprint);
}

export function clearDossierSyncFingerprint(lawyerId: string): void {
    lastSyncedFingerprintByLawyer.delete(lawyerId);
}

export function getLastSyncedDossierFingerprint(lawyerId: string): string | undefined {
    return lastSyncedFingerprintByLawyer.get(lawyerId);
}

/** للاختبارات */
export function resetDossierSyncStateForTests(): void {
    lastSyncedFingerprintByLawyer.clear();
}
