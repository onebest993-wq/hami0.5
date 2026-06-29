import React, { useMemo } from 'react';

type DashboardWallpaperLayerProps = {
    src?: string | null;
    enabled: boolean;
};

/** صورة خلفية اللوحة — طبقة GPU واحدة خلف المحتوى */
export function DashboardWallpaperLayer({ src, enabled }: DashboardWallpaperLayerProps) {
    const style = useMemo(
        () => (src ? ({ backgroundImage: `url("${src}")` } as const) : undefined),
        [src],
    );

    if (!enabled || !src || !style) return null;

    return <div className="hami-wallpaper-layer" style={style} aria-hidden />;
}
