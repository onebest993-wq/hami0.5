/**
 * إعادة تحميل واحدة عند فشل dynamic import بعد نشر جديد.
 */
export function installStaleChunkReload(): void {
    const STALE_IMPORT_RELOAD_KEY = 'hami:vite-stale-import-reload';

    window.addEventListener('vite:preloadError', (event) => {
        const preloadEvent = event as Event & { payload?: { err?: unknown } };
        const err = preloadEvent.payload?.err;
        const msg = err instanceof Error ? err.message : String(err ?? '');
        if (!/Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
            return;
        }
        preloadEvent.preventDefault();
        try {
            if (!sessionStorage.getItem(STALE_IMPORT_RELOAD_KEY)) {
                sessionStorage.setItem(STALE_IMPORT_RELOAD_KEY, '1');
                window.location.reload();
                return;
            }
        } catch {
            /* ignore */
        }
        if (import.meta.hot) {
            import.meta.hot.invalidate();
        }
    });
}
