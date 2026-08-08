import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import {
    buildHomeProceduralAttentionNudge,
    scanHomeSparkHits,
} from '@/app/spark/engine/homeSparkAggregateScan';
import { buildSparkShellViewModel } from '@/app/spark/engine/sparkPassiveEngine';
import { installSparkDevTools } from '@/app/spark/dev/sparkDevMode';
import { useSparkShellRegistration } from '@/app/spark/shell/sparkShellStore';
import { SparkMark } from '@/app/spark/ui/SparkMark';
import { SparkShellPanel } from '@/app/spark/ui/SparkShellPanel';

export type SparkShellProps = {
    clusterScanSources: ClusterScanSources;
    onNavigateRoute: (routePath: string) => void;
    hidden?: boolean;
};

export function SparkShell({
    clusterScanSources,
    onNavigateRoute,
    hidden = false,
}: SparkShellProps) {
    const [open, setOpen] = useState(false);
    const registration = useSparkShellRegistration();

    const homeSummary = useMemo(() => {
        const hits = scanHomeSparkHits(clusterScanSources, { maxHitsPerSection: 6, maxTotal: 24 });
        return buildHomeProceduralAttentionNudge(hits);
    }, [clusterScanSources]);

    const viewModel = useMemo(
        () => buildSparkShellViewModel({ registration, homeSummary }),
        [homeSummary, registration],
    );

    const showAttentionDot = viewModel.hasAttention || Boolean(registration?.reviewPayload);
    const handleOpen = useCallback(() => setOpen(true), []);
    const handleClose = useCallback(() => setOpen(false), []);

    useEffect(() => {
        installSparkDevTools();
    }, []);

    useEffect(() => {
        if (hidden) setOpen(false);
    }, [hidden]);

    if (hidden) return null;

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                data-testid="spark-shell-fab"
                aria-label="فتح السكرتير الذكي"
                className="fixed z-[92] flex h-11 w-11 touch-manipulation items-center justify-center rounded-2xl border border-[#E6C673]/20 bg-[#0A0F1C]/92 text-[#E6C673]/85 shadow-lg shadow-black/25 backdrop-blur-md bottom-[max(6.5rem,calc(5.75rem+env(safe-area-inset-bottom)))] left-[max(1rem,env(safe-area-inset-left))] pointer-events-auto"
            >
                <SparkMark size={15} />
                {showAttentionDot ? (
                    <span
                        className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#E6C673] ring-2 ring-[#0A0F1C]"
                        aria-hidden
                    />
                ) : null}
            </button>

            <SparkShellPanel
                open={open}
                onClose={handleClose}
                clusterScanSources={clusterScanSources}
                onNavigateRoute={onNavigateRoute}
            />
        </>
    );
}
