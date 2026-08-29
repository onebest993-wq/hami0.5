import {
    DOSSIER_WARM_KEYS,
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
} from './dossierStorageKeys';
import {
    isCriminalCaseShardRootKey,
    StorageDomainKeys,
} from '@/app/infrastructure/persistence/storageDomains';
import type { BackupDomain } from './dossierPersistenceTypes';

// المصدر الواحد لأسماء المفاتيح. كانت مكرّرة هنا كسلاسل حرفية، و`WORKSPACE_STORE_KEY`
// كان يُستورد من وحدة المتجر — ضلع يغلق دائرة استيراد عبر طبقة التخزين كاملة.
const LAWYER_NOTES_STORAGE_KEY = StorageDomainKeys.globalNotes;
const LAWYER_SETTINGS_STORAGE_KEY = StorageDomainKeys.settings;
const QUANTUM_TASKS_STORAGE_KEY = StorageDomainKeys.quantumTasks;
const WORKSPACE_STORE_KEY = StorageDomainKeys.workspacePins;

/** مفاتيح مصفوفات المستخدم — يُرفض استبدالها بمصفوفة فارغة */
export const PROTECTED_ARRAY_STORAGE_KEYS = new Set<string>([
    LAWSUIT_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEY,
    ...LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
    ...EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    LAWYER_NOTES_STORAGE_KEY,
    'hami:community:posts:v1',
    'hami:smartvault:docs:v1',
    /*
     * مستندات المستودع كانت خارج الحماية بالكامل: مصفوفة يملكها المحامي، تُحفظ
     * بنفس مسار الخزنة الذكية، ولا يعرفها الحارس. فكل قراءة فاشلة تُظهر قائمة
     * خالية، وأوّل حفظة بعدها تكتب `[]` فوق المستندات. الخزنة محميّة منذ البداية
     * وهذه نُسِيت — والفرق بينهما اسم المفتاح لا قيمة ما فيه.
     */
    'hami:repository:docs:v1',
    'hami:calendar:events:v1',
    'globalNotes',
    'global_notes',
    'hami:transactions:v1',
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
    StorageDomainKeys.theme,
    StorageDomainKeys.shape,
    StorageDomainKeys.wallpaper,
    WORKSPACE_STORE_KEY,
    'hami:smartvault:docs:v1',
    /*
     * رادار المواعيد على الرئيسية يقرأ `readLocalCalendarSnapshotSync` قبل
     * `PROTECTED_WARM_KEYS`. بلا أحداث التقويم في قشرة الإقلاع يُفرَّغ الرادار.
     * شواهد القبر صغيرة وتُصفّي المحذوف في نفس اللقطة — تُسخَّن معها.
     */
    'hami:calendar:events:v1',
    'hami:calendar:tombstones:v1',
    'hami:smartvault:deleted:v1',
    'hami:repository:deleted:v1',
    'hami:lawyer-notes:deleted:v1',
] as const;

/** تُحمَّل من IndexedDB عند الإقلاع قبل أي قراءة/كتابة */
export const PROTECTED_WARM_KEYS = [
    ...DOSSIER_WARM_KEYS,
    LAWYER_NOTES_STORAGE_KEY,
    LAWYER_SETTINGS_STORAGE_KEY,
    'hami:community:posts:v1',
    'hami:smartvault:docs:v1',
    'hami:repository:docs:v1',
    'hami:calendar:events:v1',
    'hami:lawsuit:dossier-tombstones:v1',
    'hami:calendar:tombstones:v1',
    'hami:community:deleted-ids:v1',
    'hami:smartvault:deleted:v1',
    'hami:repository:deleted:v1',
    'hami:lawyer-notes:deleted:v1',
    'hami:forum:groups:v1',
    'hami:forum:group-members:v1',
    'hami:criminal:store',
    'hami:criminal:card-index',
    QUANTUM_TASKS_STORAGE_KEY,
    'globalNotes',
    'global_notes',
    'hami:transactions:v1',
] as const;

const LAWSUIT_KEY_SET = new Set<string>([
    LAWSUIT_FILES_STORAGE_KEY,
    ...LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
]);

const EXECUTION_KEY_SET = new Set<string>([
    EXECUTION_FILES_STORAGE_KEY,
    ...EXECUTION_FILES_STORAGE_KEYS_LEGACY,
]);

/** شواهد حذف إضابير — قائمة معرّفات؛ الكتابة فوق ciphertext بارد تُعيد المحذوف من السحابة */
export function isDossierTombstonesStorageKey(key: string): boolean {
    if (key === 'hami:lawsuit:dossier-tombstones:v1') return true;
    if (key === 'hami:execution:dossier-tombstones:v1') return true;
    return key.startsWith('hami:execution:dossier-tombstones:v1:');
}

/** شواهد حذف وثائق/ملاحظات — نفس صنف المسح إن هُيِّئت فارغة فوق أصل مشفّر */
export function isDeletedIdsTombstoneStorageKey(key: string): boolean {
    return (
        key === 'hami:smartvault:deleted:v1' ||
        key === 'hami:repository:deleted:v1' ||
        key === 'hami:lawyer-notes:deleted:v1' ||
        key === 'hami:community:deleted-ids:v1' ||
        key === 'hami:calendar:tombstones:v1'
    );
}

export function isProtectedStorageKey(key: string): boolean {
    if (PROTECTED_ARRAY_STORAGE_KEYS.has(key)) return true;
    if (PROTECTED_OBJECT_STORAGE_KEYS.has(key)) return true;
    if (key.includes('lawyer_files')) return true;
    // فهرس التنفيذ حسب المالك: executionFiles:<userId>
    if (key.startsWith(`${EXECUTION_FILES_STORAGE_KEY}:`)) return true;
    if (isDossierTombstonesStorageKey(key)) return true;
    if (isDeletedIdsTombstoneStorageKey(key)) return true;
    /*
     * البادئة الفعلية `hami:criminal:case:` — وكان المكتوب هنا `hami:criminal:shard:`
     * وهي بادئة لا يكتبها أحد. فكل قضية جنائية كانت خارج الحماية بالكامل.
     */
    if (isCriminalCaseShardRootKey(key)) return true;
    return false;
}

/*
 * إشعارات المستخدم (`hami:notifications:v1:<userId>`) عمداً خارج هذه القائمة:
 * حذف آخر إشعار متبقٍ طريقٌ مشروع يكتب `[]` فوق سجلٍّ كان فيه عنصر واحد
 * (notificationStore.removeNotification → saveNotifications). القائمة هنا
 * تُطبَّق أيضاً كحارس رفضٍ في dossierWipeGuard (isArrayKey)، فلا تمييز تلقائي
 * بين «حذف متعمَّد» و«تفريغ غير مقصود» بلا نظام tombstone كالذي تملكه
 * lawyer_notes/smartvault/repository. الإشعارات محتوًى قابل لإعادة التوليد من
 * الخادم عند تفعيل المزامنة — فحماية «رفض الفراغ» هنا كانت لتُعيد بعث إشعارات
 * حذفها المستخدم عمداً بعد كل حذف لآخر عنصر. المفتاح مشفَّر فعلاً (سرّية
 * محتواه محمية) دون هذه الحماية الإضافية غير الملائمة لشكل كتابته.
 */

export function backupDomainForStorageKey(key: string): BackupDomain | null {
    if (LAWSUIT_KEY_SET.has(key) || key.includes('lawyer_files')) return 'lawsuit';
    if (EXECUTION_KEY_SET.has(key) || key.startsWith(`${EXECUTION_FILES_STORAGE_KEY}:`)) {
        return 'execution';
    }
    if (key === LAWYER_NOTES_STORAGE_KEY || key === 'globalNotes' || key === 'global_notes') return 'notes';
    if (key === 'hami:community:posts:v1') return 'community';
    if (key === 'hami:smartvault:docs:v1') return 'vault';
    if (key === 'hami:repository:docs:v1') return 'repository';
    if (key === 'hami:calendar:events:v1') return 'calendar';
    if (key === QUANTUM_TASKS_STORAGE_KEY) return 'tasks';
    return null;
}
