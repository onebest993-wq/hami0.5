/**
 * بوّابة المقدّمة للاتصالات الدائمة — SSE وWebSocket.
 *
 * `useVisibilityAwareInterval` و`startBackgroundInterval` يحلّان المؤقّتات الدورية،
 * لكن الاتصال الدائم ليس مؤقّتاً: لا يوجد ما يُفرَّغ. البثّ المفتوح يُبقي راديو
 * الهاتف في حالة طاقة أعلى ما دام مفتوحاً، وهو أغلى من أي مؤقّت — والخلفية أسوأ
 * حالاته: العمل يجري ولا أحد يرى نتيجته.
 *
 * وأخطر من ذلك أن النظام يقطع الاتصالات عند الخلفية، فمنطق إعادة الوصل يدخل
 * دورة «انقطاع ← إعادة وصل ← انقطاع» تُشعل الراديو بلا نهاية على هاتف في الجيب.
 *
 * التسليم في الخلفية مسؤولية الدفع الأصلي (FCM) لا البثّ: `dispatchFcmForForumNotification`
 * يوصل التنبيه عبر قناة النظام المشتركة، وهي أرخص بمراتب من اتصال لكل تطبيق.
 *
 * ثلاث إشارات لأن أياً منها وحدها لا تكفي:
 * - `visibilitychange`: ما يُطلقه Capacitor على أندرويد عند الخلفية.
 * - `pagehide`/`pageshow`: دورة ذاكرة الصفحة على متصفّح الجوال.
 * - `HAMI_APP_STATE_EVENT`: حالة `appStateChange` الأصلية، تصل حتى إن لم تتغيّر الرؤية.
 */
import { HAMI_APP_STATE_EVENT, type HamiAppStateDetail } from '@/app/runtime/appStateEvents';

export type AppForegroundHandlers = {
    /** يُستدعى مرة واحدة عند الانتقال إلى الخلفية — أغلق الاتصال هنا. */
    readonly onSuspend: () => void;
    /** يُستدعى مرة واحدة عند العودة للمقدّمة — أعد فتح الاتصال هنا. */
    readonly onResume: () => void;
};

export function isAppForeground(): boolean {
    if (typeof document === 'undefined') return false;
    if (document.hidden) return false;
    /* دورة الحياة الأصلية تختم الجذر، فالخلفية معروفة حتى بلا حدث رؤية */
    return document.documentElement.dataset.hamiAppActive !== '0';
}

export function subscribeAppForeground(handlers: AppForegroundHandlers): () => void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return () => undefined;
    }

    /*
     * الحالة المحفوظة تمنع الاستدعاء المزدوج: `visibilitychange` و`appStateChange`
     * يُطلقان معاً على الموبايل الأصلي، وإعادة فتح اتصال مفتوح تُنشئ اتصالين.
     */
    let foreground = isAppForeground();

    const apply = (next: boolean) => {
        if (next === foreground) return;
        foreground = next;
        if (next) handlers.onResume();
        else handlers.onSuspend();
    };

    const onVisibility = () => apply(isAppForeground());
    const onPageHide = () => apply(false);
    const onPageShow = () => apply(isAppForeground());
    const onAppState = (event: Event) => {
        const detail = (event as CustomEvent<HamiAppStateDetail>).detail;
        apply(detail?.isActive !== false && !document.hidden);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener(HAMI_APP_STATE_EVENT, onAppState);

    return () => {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('pagehide', onPageHide);
        window.removeEventListener('pageshow', onPageShow);
        window.removeEventListener(HAMI_APP_STATE_EVENT, onAppState);
    };
}
