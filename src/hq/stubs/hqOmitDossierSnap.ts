/** بديل بناء المقر — نسخ إضابير المحامي المحلية ليست سطح المقر. */
export async function listDossierBackups(): Promise<never[]> {
    return [];
}

export async function readLatestDossierBackup(): Promise<null> {
    return null;
}

export async function writeDossierBackup(): Promise<void> {
    /* HQ product excludes lawyer dossier snapshots */
}
