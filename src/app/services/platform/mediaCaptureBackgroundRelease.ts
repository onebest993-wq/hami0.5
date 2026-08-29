/** يوقف التقاط الكاميرا/المايك عند إخفاء التطبيق — LED والخصوصية على الموبايل */

export function subscribeCaptureBackgroundRelease(onRelease: () => void): () => void {
    if (typeof document === 'undefined') return () => undefined;

    const onVisibility = () => {
        if (document.visibilityState !== 'visible') onRelease();
    };
    const onPageHide = () => onRelease();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    let cancelled = false;
    let removeApp: (() => void) | undefined;
    void import('@/app/runtime/hamiNativeShell')
        .then(({ isHamiNativeShell }) => {
            if (cancelled || !isHamiNativeShell()) return;
            return import('@capacitor/app').then(async ({ App }) => {
                if (cancelled) return;
                const handle = await App.addListener('appStateChange', ({ isActive }) => {
                    if (!isActive) onRelease();
                });
                if (cancelled) {
                    void handle.remove();
                    return;
                }
                removeApp = () => {
                    void handle.remove();
                };
            });
        })
        .catch(() => undefined);

    return () => {
        cancelled = true;
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('pagehide', onPageHide);
        removeApp?.();
    };
}
