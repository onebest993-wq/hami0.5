import { useLayoutEffect } from 'react';

const SETTINGS_CHROME = '#0B1021';

/**
 * يخفّي خلفية اللوحة أثناء شاشة كاملة، ويوحّد لون شريط الحالة/الجسم/SafeView
 * حتى لا يتسرّب لون ثيم الرئيسية من أسفل الشاشات المعتمة (تقويم، إعدادات…).
 */
export function useOpaqueFeatureSurface(active = true, chromeColor = SETTINGS_CHROME): void {
    useLayoutEffect(() => {
        if (!active || typeof document === 'undefined') return;

        const root = document.documentElement;
        const body = document.body;
        const prevFeature = root.dataset.hamiFeatureOpen;
        root.dataset.hamiFeatureOpen = '1';

        let meta = document.querySelector('meta[name="theme-color"]');
        const prevTheme = meta?.getAttribute('content') ?? null;
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', chromeColor);

        const prevHtmlBg = root.style.backgroundColor;
        const prevBodyBg = body.style.backgroundColor;
        root.style.backgroundColor = chromeColor;
        body.style.backgroundColor = chromeColor;

        const dash = document.querySelector<HTMLElement>('[data-hami-lawyer-dashboard]');
        const prevDashBg = dash?.style.backgroundColor ?? '';
        if (dash) dash.style.backgroundColor = chromeColor;

        return () => {
            if (prevFeature !== undefined) root.dataset.hamiFeatureOpen = prevFeature;
            else delete root.dataset.hamiFeatureOpen;

            if (meta) {
                if (prevTheme != null) meta.setAttribute('content', prevTheme);
                else meta.setAttribute('content', SETTINGS_CHROME);
            }
            root.style.backgroundColor = prevHtmlBg;
            body.style.backgroundColor = prevBodyBg;
            if (dash) dash.style.backgroundColor = prevDashBg;
        };
    }, [active, chromeColor]);
}
