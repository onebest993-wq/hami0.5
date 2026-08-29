import { useMemo, type CSSProperties } from 'react';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import { resolveHomeBlockInlineStyle } from '@/app/services/settings/resolveHomeBlockStyle';
import { mergeBlockScopedAppearance } from '@/app/services/settings/themeResolve';

export function useHomeHubCardShellStyle(
    blockOverride: HomeBlockStyleOverride | undefined,
    themePrimary: string,
): {
    blockClasses: string;
    blockStyle: CSSProperties;
    containerBorderOn: boolean;
} {
    const { settings } = useLawyerSettings();
    const scopedAppearance = useMemo(
        () => mergeBlockScopedAppearance(settings.appearance, blockOverride),
        [settings.appearance, blockOverride],
    );
    const blockStyle: CSSProperties = {
        ...resolveHomeBlockInlineStyle(
            blockOverride ? { ...blockOverride, heightPx: undefined } : undefined,
            themePrimary,
            {
                skipHeightPx: true,
                skipContentScale: true,
                skipGlassPaint: true,
                defaultGlassOpacity: settings.appearance.glassOpacity,
                appearance: scopedAppearance,
            },
        ),
        background: 'transparent',
        padding: 0,
    };
    return {
        blockClasses: 'bg-transparent border-0 rounded-none shadow-none',
        blockStyle,
        containerBorderOn: false,
    };
}
