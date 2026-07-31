import { STORAGE_KEYS } from '@/app/utils/constants';

/** حد أدنى لكلمة مرور حماية نسخة التصدير (بيانات قانونية حساسة) */
export const BACKUP_PASSWORD_MIN_LENGTH = 12;

export type BackupPasswordValidation =
    | { ok: true }
    | { ok: false; reason: 'empty' | 'too_short' };

/** يتحقق من كلمة مرور حماية النسخة قبل التشفير. */
export function validateBackupPassword(password: string): BackupPasswordValidation {
    const trimmed = password.trim();
    if (!trimmed) return { ok: false, reason: 'empty' };
    if (trimmed.length < BACKUP_PASSWORD_MIN_LENGTH) return { ok: false, reason: 'too_short' };
    return { ok: true };
}

/** أقصى عدد مفاتيح في استيراد واحد */
export const MAX_BACKUP_IMPORT_KEYS = 500;

/** أقصى حجم إجمالي للقيم المستوردة (حروف) */
export const MAX_BACKUP_IMPORT_VALUE_CHARS = 30_000_000;

const EXACT_ALLOWED_KEYS = new Set<string>([
    STORAGE_KEYS.LAWYER_FILES,
    STORAGE_KEYS.LAWYER_NOTES,
    'executionFiles',
    'globalNotes',
    'global_notes',
    'hami_notes_vault',
    'hami_docs_vault',
]);

/** مفاتيح lawyer_* المسموحة — بيانات أعمال فقط، لا إعدادات/مظهر */
const ALLOWED_LAWYER_PREFIX_KEYS = new Set<string>([
    STORAGE_KEYS.LAWYER_FILES,
    STORAGE_KEYS.LAWYER_NOTES,
    STORAGE_KEYS.LAWYER_EXECUTION_FILES,
]);

/** ممنوع استيرادها — تغيّر الأمان والمظهر دون علم المستخدم */
const BLOCKED_BACKUP_KEYS = new Set<string>([
    STORAGE_KEYS.LAWYER_SETTINGS,
    'lawyer_theme',
    'lawyer_shape',
    'lawyer_wallpaper',
]);

const ALLOWED_PREFIXES = [
    'hami_notes_vault_',
    'hami:urgentActions:v1:',
    'notifications_',
    'vault:docs:',
] as const;

export function isAllowedBusinessBackupKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    if (BLOCKED_BACKUP_KEYS.has(key)) return false;
    if (EXACT_ALLOWED_KEYS.has(key)) return true;
    if (ALLOWED_LAWYER_PREFIX_KEYS.has(key)) return true;
    return ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export type BackupImportValidation =
    | { ok: true; keyCount: number; totalChars: number }
    | { ok: false; reason: string };

export function validateBusinessBackupImport(entries: Array<[string, string]>): BackupImportValidation {
    if (!Array.isArray(entries) || entries.length === 0) {
        return { ok: false, reason: 'النسخة فارغة' };
    }
    if (entries.length > MAX_BACKUP_IMPORT_KEYS) {
        return { ok: false, reason: `عدد المفاتيح (${entries.length}) يتجاوز الحد المسموح` };
    }

    let totalChars = 0;
    for (const [key, value] of entries) {
        if (typeof key !== 'string' || typeof value !== 'string') {
            return { ok: false, reason: 'بنية مفتاح/قيمة غير صالحة' };
        }
        if (!isAllowedBusinessBackupKey(key)) {
            return { ok: false, reason: `مفتاح غير مسموح: ${key}` };
        }
        totalChars += value.length;
        if (totalChars > MAX_BACKUP_IMPORT_VALUE_CHARS) {
            return { ok: false, reason: 'حجم البيانات المستوردة كبير جداً' };
        }
    }

    return { ok: true, keyCount: entries.length, totalChars };
}
