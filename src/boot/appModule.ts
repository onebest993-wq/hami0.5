/** تحميل App — منفصل عن entry الإقلاع لتقليل حجم الـ chunk الأول */
export const appModulePromise = import('@/app/App');
