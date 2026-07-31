import React, { useLayoutEffect, useMemo } from 'react';

type DashboardWallpaperLayerProps = {
    src?: string | null;
    enabled: boolean;
};

function cssWallpaperUrl(src: string): string {
    return `url("${src.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
}

/**
 * طبقة خلفية ثابتة + متغيّر CSS للغطاء الرئيسي.
 * غطاء `.hami-dashboard-home-stack-cover` معتم فوق الطبقة الثابتة؛
 * لذلك يجب حقن الصورة في `--hami-wallpaper-image` وإلا لن تظهر أبداً.
 */
export function DashboardWallpaperLayer({ src, enabled }: DashboardWallpaperLayerProps) {
    const style = useMemo(() => {
        if (!src) return undefined;
        return { backgroundImage: cssWallpaperUrl(src) } as const;
    }, [src]);

    useLayoutEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        if (!enabled || !src) {
            root.style.removeProperty('--hami-wallpaper-image');
            return;
        }
        root.style.setProperty('--hami-wallpaper-image', cssWallpaperUrl(src));
        root.dataset.hamiWallpaper = '1';
    }, [enabled, src]);

    if (!enabled || !src || !style) return null;

    return <div className="hami-wallpaper-layer" style={style} aria-hidden />;
}
