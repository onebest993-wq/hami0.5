import { useCallback, useMemo } from 'react';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import {
    buildHomeProceduralAttentionNudge,
    resolveHomeSparkRoutePath,
    scanHomeSparkHits,
} from '@/app/spark/engine/homeSparkAggregateScan';
import { SparkArchiveInsightShell } from '@/app/spark/ui/sparkArchiveInsightShared';

export type SparkHomeHubInsightProps = {
    clusterScanSources: ClusterScanSources;
    onNavigateRoute: (routePath: string) => void;
    className?: string;
};

export function SparkHomeHubInsight({
    clusterScanSources,
    onNavigateRoute,
    className = 'px-0 pb-2',
}: SparkHomeHubInsightProps) {
    const { summary, hits } = useMemo(() => {
        const scanned = scanHomeSparkHits(clusterScanSources, { maxHitsPerSection: 6, maxTotal: 24 });
        return {
            hits: scanned,
            summary: buildHomeProceduralAttentionNudge(scanned),
        };
    }, [clusterScanSources]);

    const handleOpenTarget = useCallback(
        (targetFileId: string) => {
            const routePath = resolveHomeSparkRoutePath(hits, targetFileId);
            if (routePath) onNavigateRoute(routePath);
        },
        [hits, onNavigateRoute],
    );

    return (
        <SparkArchiveInsightShell
            summary={summary}
            summaryKind="home.procedural_attention_summary"
            preferenceScope="home-hub"
            className={className}
            onOpenTarget={handleOpenTarget}
        />
    );
}
