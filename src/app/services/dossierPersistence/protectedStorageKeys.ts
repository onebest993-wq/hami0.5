import {
    DOSSIER_WARM_KEYS,
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
} from './dossierStorageKeys';
import type { BackupDomain } from './dossierPersistenceTypes';

const LAWYER_NOTES_STORAGE_KEY = 'lawyer_notes';
const LAWYER_SETTINGS_STORAGE_KEY = 'lawyer_settings';
const QUANTUM_TASKS_STORAGE_KEY = 'hami_quantum_legal_tasks_v1';

/** مفاتيح مصفوفات المستخدم — يُرفض استبدالها بمصفوفة فارغة */
export const PROTECTED_ARRAY_STORAGE_KEYS = new Set<string>([
    LAWSUIT_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEY,
    ...LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
    ...EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    LAWYER_NOTES_STORAGE_KEY,
    'hami:community:posts:v1',
    'hami:smartvault:docs:v1',
    'hami:calendar:events:v1',
    'globalNotes',
    'global_notes',
]);

/** مفاتيح كائنات المستخدم — يُرفض استبدالها بـ {} */
export const PROTECTED_OBJECT_STORAGE_KEYS = new Set<string>([
    LAWYER_SETTINGS_STORAGE_KEY,
    'hami:criminal:store',
    QUANTUM_TASKS_STORAGE_KEY,
]);

/** مفاتيح الواجهة الرئيسية — تُحمَّل قبل أول إطار (بدون إضابير ثقيلة) */
export const BOOT_SHELL_WARM_KEYS = [
    LAWYER_SETTINGS_STORAGE_KEY,
    'lawyer_theme',
    'lawyer_shape',
    'hami:smartvault:docs:v1',
] as const;

/** تُحمَّل من IndexedDB عند الإقلاع قبل أي قراءة/كتابة */
export const PROTECTED_WARM_KEYS = [
    ...DOSSIER_WARM_KEYS,
    LAWYER_NOTES_STORAGE_KEY,
    LAWYER_SETTINGS_STORAGE_KEY,
    'hami:community:posts:v1',
    'hami:smartvault:docs:v1',
    'hami:calendar:events:v1',
    'hami:criminal:store',
    QUANTUM_TASKS_STORAGE_KEY,
    'globalNotes',
    'global_notes',
] as const;

const LAWSUIT_KEY_SET = new Set<string>([
    LAWSUIT_FILES_STORAGE_KEY,
    ...LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
]);

const EXECUTION_KEY_SET = new Set<string>([
    EXECUTION_FILES_STORAGE_KEY,
    ...EXECUTION_FILES_STORAGE_KEYS_LEGACY,
]);

export function isProtectedStorageKey(key: string): boolean {
    if (PROTECTED_ARRAY_STORAGE_KEYS.has(key)) return true;
    if (PROTECTED_OBJECT_STORAGE_KEYS.has(key)) return true;
    if (key.includes('lawyer_files')) return true;
    // فهرس التنفيذ حسب المالك: executionFiles:<userId>
    if (key.startsWith(`${EXECUTION_FILES_STORAGE_KEY}:`)) return true;
    if (key.startsWith('hami:criminal:shard:')) return true;
    return false;
}

export function backupDomainForStorageKey(key: string): BackupDomain | null {
    if (LAWSUIT_KEY_SET.has(key) || key.includes('lawyer_files')) return 'lawsuit';
    if (EXECUTION_KEY_SET.has(key) || key.startsWith(`${EXECUTION_FILES_STORAGE_KEY}:`)) {
        return 'execution';
    }
    if (key === LAWYER_NOTES_STORAGE_KEY || key === 'globalNotes' || key === 'global_notes') return 'notes';
    if (key === 'hami:community:posts:v1') return 'community';
    if (key === 'hami:smartvault:docs:v1') return 'vault';
    if (key === 'hami:calendar:events:v1') return 'calendar';
    if (key === QUANTUM_TASKS_STORAGE_KEY) return 'tasks';
    return null;
}
