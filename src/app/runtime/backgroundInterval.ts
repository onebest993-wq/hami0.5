/**
 * مؤقّت دوريّ عالميّ يحترم خفاء الصفحة ويعود بعد ذاكرة الصفحة.
 *
 * كان المؤقّتان العالميّان (تنظيف كاش التخزين، وتنظيف حدّ الطلبات) يُكتبان بيدهما
 * بنفس النمط، وفيه عطلان:
 *
 * ١) `pagehide` بـ`{ once: true }` يُزيل المؤقّت ولا يُعيده. والعودة من ذاكرة
 *    الصفحة (`pageshow` مع `persisted`) لا تُنشئ الوحدات من جديد — الصفحة تُستأنف
 *    كما كانت. فيبقى التنظيف موقوفاً لبقيّة الجلسة، وتنمو الخرائط في الذاكرة بلا
 *    حدّ حتى إعادة تحميل. عطلٌ صامت: لا خطأ يظهر، إنما استهلاك ذاكرة يتراكم.
 *
 * ٢) `pagehide` لا يُطلَق أصلاً حين يُخفى تطبيق Capacitor إلى الخلفية على أندرويد
 *    — الذي يُطلَق هو `visibilitychange`. فيبقى المؤقّت يعمل والتطبيق مُخفى،
 *    يستهلك بطارية في عملٍ لا يراه أحد. والمتصفّحات تُبطّئ مؤقّتات الخلفية فتُخفّف
 *    الأثر، لكنها لا تُلغيه ولا يُعتمد عليها.
 *
 * والإيقاف عند الخفاء آمن هنا: كلا المُستهلكَين ينظّف مدخلات انتهت مدّتها،
 * وانتهاء المدّة يُفحَص عند القراءة أيضاً. فالتأجيل لا يُنتج قراءة بائتة.
 */

type Stop = () => void;

export interface BackgroundIntervalOptions {
    /** اسم يُميّز المؤقّت على `window` فلا يتكرّر عبر HMR أو استيراد مزدوج */
    readonly globalKey: string;
    readonly intervalMs: number;
    readonly tick: () => void;
    /** تشغيل فوريّ عند العودة للظهور — للمُستهلك الذي تراكم عليه عملٌ أثناء الخفاء */
    readonly runOnResume?: boolean;
}

export function startBackgroundInterval(options: BackgroundIntervalOptions): Stop {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return () => undefined;
    }

    const registry = window as unknown as Record<string, Stop | undefined>;
    /* نسخة سابقة من نفس المؤقّت تُوقَف أوّلاً — الاستيراد المزدوج لا يُضاعف العمل */
    registry[options.globalKey]?.();

    let timerId: number | null = null;

    const stopTimer = () => {
        if (timerId !== null) {
            window.clearInterval(timerId);
            timerId = null;
        }
    };

    const startTimer = () => {
        if (timerId !== null) return;
        timerId = window.setInterval(options.tick, options.intervalMs);
    };

    const onVisibility = () => {
        if (document.hidden) {
            stopTimer();
            return;
        }
        if (timerId === null && options.runOnResume) {
            /* عملٌ تراكم أثناء الخفاء يُنجَز مرّة قبل استئناف الدورية */
            try {
                options.tick();
            } catch {
                /* فشل التنظيف لا يجوز أن يمنع استئناف المؤقّت */
            }
        }
        startTimer();
    };

    /*
     * `pageshow` يُستأنف بعد ذاكرة الصفحة، و`pagehide` يُوقف — وليس `{ once: true }`:
     * الدورة قد تتكرّر مرّات في جلسة واحدة على الهاتف.
     */
    const onPageHide = () => stopTimer();
    const onPageShow = () => {
        if (!document.hidden) startTimer();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    if (!document.hidden) startTimer();

    const stop: Stop = () => {
        stopTimer();
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('pagehide', onPageHide);
        window.removeEventListener('pageshow', onPageShow);
        if (registry[options.globalKey] === stop) registry[options.globalKey] = undefined;
    };

    registry[options.globalKey] = stop;
    return stop;
}
