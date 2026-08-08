import { useCallback, useMemo, useState } from 'react';
import { X } from '@/app/components/ui/lucideIcons';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import {
    buildHomeProceduralAttentionNudge,
    resolveHomeSparkRoutePath,
    scanHomeSparkHits,
} from '@/app/spark/engine/homeSparkAggregateScan';
import { buildSparkShellViewModel } from '@/app/spark/engine/sparkPassiveEngine';
import { useSparkShellRegistration } from '@/app/spark/shell/sparkShellStore';
import { SparkShellActiveReviewSection } from '@/app/spark/ui/SparkShellActiveReviewSection';
import { SparkMark } from '@/app/spark/ui/SparkMark';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import {
    isSparkNudgeSuppressed,
    recordSparkDismiss,
    recordSparkSnooze,
} from '@/app/spark/memory/sparkPreferenceStore';
import { resolveSparkPreferenceScope } from '@/app/spark/memory/resolveSparkPreferenceScope';

export type SparkShellPanelProps = {
    open: boolean;
    onClose: () => void;
    clusterScanSources: ClusterScanSources;
    onNavigateRoute: (routePath: string) => void;
};

export function SparkShellPanel({
    open,
    onClose,
    clusterScanSources,
    onNavigateRoute,
}: SparkShellPanelProps) {
    const registration = useSparkShellRegistration();
    const [hiddenIds, setHiddenIds] = useState<string[]>([]);

    const homeHits = useMemo(
        () => scanHomeSparkHits(clusterScanSources, { maxHitsPerSection: 6, maxTotal: 24 }),
        [clusterScanSources],
    );
    const homeSummary = useMemo(
        () => buildHomeProceduralAttentionNudge(homeHits),
        [homeHits],
    );

    const viewModel = useMemo(
        () => buildSparkShellViewModel({ registration, homeSummary }),
        [homeSummary, registration],
    );

    const visibleNudges = useMemo(
        () =>
            viewModel.nudges.filter((nudge) => {
                const scope = resolveSparkPreferenceScope(nudge, registration?.dossierKey);
                return !hiddenIds.includes(nudge.id) && !isSparkNudgeSuppressed(nudge.kind, scope);
            }),
        [hiddenIds, registration?.dossierKey, viewModel.nudges],
    );

    const handleFollow = useCallback(
        (nudge: (typeof visibleNudges)[number]) => {
            if (viewModel.onFollow && nudge.action?.actionId) {
                viewModel.onFollow(nudge.action.actionId);
                setHiddenIds((prev) => [...prev, nudge.id]);
                onClose();
                return;
            }

            if (nudge.targetFileId) {
                const routePath = resolveHomeSparkRoutePath(homeHits, nudge.targetFileId);
                if (routePath) {
                    onNavigateRoute(routePath);
                    setHiddenIds((prev) => [...prev, nudge.id]);
                    onClose();
                }
            }
        },
        [homeHits, onClose, onNavigateRoute, viewModel.onFollow],
    );

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[98] flex items-end justify-center bg-black/45 backdrop-blur-[2px]"
            dir="rtl"
            data-testid="spark-shell-panel"
            role="dialog"
            aria-modal="true"
            aria-label="لوحة السكرتير الذكي"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-t-3xl border border-[#E6C673]/15 bg-[#0A0F1C]/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <SparkMark size={14} className="shrink-0 text-[#E6C673]/85" />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-white/90">السكرتير الذكي</p>
                            <p className="text-[10px] text-white/45 truncate">{viewModel.contextLabel}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] min-w-[44px] touch-manipulation rounded-xl border border-white/10 px-3 text-white/60"
                        aria-label="إغلاق"
                    >
                        <X className="mx-auto h-4 w-4" />
                    </button>
                </div>

                {visibleNudges.length ? (
                    <div className="space-y-1">
                        {visibleNudges.map((nudge) => (
                            <SparkSmartBadge
                                key={nudge.id}
                                nudge={nudge}
                                onFollow={
                                    nudge.action
                                        ? () => handleFollow(nudge)
                                        : undefined
                                }
                                onLater={() => {
                                    const scope = resolveSparkPreferenceScope(
                                        nudge,
                                        registration?.dossierKey,
                                    );
                                    recordSparkSnooze(nudge.kind, scope);
                                    setHiddenIds((prev) => [...prev, nudge.id]);
                                }}
                                onDismiss={() => {
                                    const scope = resolveSparkPreferenceScope(
                                        nudge,
                                        registration?.dossierKey,
                                    );
                                    recordSparkDismiss(nudge.kind, scope);
                                    setHiddenIds((prev) => [...prev, nudge.id]);
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-[11px] leading-relaxed text-white/65">
                        لا فجوات إجرائية الآن — سبارك يراقب بهدوء ويُنبّه عند الحاجة.
                    </p>
                )}

                <SparkShellActiveReviewSection
                    dossierKey={registration?.dossierKey}
                    reviewPayload={registration?.reviewPayload}
                />

                <p className="mt-3 text-[10px] leading-relaxed text-white/40">
                    مدقّق تنظيمي — لا استشارة قانونية. كل إجراء يحتاج موافقتك.
                </p>
            </div>
        </div>
    );
}
