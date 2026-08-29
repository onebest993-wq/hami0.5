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
    workspacePins: 'hami:workspace:pins:v1',
} as const;

export type StorageDomainKey = (typeof StorageDomainKeys)[keyof typeof StorageDomainKeys];

export const CRIMINAL_CASE_SHARD_PREFIX = 'hami:criminal:case:';

export function isCriminalCaseShardKey(key: string): boolean {
    return key.startsWith(CRIMINAL_CASE_SHARD_PREFIX);
}

/**
 * الجزء الجذر للقضية — أي `hami:criminal:case:<id>` بلا لاحقة.
 *
 * القضايا الكبيرة تُقطَّع إلى `__manifest` و`__p0…` وهي شظايا نصّية لا JSON،
 * فعدّ عناصرها بلا معنى ويُفسد أي حارس يعتمد العدّ.
 */
export function isCriminalCaseShardRootKey(key: string): boolean {
    if (!isCriminalCaseShardKey(key)) return false;
    const suffix = key.slice(CRIMINAL_CASE_SHARD_PREFIX.length);
    return Boolean(suffix) && !suffix.includes('__');
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
