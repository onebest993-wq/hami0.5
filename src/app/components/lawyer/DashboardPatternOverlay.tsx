import React, { useEffect, useState } from 'react';
import type { AppearanceSettings } from '@/app/services/settings/types';

type DashboardPatternOverlayProps = {
    appearance: Pick<
        AppearanceSettings,
        'backgroundPreset' | 'backgroundPatternOpacity' | 'theme' | 'themeMode'
    >;
    enabled: boolean;
};

/** طبقة زخرفة — شفافية قابلة للضبط؛ SVG خفيف يبقى حتى في الوضع الخفيف */
export function DashboardPatternOverlay({ appearance, enabled }: DashboardPatternOverlayProps) {
    const [style, setStyle] = useState<React.CSSProperties | null>(null);

    useEffect(() => {
        let cancelled = false;
        void import('@/app/services/settings/surfaceAppearance')
            .then((m) => {
                if (cancelled) return;
                setStyle(m.resolvePatternOverlayStyle(appearance, enabled));
            })
            .catch(() => {
                if (!cancelled) setStyle(null);
            });
        return () => {
            cancelled = true;
        };
    }, [appearance, enabled]);

    if (!style) return null;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-300"
            aria-hidden
            style={style}
        />
    );
}
