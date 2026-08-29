/**
 * المقطع البائت بعد النشر — الكشف كان معطّلاً في الإنتاج بالكامل.
 *
 * السلسلة كانت: `lazyWithRetry` يستبدل رسالة العطل الإنجليزية برسالة عربية عامّة
 * في الإنتاج، ثم `GlobalErrorBoundary` يكشف العطل بمطابقة الرسالة الإنجليزية على
 * `error.message`. فالدليل يُتلَف قبل أن يبلغ من يبحث عنه.
 *
 * الأثر: بعد كل نشرة، من كان التطبيق مفتوحاً عنده يطلب مقطعاً حُذف من الخادم،
 * فيهبط على شاشة «حدث خطأ غير متوقع» وزرّها يُعيد الرسم — فيطلب العنوان الميت
 * نفسه ويسقط مرّة أخرى، بلا مخرج إلّا إغلاق التطبيق قسراً.
 *
 * والاختبار يثبت الأمرين: أن العلامة تنجو من الترجمة، وأن الميزانية لا تسمح
 * بحلقة إعادة تحميل.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    isNamedExportMismatchMessage,
    isStaleChunkError,
    markStaleChunkError,
    reloadOnceForStaleChunk,
    STALE_CHUNK_RELOAD_KEY,
} from '../staleChunkError';

const VITE_MESSAGE = 'Failed to fetch dynamically imported module: /assets/Foo-a1b2c3.js';
const ARABIC_GENERIC = 'فشل في تحميل المكون. تأكد من الاتصال ثم أعد المحاولة.';

describe('كشف المقطع البائت', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('يكشف الرسالة الأصلية من Vite', () => {
        expect(isStaleChunkError(new Error(VITE_MESSAGE))).toBe(true);
        expect(isStaleChunkError(new Error('Importing a module script failed'))).toBe(true);
    });

    it('العلامة تنجو حين تُستبدل الرسالة بترجمة عامّة — وهذا موضع العطل', () => {
        const translated = markStaleChunkError(new Error(ARABIC_GENERIC));
        // بلا العلامة: مطابقة النصّ تفشل، والحدّ العالمي لا يعرف أنه مقطع بائت
        expect(/Failed to fetch/i.test(translated.message)).toBe(false);
        expect(isStaleChunkError(translated)).toBe(true);
    });

    it('سلسلة الأسباب تكفي وحدها إن تعذّرت العلامة', () => {
        const wrapped = new Error(ARABIC_GENERIC);
        wrapped.cause = new Error(VITE_MESSAGE);
        expect(isStaleChunkError(wrapped)).toBe(true);
    });

    it('يكشف تصدير HMR الناقص — إعادة الرسم لا تشفيه', () => {
        const message =
            "SyntaxError: The requested module '/src/app/components/admin/hqFormat.ts' does not provide an export named 'formatHqDateTime'";
        expect(isNamedExportMismatchMessage(message)).toBe(true);
        expect(isStaleChunkError(new Error(message))).toBe(true);
    });

    it('لا يخلط عطلاً عادياً بالمقطع البائت', () => {
        expect(isStaleChunkError(new Error('Cannot read properties of undefined'))).toBe(false);
        expect(isStaleChunkError(new Error(ARABIC_GENERIC))).toBe(false);
        expect(isNamedExportMismatchMessage('Cannot read properties of undefined')).toBe(false);
        expect(isStaleChunkError(null)).toBe(false);
        expect(isStaleChunkError(undefined)).toBe(false);
    });

    it('العلامة لا تُورَّث بين كائنات مختلفة', () => {
        markStaleChunkError(new Error('first'));
        expect(isStaleChunkError(new Error('second'))).toBe(false);
    });
});

describe('ميزانية إعادة التحميل', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('تُعيد التحميل مرّة واحدة ثم تتوقّف — لا حلقة', () => {
        const reload = vi.fn();
        const original = window.location;
        Object.defineProperty(window, 'location', {
            value: { ...original, reload },
            writable: true,
            configurable: true,
        });

        expect(reloadOnceForStaleChunk()).toBe(true);
        expect(reload).toHaveBeenCalledTimes(1);
        expect(sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)).toBe('1');

        // المحاولة الثانية في الجلسة نفسها تُرفض — وإلّا دارت الصفحة بلا نهاية
        expect(reloadOnceForStaleChunk()).toBe(false);
        expect(reload).toHaveBeenCalledTimes(1);

        Object.defineProperty(window, 'location', {
            value: original,
            writable: true,
            configurable: true,
        });
    });
});
