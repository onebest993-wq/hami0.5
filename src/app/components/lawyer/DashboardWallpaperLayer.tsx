import React from 'react';

type DashboardWallpaperLayerProps = {
    src?: string;
    enabled: boolean;
};

/** صورة خلفية اللوحة — طبقة ثابتة خلف المحتوى (body لا يظهر بسبب غلاف التطبيق) */
export function DashboardWallpaperLayer({ src, enabled }: DashboardWallpaperLayerProps) {
    if (!enabled || !src) return null;

    return (
        <img
            src={src}
            alt=""
            aria-hidden
            className="fixed inset-0 z-0 w-full h-full object-cover pointer-events-none select-none"
            draggable={false}
        />
    );
}
