let scheduled = false;

/** يحمّل Tailwind الكامل بعد أول إطار — critical-shell.css يغطي لوحة الرئيسية */
export function scheduleDeferredAppStyles(): void {
    if (scheduled) return;
    scheduled = true;

    const load = () => {
        void import('@/styles/deferred-app.css');
    };

    requestAnimationFrame(() => {
        requestAnimationFrame(load);
    });
}
