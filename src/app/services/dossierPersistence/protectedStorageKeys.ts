import {
    DOSSIER_WARM_KEYS,
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
} from './dossierStorageKeys';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { QUANTUM_TASKS_STORAGE_KEY } from '@/app/utils/quantumTasksStorage';
import type { BackupDomain } from './dossierPersistenceTypes';

/** مفاتيح مصفوفات المستخدم — يُرفض استبدالها بمصفوفة فارغة */
export const PROTECTED_ARRAY_STORAGE_KEYS = new Set<string>([
    LAWSUIT_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEY,
    ...LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
    ...EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    STORAGE_KEYS.LAWYER_NOTES,
    'hami:community:posts:v1',
    'hami:smartvault:docs:v1',
    'hami:calendar:events:v1',
    'globalNotes',
    'global_notes',
]);

/** مفاتيح كائنات المستخدم — يُرفض استبدالها بـ {} */
export const PROTECTED_OBJECT_STORAGE_KEYS = new Set<string>([
    STORAGE_KEYS.LAWYER_SETTINGS,
    'hami:criminal:store',
    QUANTUM_TASKS_STORAGE_KEY,
]);

/** تُحمَّل من IndexedDB عند الإقلاع قبل أي قراءة/كتابة */
export const PROTECTED_WARM_KEYS = [
    ...DOSSIER_WARM_KEYS,
    STORAGE_KEYS.LAWYER_NOTES,
    STORAGE_KEYS.LAWYER_SETTINGS,
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
    if (key.startsWith('hami:criminal:shard:')) return true;
    return false;
}

export function backupDomainForStorageKey(key: string): BackupDomain | null {
    if (LAWSUIT_KEY_SET.has(key) || key.includes('lawyer_files')) return 'lawsuit';
    if (EXECUTION_KEY_SET.has(key)) return 'execution';
    if (key === STORAGE_KEYS.LAWYER_NOTES || key === 'globalNotes' || key === 'global_notes') return 'notes';
    if (key === 'hami:community:posts:v1') return 'community';
    if (key === 'hami:smartvault:docs:v1') return 'vault';
    if (key === 'hami:calendar:events:v1') return 'calendar';
    if (key === QUANTUM_TASKS_STORAGE_KEY) return 'tasks';
    return null;
}
