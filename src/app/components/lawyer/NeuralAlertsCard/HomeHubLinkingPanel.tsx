import React from 'react';
import { Link2 } from 'lucide-react';
import type { ClusterPinView, WorkspacePinnedItem } from '@/app/workspace/types';
import {
    clusterLinkDisplayMeta,
    clusterPinDisplayMeta,
    CLUSTER_TYPE_LABEL,
} from '@/app/workspace/clusterPinDisplay';

function SectionBadge({ label }: { label: string }) {
    return (
        <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border border-violet-500/35 bg-violet-500/15 text-violet-100">
            {label}
        </span>
    );
}

function PinDetailBlock({
    pin,
    status,
    children,
}: {
    pin: WorkspacePinnedItem;
    status: 'linked' | 'waiting';
    children?: React.ReactNode;
}) {
    const meta = clusterPinDisplayMeta(pin);
    return (
        <div
            className={`rounded-xl border p-3 text-right ${
                status === 'linked'
                    ? 'border-violet-500/25 bg-violet-950/20'
                    : 'border-amber-500/20 bg-amber-950/10'
            }`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-white leading-snug">{meta.headline}</p>
                    {meta.clientLine ? (
                        <p className="text-[10px] text-white/55 mt-1">{meta.clientLine}</p>
                    ) : null}
                    {meta.caseLine ? (
                        <p className="text-[10px] text-white/45 mt-0.5">{meta.caseLine}</p>
                    ) : null}
                </div>
                <SectionBadge label={meta.sectionLabel} />
            </div>
            {children}
        </div>
    );
}

function LinkedGroupCard({
    cluster,
    onNavigateRoute,
}: {
    cluster: ClusterPinView;
    onNavigateRoute: (routePath: string) => void;
}) {
    const { pin, related } = cluster;
    return (
        <li>
            <PinDetailBlock pin={pin} status="linked">
                <button
                    type="button"
                    onClick={() => onNavigateRoute(pin.routePath)}
                    className="mt-2 w-full text-[10px] font-bold text-violet-200/90 hover:text-violet-100"
                >
                    فتح الإضبارة المثبتة
                </button>
            </PinDetailBlock>
            <ul className="mt-2 mr-2 space-y-2 border-r-2 border-violet-500/30 pr-2">
                {related.map((link) => {
                    const lm = clusterLinkDisplayMeta(link);
                    return (
                        <li key={`${link.type}:${link.id}`}>
                            <button
                                type="button"
                                onClick={() => onNavigateRoute(link.routePath)}
                                className="w-full rounded-lg border border-white/[0.08] bg-black/25 p-2.5 text-right hover:border-violet-500/30 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-bold text-white/90 leading-snug">
                                            {lm.headline}
                                        </p>
                                        <p className="text-[10px] text-white/50 mt-1">{lm.detail}</p>
                                        <p className="text-[9px] text-violet-200/80 mt-1 flex items-center gap-1">
                                            <Link2 size={10} />
                                            {CLUSTER_TYPE_LABEL[link.type]} — {lm.matchLabel}
                                        </p>
                                    </div>
                                    <SectionBadge label={CLUSTER_TYPE_LABEL[link.type]} />
                                </div>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </li>
    );
}

export type HomeHubLinkingPanelProps = {
    /** عنقاد محسوب مسبقاً (مصدر وحيد للحقيقة في البطاقة العامة) */
    clusters: ClusterPinView[];
    /** هل توجد إضابير مثبّتة مؤهّلة للربط؟ */
    hasEligiblePins: boolean;
    onNavigateRoute: (routePath: string) => void;
};

export const HomeHubLinkingPanel: React.FC<HomeHubLinkingPanelProps> = ({
    clusters,
    hasEligiblePins,
    onNavigateRoute,
}) => {
    const withLinks = clusters.filter((c) => c.related.length > 0);
    const pinnedOnly = clusters.filter((c) => c.related.length === 0);

    if (!hasEligiblePins) {
        return (
            <p className="text-[10px] text-white/35 leading-relaxed min-h-[52px] flex items-center">
                لا إضابير مثبتة للربط العنقودي بعد.
            </p>
        );
    }

    return (
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-0.5">
            {withLinks.length > 0 ? (
                <ul className="space-y-3">
                    {withLinks.map((cluster) => (
                        <LinkedGroupCard
                            key={`${cluster.pin.type}:${cluster.pin.id}`}
                            cluster={cluster}
                            onNavigateRoute={onNavigateRoute}
                        />
                    ))}
                </ul>
            ) : null}

            {pinnedOnly.length > 0 ? (
                <ul className="space-y-2">
                        {pinnedOnly.map(({ pin }) => (
                            <li key={`solo:${pin.type}:${pin.id}`}>
                                <button
                                    type="button"
                                    onClick={() => onNavigateRoute(pin.routePath)}
                                    className="w-full text-right"
                                >
                                    <PinDetailBlock pin={pin} status="waiting" />
                                </button>
                            </li>
                        ))}
                </ul>
            ) : null}
        </div>
    );
};
