/** خطوط الواجهة الأساسية — optional يمنع وميض النظام→Tajawal بعد الكشف */
export const GOOGLE_FONTS_CRITICAL_HREF =
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700;800&family=Tajawal:wght@400;500;700;800&display=optional';

const GOOGLE_FONTS_FULL_HREF =
    'https://fonts.googleapis.com/css2?family=Almarai:wght@400;700&family=Amiri:wght@400;700&family=Cairo:wght@400;500;700;800&family=Changa:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;700&family=Reem+Kufi:wght@400;700&family=Tajawal:wght@400;500;700;800&display=optional';

let criticalScheduled = false;
let fullScheduled = false;

function ensureFontPreconnects(): void {
    if (typeof document === 'undefined') return;
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
}

function injectMarkedStylesheet(
    href: string,
    attr: 'data-hami-google-fonts-critical' | 'data-hami-google-fonts-full',
): void {
    if (typeof document === 'undefined') return;
    if (document.querySelector(`link[${attr}]`)) return;
    const sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = href;
    sheet.setAttribute(attr, '1');
    if (attr === 'data-hami-google-fonts-critical') {
        sheet.setAttribute('data-hami-google-fonts', '1');
    }
    document.head.appendChild(sheet);
}

/**
 * Tajawal + Cairo فقط — تحت طبقة الإقلاع الصامتة
 * display=optional: إن تأخرت الشبكة يبقى خط النظام بلا تبديل مرئي بعد الكشف.
 */
export function scheduleCriticalGoogleFonts(): void {
    if (criticalScheduled || typeof document === 'undefined') return;
    if (typeof window !== 'undefined') {
        const path = String(window.location.pathname || '').replace(/\/+$/u, '') || '/';
        if (path === '/admin' || path.startsWith('/admin/')) return;
    }
    criticalScheduled = true;

    const inject = () => {
        ensureFontPreconnects();
        injectMarkedStylesheet(GOOGLE_FONTS_CRITICAL_HREF, 'data-hami-google-fonts-critical');
    };

    queueMicrotask(inject);
}

/** عائلات الملف/الاستوديو الإضافية — بعد جاهزية المحتوى أو idle */
export function scheduleDeferredGoogleFonts(): void {
    if (typeof document === 'undefined') return;
    if (typeof window !== 'undefined') {
        const path = String(window.location.pathname || '').replace(/\/+$/u, '') || '/';
        if (path === '/admin' || path.startsWith('/admin/')) return;
    }
    if (!criticalScheduled) scheduleCriticalGoogleFonts();
    if (fullScheduled) return;
    fullScheduled = true;

    const inject = () => {
        ensureFontPreconnects();
        injectMarkedStylesheet(GOOGLE_FONTS_FULL_HREF, 'data-hami-google-fonts-full');
    };

    queueMicrotask(inject);
}

export function resetDeferredGoogleFontsForTests(): void {
    criticalScheduled = false;
    fullScheduled = false;
}
