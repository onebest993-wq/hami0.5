import { SETTINGS_INSTANT_CHROME } from './settingsInstantPaintConstants';

const DASHBOARD_SELECTOR = '[data-hami-lawyer-dashboard]';

let prevThemeColor: string | null = null;

export function applyDashboardMask(active: boolean): void {
    if (typeof document === 'undefined') return;
    const dash = document.querySelector<HTMLElement>(DASHBOARD_SELECTOR);
    if (!dash) return;
    if (active) {
        dash.style.setProperty('pointer-events', 'none');
        /*
         * لا content-visibility ولا طلاء خلفية اللوحة:
         * الطبقة المعتمة تغطي المنزل؛ تغيير الخلفية ثم إعادتها عند الإغلاق
         * يبدو كإعادة تحميل للواجهة الرئيسية.
         */
        return;
    }
    dash.style.removeProperty('pointer-events');
}

export function applySettingsThemeChrome(active: boolean): void {
    if (typeof document === 'undefined') return;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (active) {
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        if (prevThemeColor === null) {
            prevThemeColor = meta.getAttribute('content');
        }
        meta.setAttribute('content', SETTINGS_INSTANT_CHROME);
        document.documentElement.style.backgroundColor = SETTINGS_INSTANT_CHROME;
        document.body.style.backgroundColor = SETTINGS_INSTANT_CHROME;
        applyDashboardMask(true);
        return;
    }
    if (meta && prevThemeColor != null) {
        meta.setAttribute('content', prevThemeColor);
    }
    prevThemeColor = null;
    document.documentElement.style.backgroundColor = '';
    document.body.style.backgroundColor = '';
    applyDashboardMask(false);
}

/**
 * يخفّي ثيم اللوحة فوراً (html/body/meta/dashboard) — قبل commit React.
 * يُستدعى عند الفتح حتى لو لم يُركَّب Host بعد.
 */
export function applySettingsOpaqueChrome(): void {
    applySettingsThemeChrome(true);
}
