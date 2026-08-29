type BusinessBackupEngine = {
    backup: typeof import('@/app/services/settings/businessBackup');
    security: typeof import('@/app/services/settings/businessBackupSecurity');
};

let backupEnginePromise: Promise<BusinessBackupEngine> | null = null;

export function prefetchBusinessBackupEngine(): void {
    void loadBusinessBackupEngine();
}

export function loadBusinessBackupEngine(): Promise<BusinessBackupEngine> {
    backupEnginePromise ??= Promise.all([
        import('@/app/services/settings/businessBackup'),
        import('@/app/services/settings/businessBackupSecurity'),
    ]).then(([backup, security]) => ({ backup, security }));
    return backupEnginePromise;
}
