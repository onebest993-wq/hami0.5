import { STORAGE_KEYS } from '@/app/utils/constants';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';

/** حد أدنى لكلمة مرور حماية نسخة التصدير (بيانات قانونية حساسة) */
export const BACKUP_PASSWORD_MIN_LENGTH = 12;
export const BACKUP_PASSWORD_MAX_LENGTH = 1_024;

/** PBKDF2-SHA256 bounds: accept older exports, reject attacker-controlled work factors. */
export const BACKUP_KDF_ITERATIONS = 600_000;
export const BACKUP_KDF_MIN_ITERATIONS = 100_000;
export const BACKUP_KDF_MAX_ITERATIONS = 1_000_000;

/** Keeps JSON parse + one-shot AES-GCM memory within a mobile-safe envelope. */
export const MAX_BACKUP_FILE_BYTES = 25_000_000;
export const MAX_BACKUP_PLAINTEXT_BYTES = 18_000_000;

export type BackupPasswordValidation =
    | { ok: true }
    | { ok: false; reason: 'empty' | 'too_short' | 'too_long' };

/** يتحقق من كلمة مرور حماية النسخة قبل التشفير. */
export function validateBackupPassword(password: string): BackupPasswordValidation {
    if (!password.trim()) return { ok: false, reason: 'empty' };
    const length = Array.from(password).length;
    if (length < BACKUP_PASSWORD_MIN_LENGTH) return { ok: false, reason: 'too_short' };
    if (length > BACKUP_PASSWORD_MAX_LENGTH) return { ok: false, reason: 'too_long' };
    return { ok: true };
}

/** أقصى عدد مفاتيح في استيراد واحد */
export const MAX_BACKUP_IMPORT_KEYS = 2_000;

/** أقصى حجم إجمالي للقيم المستوردة (حروف) */
export const MAX_BACKUP_IMPORT_VALUE_CHARS = 17_000_000;
const MAX_BACKUP_IMPORT_KEY_LENGTH = 512;

const EXACT_ALLOWED_KEYS = new Set<string>([
    STORAGE_KEYS.LAWYER_FILES,
    STORAGE_KEYS.LAWYER_NOTES,
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_TRASH_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    'executionFiles',
    'globalNotes',
    'global_notes',
    'hami_notes_vault',
    'hami_docs_vault',
    'hami:smartvault:docs:v1',
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
    'execution_',
    'executionFiles:',
    'hami_notes_vault_',
    'hami:urgentActions:v1:',
    'notifications_',
    'vault:docs:',
    'hami:repository:rooms:',
    'hami:smartvault:custom-categories:v1',
] as const;

export function isAllowedBusinessBackupKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    if (key.length > MAX_BACKUP_IMPORT_KEY_LENGTH || /[\u0000-\u001f\u007f]/u.test(key)) return false;
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
    const seen = new Set<string>();
    for (const [key, value] of entries) {
        if (typeof key !== 'string' || typeof value !== 'string') {
            return { ok: false, reason: 'بنية مفتاح/قيمة غير صالحة' };
        }
        if (!isAllowedBusinessBackupKey(key)) {
            return { ok: false, reason: `مفتاح غير مسموح: ${key}` };
        }
        if (seen.has(key)) {
            return { ok: false, reason: `مفتاح مكرر: ${key}` };
        }
        seen.add(key);
        totalChars += value.length;
        if (totalChars > MAX_BACKUP_IMPORT_VALUE_CHARS) {
            return { ok: false, reason: 'حجم البيانات المستوردة كبير جداً' };
        }
        try {
            JSON.parse(value);
        } catch {
            return { ok: false, reason: `قيمة JSON غير صالحة للمفتاح: ${key}` };
        }
    }

    return { ok: true, keyCount: entries.length, totalChars };
}
