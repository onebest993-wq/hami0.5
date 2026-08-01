import { resolveLiveAuthUserIdForStorage } from '@/app/utils/liveAuthUserId';

/**
 * يقيّد مفاتيح التخزين المحلي/الجلسة بمستخدم الجلسة الحية عند توفره —
 * يقلل تسرّب تفضيلات محضر/قفل تبويب بين حسابات على نفس الجهاز.
 * عند غياب المستخدم يُبقى المفتاح كما هو (توافق خلفي).
 *
 * المصدر: AuthContext عvia liveAuthUserId — ليس AuthService الزومبي.
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
 * المفاتيح غير المقيّدة (ترحيل قديم) تبقى مرئية — إزالتها تحتاج ترحيلاً منفصلاً.
 */
export function isStorageKeyVisibleToCurrentUser(key: string): boolean {
    const k = String(key ?? '').trim();
    if (!k) return false;
    const m = k.match(/:u:([^:]+)$/);
    if (!m) return true;
    const owner = String(m[1] ?? '').trim();
    if (!owner) return false;
    const live = String(resolveLiveAuthUserIdForStorage() ?? '').trim();
    if (!live) return false;
    return owner === live;
}

/** قراءة مع ترحيل: المفتاح المقيّد أولاً ثم القديم */
export function readScopedDeviceStorageItem(
    getItem: (key: string) => string | null,
    baseKey: string,
): string | null {
    const unscoped = stripExecutionDeviceStorageUserScope(baseKey);
    const scoped = scopeExecutionDeviceStorageKey(unscoped);
    if (!scoped) return null;
    const primary = getItem(scoped);
    if (primary != null && primary !== '') return primary;
    if (scoped !== unscoped) {
        const legacy = getItem(unscoped);
        if (legacy != null && legacy !== '') return legacy;
    }
    return primary;
}
