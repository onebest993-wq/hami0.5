import { memo } from 'react';
import { Pin } from 'lucide-react';
import {
    resolveHomeHubPinNavigateAriaLabel,
    resolveHomeHubPinUnpinAriaLabel,
} from '@/app/services/alerts/homeHubCardLogic';
import { clusterPinDisplayMeta } from '@/app/workspace/clusterPinDisplay';
import { workspacePinVisual } from '@/app/workspace/workspacePinVisuals';
import type { ClusterPinView } from '@/app/workspace/types';

const HUB_CONTENT_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export type HomeHubPinRowProps = {
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

    return (
        <div
            data-testid={`home-hub-pin-${pin.type}-${pin.id}`}
            className={`flex items-center gap-1.5 border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 ${visual.shell}`}
        >
            <span
                className={`shrink-0 inline-flex items-center justify-center min-w-[1.35rem] h-5 px-1 text-[9px] font-extrabold border ${visual.chip}`}
            >
                {visual.shortLabel}
            </span>
            <button
                type="button"
                onClick={() => onNavigate(pin.routePath)}
                aria-label={navigateLabel}
                className={`flex-1 min-w-0 text-right min-h-[44px] rounded-lg touch-manipulation ${HUB_CONTENT_BUTTON_A11Y}`}
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
                onClick={(e) => {
                    e.stopPropagation();
                    onUnpin(pin.id, pin.type);
                }}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center border shrink-0 touch-manipulation ${visual.button} ${visual.accent} ${HUB_CONTENT_BUTTON_A11Y}`}
                title={unpinLabel}
                aria-label={unpinLabel}
            >
                <Pin size={11} className="fill-current" />
            </button>
        </div>
    );
});
