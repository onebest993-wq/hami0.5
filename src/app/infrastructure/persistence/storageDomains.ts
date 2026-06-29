/**
 * مفاتيح التخزين المعروفة — مصدر واحد للحقيقة لأسماء الم domains.
 * استخدم HamiStorage.json.* للبيانات المنظّمة؛ HamiStorage.secure.* للنص الخام المشفّر.
 */
export const StorageDomainKeys = {
    settings: 'lawyer_settings',
    theme: 'lawyer_theme',
    shape: 'lawyer_shape',
    wallpaper: 'lawyer_wallpaper',
    lawsuitFiles: 'lawyer_files',
    executionFiles: 'executionFiles',
    globalNotes: 'lawyer_notes',
    quantumTasks: 'hami_quantum_legal_tasks_v1',
    criminalStore: 'hami:criminal:store',
    criminalMeta: 'hami:criminal:meta',
    notifications: 'hami_notifications_v2',
} as const;

export type StorageDomainKey = (typeof StorageDomainKeys)[keyof typeof StorageDomainKeys];

export function isCriminalCaseShardKey(key: string): boolean {
    return key.startsWith('hami:criminal:case:');
}

export function isHeavyPersistKey(key: string): boolean {
    if (key === StorageDomainKeys.executionFiles) return true;
    if (key === StorageDomainKeys.lawsuitFiles) return true;
    if (key === StorageDomainKeys.globalNotes) return true;
    if (key === StorageDomainKeys.criminalMeta) return true;
    if (key === StorageDomainKeys.quantumTasks) return true;
    if (isCriminalCaseShardKey(key)) return true;
    return false;
}
