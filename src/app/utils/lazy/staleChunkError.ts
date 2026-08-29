/**
 * تمييز عطل «المقطع البائت» — مشتركة بين مُحمِّل الكسل وحدّ الأخطاء العالمي.
 *
 * بعد كل نشرة تتغيّر بصمات أسماء المقاطع. ومن كان التطبيق مفتوحاً عنده يحمل
 * `index.html` قديماً يطلب ملفاً لم يبقَ على الخادم — فيسقط `import()` بـ٤٠٤.
 * وهذا لا يُشفى بإعادة الرسم: الملفّ غير موجود، وإعادة المحاولة تطلب العنوان
 * الميت نفسه. شفاؤه الوحيد إعادة تحميل الصفحة لتجلب `index.html` الجديد.
 *
 * لماذا وحدة مستقلّة بعلامة صريحة بدل مطابقة نصّ الرسالة:
 *
 * `lazyWithRetry` كان يستبدل رسالة العطل الأصلية برسالة عربية عامّة في الإنتاج
 * («فشل في تحميل المكون…»). وحدّ الأخطاء العالمي كان يتحقّق من العطل بمطابقة
 * `/Failed to fetch dynamically imported module/` على `error.message`. فالرسالة
 * التي يبحث عنها كانت قد أُتلفت قبل أن تبلغه — كشفٌ ميت في الإنتاج بالكامل،
 * وأخضرُ في التطوير حيث تُحفظ الرسالة الأصلية.
 *
 * العلامة تنجو من أي ترجمة أو إعادة تغليف، فلا يعود الكشف رهناً بنصٍّ يُعرَض
 * للمستخدم — والنصّ يتغيّر لأسباب لغوية لا علاقة لها بالتشخيص.
 */

const STALE_CHUNK_FLAG = '__hamiStaleChunk';

/** مفتاح واحد لميزانية إعادة التحميل — يمنع تسابق مسارَي الاستشفاء على reload مزدوج */
export const STALE_CHUNK_RELOAD_KEY = 'hami:vite-stale-import-reload';

export function isDynamicImportFetchMessage(message: string): boolean {
    return (
        /Failed to fetch dynamically imported module/i.test(message) ||
        /Importing a module script failed/i.test(message) ||
        /error loading dynamically imported module/i.test(message) ||
        /Loading chunk \d+ failed/i.test(message)
    );
}

/**
 * Vite HMR يحدّث المستورِد قبل المصدر فيطلب `export` لم يُربَط بعد.
 * المتصفح يرمي SyntaxError عند الربط، و`React.lazy` يحتفظ بالوعد المرفوض —
 * إعادة الرسم لا تشفي. شفاؤه الوحيد إعادة تحميل الصفحة.
 */
export function isNamedExportMismatchMessage(message: string): boolean {
    return /does not provide an export named/i.test(message);
}

/** يضع علامة دائمة على العطل قبل أي إعادة تغليف أو ترجمة */
export function markStaleChunkError<T extends Error>(error: T): T {
    try {
        Object.defineProperty(error, STALE_CHUNK_FLAG, {
            value: true,
            enumerable: false,
            configurable: true,
        });
    } catch {
        /* كائن مُجمَّد — تبقى مطابقة الرسالة وسبب السلسلة */
    }
    return error;
}

/** العلامة أوّلاً، ثم الرسالة، ثم سلسلة الأسباب — أيّها كفى */
export function isStaleChunkError(error: unknown): boolean {
    if (!error) return false;
    if (typeof error === 'object' && (error as Record<string, unknown>)[STALE_CHUNK_FLAG] === true) {
        return true;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (isDynamicImportFetchMessage(message) || isNamedExportMismatchMessage(message)) return true;

    const cause = error instanceof Error ? (error.cause as unknown) : null;
    if (cause && cause !== error) return isStaleChunkError(cause);
    return false;
}

/**
 * إعادة تحميل واحدة لكل جلسة. الميزانية شرط لا تحسين: بلا حدٍّ تصير الصفحة
 * حلقة تحميل لا نهائية إن كان سبب السقوط انقطاع شبكة لا نشرةً جديدة.
 */
export function reloadOnceForStaleChunk(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        if (sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)) return false;
        sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, '1');
    } catch {
        /*
         * التخزين محجوب (تصفّح خاصّ أو حصّة ممتلئة). لا ميزانية يمكن حفظها، فلا
         * إعادة تحميل تلقائية — زرّ الاستشفاء اليدويّ يبقى المخرج. حلقةٌ لا نهائية
         * أسوأ من شاشة خطأ فيها زرّ يعمل.
         */
        return false;
    }
    window.location.reload();
    return true;
}
