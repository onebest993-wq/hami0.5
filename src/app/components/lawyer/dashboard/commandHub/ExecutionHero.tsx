import React, { memo } from 'react';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import { HOME_HUB_TILE_LABELS } from '@/app/services/settings/homeBlockLabels';
import { RouteTile } from './RouteTile';

/** بلاطة التنفيذ — نفس صدفة المسار مع ضغط hero وتسمية الأرشيف التنفيذي */
export const ExecutionHero = memo(function ExecutionHero({
    accent,
    onOpenArchive,
    reduceMotion,
    blockOverride,
    interactionDisabled = false,
    layoutSpan = 1,
}: {
    accent: string;
    onOpenArchive: (id: string) => void;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    interactionDisabled?: boolean;
    layoutSpan?: 1 | 2;
}) {
    return (
        <RouteTile
            card={{
                id: 'execution',
                tileId: 'hubExecution',
                label: HOME_HUB_TILE_LABELS.hubExecution,
            }}
            onOpenArchive={onOpenArchive}
            reduceMotion={reduceMotion}
            blockOverride={blockOverride}
            interactionDisabled={interactionDisabled}
            layoutSpan={layoutSpan}
            pressVariant="hero"
            openActionLabel="فتح مخزن الإضابير التنفيذية"
            accentHint={accent}
        />
    );
});
