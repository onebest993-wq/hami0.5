const GOOGLE_FONTS_HREF =
    'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@400;500;700;800&family=Cairo:wght@400;500;700&display=swap';

let scheduled = false;

/** يحمّل خطوط Google بعد أول إطار — بدون preconnect/preload في المسار الحرج */
export function scheduleDeferredGoogleFonts(): void {
    if (scheduled || typeof document === 'undefined') return;
    scheduled = true;

    const inject = () => {
        if (document.querySelector('link[data-hami-google-fonts]')) return;

        const preconnect = (href: string, crossOrigin?: boolean) => {
            if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = href;
            if (crossOrigin) link.crossOrigin = '';
            document.head.appendChild(link);
        };

        preconnect('https://fonts.googleapis.com');
        preconnect('https://fonts.gstatic.com', true);

        const sheet = document.createElement('link');
        sheet.rel = 'stylesheet';
        sheet.href = GOOGLE_FONTS_HREF;
        sheet.setAttribute('data-hami-google-fonts', '1');
        document.head.appendChild(sheet);
    };

    const run = () => inject();

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(run, { timeout: 2500 });
    } else {
        window.setTimeout(run, 1200);
    }
}
