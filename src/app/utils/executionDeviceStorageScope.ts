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
