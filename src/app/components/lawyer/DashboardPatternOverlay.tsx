import React from 'react';
import { resolvePatternOverlayStyle } from '@/app/services/settings/surfaceAppearance';
import type { AppearanceSettings } from '@/app/services/settings/types';

type DashboardPatternOverlayProps = {
    appearance: Pick<
        AppearanceSettings,
        'backgroundPreset' | 'backgroundPatternOpacity' | 'theme' | 'themeMode'
    >;
    enabled: boolean;
};

/** طبقة زخرفة — شفافية + ضبابية قابلة للضبط */
export function DashboardPatternOverlay({ appearance, enabled }: DashboardPatternOverlayProps) {
    const style = resolvePatternOverlayStyle(appearance, enabled);
    if (!style) return null;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-300"
            aria-hidden
            style={style}
        />
    );
}
