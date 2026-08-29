/**
 * المؤقّت العالميّ: يتوقّف عند الخفاء، ويعود بعد ذاكرة الصفحة.
 *
 * النمط المكتوب بيده في الموضعين كان يُزيل المؤقّت على `pagehide` بـ`{ once: true }`
 * ولا يُعيده. والعودة من ذاكرة الصفحة تستأنف الوحدات كما كانت — فلا تُنشأ من جديد
 * ولا يُركَّب المؤقّت. فيبقى التنظيف موقوفاً لبقيّة الجلسة والخرائط تنمو بلا حدّ.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startBackgroundInterval } from '../backgroundInterval';

const KEY = '__hamiTestBackgroundIntervalStop';

function setHidden(hidden: boolean): void {
    Object.defineProperty(document, 'hidden', {
        value: hidden,
        configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
}

describe('startBackgroundInterval', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setHidden(false);
    });

    afterEach(() => {
        (window as unknown as Record<string, (() => void) | undefined>)[KEY]?.();
        vi.useRealTimers();
    });

    it('ينبض دورياً حين تكون الصفحة ظاهرة', () => {
        const tick = vi.fn();
        startBackgroundInterval({ globalKey: KEY, intervalMs: 1000, tick });

        vi.advanceTimersByTime(3000);
        expect(tick).toHaveBeenCalledTimes(3);
    });

    it('يتوقّف عن النبض حين تُخفى الصفحة — لا بطارية في عملٍ لا يراه أحد', () => {
        const tick = vi.fn();
        startBackgroundInterval({ globalKey: KEY, intervalMs: 1000, tick });

        vi.advanceTimersByTime(1000);
        expect(tick).toHaveBeenCalledTimes(1);

        setHidden(true);
        vi.advanceTimersByTime(10_000);
        expect(tick).toHaveBeenCalledTimes(1);
    });

    it('يستأنف عند العودة للظهور، وينجز ما تراكم مرّة واحدة', () => {
        const tick = vi.fn();
        startBackgroundInterval({ globalKey: KEY, intervalMs: 1000, tick, runOnResume: true });

        setHidden(true);
        vi.advanceTimersByTime(5000);
        expect(tick).toHaveBeenCalledTimes(0);

        setHidden(false);
        expect(tick).toHaveBeenCalledTimes(1); // نبضة العودة

        vi.advanceTimersByTime(2000);
        expect(tick).toHaveBeenCalledTimes(3);
    });

    it('يعود بعد ذاكرة الصفحة — وهذا موضع العطل في النمط القديم', () => {
        const tick = vi.fn();
        startBackgroundInterval({ globalKey: KEY, intervalMs: 1000, tick });

        window.dispatchEvent(new Event('pagehide'));
        vi.advanceTimersByTime(5000);
        expect(tick).toHaveBeenCalledTimes(0);

        window.dispatchEvent(new Event('pageshow'));
        vi.advanceTimersByTime(2000);
        // النمط القديم كان يبقى صفراً إلى الأبد هنا
        expect(tick).toHaveBeenCalledTimes(2);
    });

    it('تركيبٌ ثانٍ بنفس المفتاح يُوقف الأوّل — لا مضاعفة عمل', () => {
        const first = vi.fn();
        const second = vi.fn();
        startBackgroundInterval({ globalKey: KEY, intervalMs: 1000, tick: first });
        startBackgroundInterval({ globalKey: KEY, intervalMs: 1000, tick: second });

        vi.advanceTimersByTime(2000);
        expect(first).toHaveBeenCalledTimes(0);
        expect(second).toHaveBeenCalledTimes(2);
    });

    it('الإيقاف يُزيل المستمعين — لا يُستأنف بعده شيء', () => {
        const tick = vi.fn();
        const stop = startBackgroundInterval({ globalKey: KEY, intervalMs: 1000, tick });
        stop();

        window.dispatchEvent(new Event('pageshow'));
        setHidden(false);
        vi.advanceTimersByTime(5000);
        expect(tick).toHaveBeenCalledTimes(0);
    });
});
