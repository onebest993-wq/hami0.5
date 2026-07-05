/**
 * مفاتيح التخزين المحلي التي تُشفَّر عند الراحة (at rest).
 * استثناء: hami:criminal:* — حجم ضخم؛ يُخزَّن مشفراً على مستوى shard لاحقاً أو plaintext للأداء.
 */

/** لا تُشفَّر — حجم أو أداء */
export const NEVER_ENCRYPT_KEYS = new Set<string>([
    'hami:criminal:store',
    '__hami_secure_store_keys__',
    'hami_cache_version',
    /** صورة خلفية كبيرة — plaintext لقراءة sync فورية وعرض CSS */
    'lawyer_wallpaper',
    /** فهرس المخزن — metadata خفيف؛ blobs في IDB منفصل */
    'hami:smartvault:docs:v1',
]);

export const ENCRYPTED_EXACT_KEYS = new Set<string>([
    'lawyer_settings',
    'lawyer_files',
    'lawyer_notes',
    'lawyer_execution_files',
    'lawyer-execution-files',
    'executionFiles',
    'hami:execution-dashboard',
    'hami:case-shares:v1',
]);

export const ENCRYPTED_KEY_PREFIXES = [
    'auth_',
    'token_',
    'session_',
    'wife_',
    'hami:sovereign-quick-note-draft:',
    'hami:device',
    'hami:csrf',
    'hami_notes_sync_map_',
    'garnishment_',
    'client_',
    'lawsuit_',
] as const;

/** تجاوز هذا الحجم → plaintext (يمنع تجمّد PBKDF2/AES على ملفات ضخمة) */
export const ENCRYPT_MAX_BYTES = 512 * 1024;

/** shards القضايا الجنائية — تشفير فقط تحت هذا الحد */
export const CRIMINAL_SHARD_ENCRYPT_MAX_BYTES = 256 * 1024;

export function isNeverEncryptedKey(key: string): boolean {
    if (NEVER_ENCRYPT_KEYS.has(key)) return true;
    return false;
}

export function isCriminalShardKey(key: string): boolean {
    return key.startsWith('hami:criminal:case:') || key === 'hami:criminal:meta';
}

export function isSensitiveStorageKey(key: string): boolean {
    if (isNeverEncryptedKey(key)) return false;
    if (isCriminalShardKey(key)) return true;
    if (ENCRYPTED_EXACT_KEYS.has(key)) return true;
    return ENCRYPTED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function shouldEncryptValue(key: string, value: string): boolean {
    if (!isSensitiveStorageKey(key)) return false;
    const maxBytes = isCriminalShardKey(key) ? CRIMINAL_SHARD_ENCRYPT_MAX_BYTES : ENCRYPT_MAX_BYTES;
    if (value.length > maxBytes) return false;
    return true;
}
