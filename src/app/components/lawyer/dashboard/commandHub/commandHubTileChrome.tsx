import React, { memo } from 'react';
import { resolveHubRouteTileVisuals } from '@/app/services/settings/resolveHubRouteTileVisuals';

type HubRouteVisuals = ReturnType<typeof resolveHubRouteTileVisuals>;

/** وجه البلاطة النصفية — الاسم يملأ الصندوق ويتوسّط */
export const HubTileFace = memo(function HubTileFace({
    label,
    visuals,
    hideInLayoutEdit = false,
}: {
    label: string;
    visuals: HubRouteVisuals;
    hideInLayoutEdit?: boolean;
}) {
    const compact = label.trim().length > 9;

    return (
        <div
            className="hami-hub-tile-face"
            data-hami-hub-face="1"
            data-hami-edit-hide-in-layout={hideInLayoutEdit || undefined}
        >
            <p
                dir="rtl"
                lang="ar"
                className={`hami-hub-title hami-hub-title-crystal hami-hub-title--half-fill${
                    compact ? ' hami-hub-title--half-compact' : ''
                }`}
                style={visuals.titleStyle}
            >
                {label}
            </p>
            <span className="hami-hub-title-mark" aria-hidden />
        </div>
    );
});
