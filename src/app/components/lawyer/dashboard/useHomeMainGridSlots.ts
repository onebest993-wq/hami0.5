import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
    useLawyerSettingsAppearance,
    useLawyerSettingsHomeLayout,
} from '@/app/context/lawyerSettings/lawyerSettingsHooks';
import {
    filterDisplayHomeWidgets,
    getWidgetsInZone,
    isRepositoryLegacyWidget,
    type HomeBlockStyleOverride,
    type HomeWidgetId,
} from '@/app/services/settings/homeLayout';
import {
    isBlockVisible,
    resolveWidgetSpan,
    resolveWidgetWrapperStyle,
} from '@/app/services/settings/resolveHomeBlockStyle';
import type { AppearanceSettings } from '@/app/services/settings/types';

export type HomeMainGridSlot = {
    id: HomeWidgetId;
    span: 1 | 2;
    style: CSSProperties;
    override: HomeBlockStyleOverride | undefined;
};

export function useHomeMainGridSlots(themePrimary: string): {
    slots: HomeMainGridSlot[];
    appearance: AppearanceSettings;
} {
    const { placements, overrides } = useLawyerSettingsHomeLayout();
    const appearance = useLawyerSettingsAppearance();
    const defaultGlassOpacity = appearance.glassOpacity;

    const slots = useMemo(() => {
        const ids = filterDisplayHomeWidgets(getWidgetsInZone(placements, 'main'), false);
        const next: HomeMainGridSlot[] = [];
        for (const widgetId of ids) {
            if (widgetId === 'dockQuickNote' || isRepositoryLegacyWidget(widgetId)) continue;
            if (!isBlockVisible(overrides[widgetId])) continue;
            const span = resolveWidgetSpan(widgetId, overrides[widgetId]);
            next.push({
                id: widgetId,
                span,
                override: overrides[widgetId],
                style: resolveWidgetWrapperStyle(
                    widgetId,
                    overrides[widgetId],
                    themePrimary,
                    'main',
                    defaultGlassOpacity,
                    appearance,
                ),
            });
        }
        return next;
    }, [appearance, defaultGlassOpacity, overrides, placements, themePrimary]);

    return { slots, appearance };
}
