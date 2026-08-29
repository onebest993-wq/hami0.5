import { memo } from 'react';
import { Pin } from '@/app/components/ui/icons/Pin';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';
import {
    resolveHomeHubPinNavigateAriaLabel,
    resolveHomeHubPinUnpinAriaLabel,
} from '@/app/services/alerts/homeHubCardLogic';
import { clusterPinDisplayMeta } from '@/app/workspace/clusterPinDisplay';
import { workspacePinVisual } from '@/app/workspace/workspacePinVisuals';
import type { ClusterPinView } from '@/app/workspace/types';
import { HUB_CONTENT_BUTTON_A11Y } from '../homeHub/homeHubA11y';

type HomeHubPinRowProps = {
    view: ClusterPinView;
    onNavigate: (routePath: string) => void;
    onUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
};

/** صفّ عنصر مثبّت — مشترك بين القائمة الثابتة والقائمة الافتراضية */
export const HomeHubPinRow = memo(function HomeHubPinRow({
    view,
    onNavigate,
    onUnpin,
}: HomeHubPinRowProps) {
    const { pin, related } = view;
    const meta = clusterPinDisplayMeta(pin);
    const visual = workspacePinVisual(pin.type);
    const navigateLabel = resolveHomeHubPinNavigateAriaLabel({
        headline: meta.headline,
        sectionLabel: meta.sectionLabel,
        clientLine: meta.clientLine,
        caseLine: meta.caseLine,
        relatedCount: related.length,
    });
    const unpinLabel = resolveHomeHubPinUnpinAriaLabel(meta.headline);
    const openPress = useScrollSafePress({
        onPress: () => onNavigate(pin.routePath),
    });
    const unpinPress = useScrollSafePress({
        onPress: () => onUnpin(pin.id, pin.type),
    });

    return (
        <div
            data-hami-hub-pin-row
            data-testid={`home-hub-pin-${pin.type}-${pin.id}`}
            className={`flex items-center gap-1.5 border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 ${visual.shell}`}
        >
            <button
                type="button"
                aria-label={navigateLabel}
                className={`flex-1 min-w-0 text-right min-h-[44px] rounded-lg touch-manipulation ${HUB_CONTENT_BUTTON_A11Y}`}
                {...openPress}
            >
                <p className="text-[11px] font-bold text-white/85 truncate">{meta.headline}</p>
                <p className="text-[9px] text-white/40 truncate">
                    {meta.sectionLabel}
                    {meta.clientLine ? ` · ${meta.clientLine.replace('الموكل: ', '')}` : ''}
                    {related.length > 0 ? ` · ${related.length} ارتباط` : ''}
                </p>
            </button>
            <button
                type="button"
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center border shrink-0 touch-manipulation ${visual.button} ${visual.accent} ${HUB_CONTENT_BUTTON_A11Y}`}
                title={unpinLabel}
                aria-label={unpinLabel}
                {...unpinPress}
            >
                <Pin size={11} className="fill-current" aria-hidden />
            </button>
        </div>
    );
});
