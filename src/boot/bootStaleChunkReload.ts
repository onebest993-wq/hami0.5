import { isStaleChunkError, reloadOnceForStaleChunk } from '@/app/utils/lazy/staleChunkError';

/**
 * إعادة تحميل واحدة عند فشل dynamic import بعد نشر جديد.
 *
 * هذا المسار يمسك ما تُطلقه مساعدة التحميل المسبق في Vite وحدها. وما يسقط داخل
 * `import()` نفسه يبلغ `GlobalErrorBoundary` — والمسارَان يتقاسمان ميزانية واحدة.
 */
export function installStaleChunkReload(): void {
    window.addEventListener('vite:preloadError', (event) => {
        const preloadEvent = event as Event & { payload?: { err?: unknown } };
        if (!isStaleChunkError(preloadEvent.payload?.err)) return;
        preloadEvent.preventDefault();
        /*
         * الميزانية مشتركة مع `GlobalErrorBoundary` عبر `reloadOnceForStaleChunk`.
         * كانت هنا نسخة ثانية من نفس المفتاح مكتوبة بيدها — ومفتاحان بنفس الاسم
         * في موضعين يفترقان عند أوّل تعديل على أحدهما.
         */
        if (reloadOnceForStaleChunk()) return;
        if (import.meta.hot) {
            import.meta.hot.invalidate();
        }
    });
}
