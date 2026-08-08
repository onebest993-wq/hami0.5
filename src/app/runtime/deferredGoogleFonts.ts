const GOOGLE_FONTS_HREF_OPTIONAL =
    'https://fonts.googleapis.com/css2?family=Almarai:wght@400;700&family=Amiri:wght@400;700&family=Cairo:wght@400;500;700;800&family=Changa:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;700&family=Reem+Kufi:wght@400;700&family=Tajawal:wght@400;500;700;800&display=optional';

const GOOGLE_FONTS_HREF_SWAP =
    'https://fonts.googleapis.com/css2?family=Almarai:wght@400;700&family=Amiri:wght@400;700&family=Cairo:wght@400;500;700;800&family=Changa:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;700&family=Reem+Kufi:wght@400;700&family=Tajawal:wght@400;500;700;800&display=swap';

let scheduled = false;

function resolveGoogleFontsHref(): string {
    if (typeof document === 'undefined') return GOOGLE_FONTS_HREF_OPTIONAL;
    const native = document.documentElement.getAttribute('data-hami-native') === '1';
    return native ? GOOGLE_FONTS_HREF_SWAP : GOOGLE_FONTS_HREF_OPTIONAL;
}

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
        sheet.href = resolveGoogleFontsHref();
        sheet.setAttribute('data-hami-google-fonts', '1');
        document.head.appendChild(sheet);
    };

    const run = () => inject();

    queueMicrotask(run);
}
