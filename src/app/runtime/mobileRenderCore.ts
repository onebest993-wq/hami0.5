/**
 * نواة العرض المتنقل — أدوات rAF / لمس سلبي / حراسة GPU منخفضة الاستهلاك.
 * لا تُطبّق will-change بشكل دائم أو داخل حلقات القوائم.
 */

/** جدولة عمل على إطار واحد — متزامن مع معدل تحديث الشاشة */
export function scheduleAnimationFrame(work: FrameRequestCallback): () => void {
    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') {
        work(typeof performance !== 'undefined' ? performance.now() : Date.now());
        return () => undefined;
    }
    const id = requestAnimationFrame(work);
    return () => cancelAnimationFrame(id);
}

/** يدمج تحديثات متعددة في إطار واحد (gestures / scroll measure) */
export function createRafCoalescer(run: () => void): {
    schedule: () => void;
    cancel: () => void;
} {
    let rafId = 0;
    return {
        schedule() {
            if (rafId) return;
            if (typeof requestAnimationFrame !== 'function') {
                run();
                return;
            }
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                run();
            });
        },
        cancel() {
            if (!rafId) return;
            cancelAnimationFrame(rafId);
            rafId = 0;
        },
    };
}

export type PassiveTouchType = 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel';

/**
 * مستمع لمس سلبي — لا يمنع التمرير الأصلي على الهاتف.
 * استخدم passive:false فقط عند preventDefault الضروري (مثل pinch-zoom).
 */
export function addPassiveTouchListener(
    target: EventTarget,
    type: PassiveTouchType,
    listener: EventListenerOrEventListenerObject,
    options?: { capture?: boolean },
): () => void {
    const opts: AddEventListenerOptions = {
        passive: true,
        capture: options?.capture === true,
    };
    target.addEventListener(type, listener, opts);
    return () => target.removeEventListener(type, listener, opts);
}

/** طبقة تسريع لحظية أثناء الإيماءة فقط — تُزال فوراً بعد الإفلات */
export function markGpuHot(el: HTMLElement | null, hot: boolean): void {
    if (!el) return;
    if (hot) el.dataset.hamiGpuHot = '1';
    else delete el.dataset.hamiGpuHot;
}

/** عتبة افتراضية لقوائم الأرشيف — أقل على الأجهزة المتواضعة */
export function resolveArchiveVirtualThreshold(): number {
    if (typeof document !== 'undefined' && document.documentElement.dataset.hamiLite === '1') {
        return 8;
    }
    return 16;
}

export function shouldVirtualizeArchiveList(itemCount: number): boolean {
    return itemCount >= resolveArchiveVirtualThreshold();
}
