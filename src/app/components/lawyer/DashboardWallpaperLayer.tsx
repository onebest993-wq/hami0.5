import React, { useLayoutEffect } from 'react';
import { ensureWallpaperDecoded, scheduleAfterHomeMainGridPaint } from '@/app/services/settings/wallpaperPaintReady';

type DashboardWallpaperLayerProps = {
    src?: string | null;
    enabled: boolean;
};

function cssWallpaperUrl(src: string): string {
    return `url("${src.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
}

/**
 * يحقن `--hami-wallpaper-image` لغطاء الرئيسية فقط — بلا طبقة fixed مكررة.
 */
export function DashboardWallpaperLayer({ src, enabled }: DashboardWallpaperLayerProps) {
    useLayoutEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        if (!enabled || !src) {
            if (root.dataset.hamiWallpaper !== '1') {
                root.style.removeProperty('--hami-wallpaper-image');
            }
            if (!enabled) root.dataset.hamiWallpaper = '0';
            return;
        }

        let cancelled = false;
        scheduleAfterHomeMainGridPaint(() => {
            if (cancelled) return;
            const next = cssWallpaperUrl(src);
            const current = root.style.getPropertyValue('--hami-wallpaper-image');
            if (current !== next) {
                root.style.setProperty('--hami-wallpaper-image', next);
            }
            root.dataset.hamiWallpaper = '1';
            void ensureWallpaperDecoded(src);
        });

        return () => {
            cancelled = true;
            /* لا تُمسح صورة الإقلاع عند StrictMode/إعادة التركيب — يمنع وميض أسود */
        };
    }, [enabled, src]);

    return null;
}
