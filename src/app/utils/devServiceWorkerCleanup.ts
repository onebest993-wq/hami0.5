/**
 * في التطوير: إلغاء Service Worker والكاش حتى لا يُقدَّم @vite/client قديم
 * (يسبب فشل WebSocket و ReferenceError من حزم قديمة).
 */
export async function cleanupDevServiceWorkers(): Promise<void> {
    if (!import.meta.env.DEV) return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));

        let cacheCount = 0;
        if ('caches' in window) {
            const keys = await caches.keys();
            cacheCount = keys.length;
            await Promise.all(keys.map((key) => caches.delete(key)));
        }

        if (registrations.length > 0 || cacheCount > 0) {
            console.info('[Hami Dev] تم مسح Service Worker والكاش — أعد تحميل الصفحة مرة واحدة (Ctrl+Shift+R)');
        }
    } catch (error) {
        console.warn('[Hami Dev] تعذّر مسح Service Worker:', error);
    }
}
