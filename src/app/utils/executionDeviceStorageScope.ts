import { resolveLiveAuthUserIdForStorage } from '@/app/utils/liveAuthUserId';
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';

/** مفاتيح إضبارة غير مقيّدة بـ`:u:` — إخفاؤها عند وجود جلسة يمنع تسرّب حساب قديم */
const UNSCOPED_HIDDEN_WHEN_SIGNED_IN_PREFIXES = [
    'execution_',
    'garnishment_',
    'hami_garnishment_',
    'hami_unified_funds_ledger_',
    'hami_party_badges_hidden_',
    'hami_eviction_grace_',
    'hami:employee_personal_unlock',
] as const;

function isUnscopedExecutionBlobKey(key: string): boolean {
    return UNSCOPED_HIDDEN_WHEN_SIGNED_IN_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * يقيّد مفاتيح التخزين المحلي/الجلسة بمستخدم الجلسة الحية عند توفره —
 * يقلل تسرّب تفضيلات محضر/قفل تبويب بين حسابات على نفس الجهاز.
 * عند غياب المستخدم يُبقى المفتاح كما هو (توافق خلفي).
 *
 * المصدر: AuthContext عبر liveAuthUserId — ليس AuthService الزومبي.
 */
export function scopeExecutionDeviceStorageKey(baseKey: string): string {
    const base = String(baseKey ?? '').trim();
    if (!base) return '';
    const uid = String(resolveLiveAuthUserIdForStorage() ?? '').trim();
    if (!uid) return base;
    if (base.includes(`:u:${uid}`)) return base;
    return `${base}:u:${uid}`;
}

/** يزيل لاحقة :u:{userId} إن وُجدت */
export function stripExecutionDeviceStorageUserScope(key: string): string {
    const k = String(key ?? '').trim();
    const m = k.match(/^(.+):u:[^:]+$/);
    return m ? m[1]! : k;
}

/**
 * هل يجوز لجلسة المستخدم الحالية قراءة هذا المفتاح؟
 *
 * المفاتيح المقيّدة بـ`:u:{uid}` تخص مالكها فقط. كان المسح يمرّ على
 * `listKeysSync()` بلا فلتر فيُعيد بيانات حساب آخر على نفس الجهاز.
 * كتل الإضبارة غير المقيّدة تُخفى عند وجود جلسة حيّة حتى لا يتسرّب حساب قديم.
 * القراءة الصريحة بالمعرّف المنطقي ما زالت عبر `readScopedDeviceStorageItem`.
 */
export function isStorageKeyVisibleToCurrentUser(key: string): boolean {
    const k = String(key ?? '').trim();
    if (!k) return false;
    const live = String(resolveLiveAuthUserIdForStorage() ?? '').trim();
    const m = k.match(/:u:([^:]+)$/);
    if (m) {
        const owner = String(m[1] ?? '').trim();
        if (!owner || !live) return false;
        return owner === live;
    }
    if (k.startsWith(`${EXECUTION_FILES_STORAGE_KEY}:`)) {
        if (!live) return false;
        return k === `${EXECUTION_FILES_STORAGE_KEY}:${live}`;
    }
    if (k === EXECUTION_FILES_STORAGE_KEY) {
        return !live;
    }
    if (live && isUnscopedExecutionBlobKey(k)) return false;
    return true;
}

/**
 * قراءة مع ترحيل آمن:
 * - المفتاح المقيّد أولاً
 * - إن وُجدت جلسة حيّة: لا نُعيد غير المقيّد لحساب آخر دون ترحيل —
 *   ننسخ إلى المقيّد ثم نحذف القديم (ملكية الجهاز الحالي فقط)
 * - بلا جلسة: التوافق الخلفي عبر غير المقيّد كما كان
 */
export function readScopedDeviceStorageItem(
    getItem: (key: string) => string | null,
    baseKey: string,
    opts?: {
        setItem?: (key: string, value: string) => void;
        removeItem?: (key: string) => void;
    },
): string | null {
    const unscoped = stripExecutionDeviceStorageUserScope(baseKey);
    const scoped = scopeExecutionDeviceStorageKey(unscoped);
    if (!scoped) return null;
    const primary = getItem(scoped);
    if (primary != null && primary !== '') return primary;
    if (scoped === unscoped) return primary;

    const legacy = getItem(unscoped);
    if (legacy == null || legacy === '') return primary;

    // جلسة حية: ترحيل لمرة ثم إزالة غير المقيّد حتى لا يقرأه حساب لاحق
    if (opts?.setItem) {
        try {
            opts.setItem(scoped, legacy);
        } catch {
            /* إن فشل الترحيل نُبقي القراءة لجلسة المالك الحالي فقط دون نشر */
        }
    }
    if (opts?.removeItem) {
        try {
            opts.removeItem(unscoped);
        } catch {
            /* ignore */
        }
    }
    return legacy;
}
