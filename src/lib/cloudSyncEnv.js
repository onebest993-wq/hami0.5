/** فحص المزامنة دون استيراد عميل Supabase — يمنع أخطاء الإقلاع عند تعطيل المزامنة */
export function isCloudSyncEnabled() {
    return import.meta.env.VITE_ENABLE_CLOUD_SYNC === 'true';
}
