import { useEffect } from 'react';
import type { ClusterScanSources } from './clusterScanSources.types';
import { buildConservativePruneKeepKeys } from './workspacePinPrunePolicy';

/**
 * فهرس مسح التثبيتات وتنظيف المثبّتات اليتيمة.
 * buildClusterScanIndex + workspaceStore يُحمَّلان dynamic داخل effects —
 * لا يسحبان pin builders إلى مسار LD البارد.
 */
export function useWorkspacePinMaintenance(params: {
    enabled: boolean;
    clusterScanSources: ClusterScanSources;
}): void {
    const { enabled, clusterScanSources: sources } = params;

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        void import('@/app/stores/workspaceStore')
            .then(({ useWorkspaceStore }) => {
                if (cancelled) return;
                useWorkspaceStore.getState().pruneIneligiblePins();
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [enabled]);

    useEffect(() => {
        if (!enabled || !sources.ready) return;
        let cancelled = false;
        const snapshot = sources;
        void Promise.all([
            import('./buildClusterScanIndex'),
            import('@/app/stores/workspaceStore'),
        ])
            .then(([{ buildClusterScanIndex }, { useWorkspaceStore }]) => {
                if (cancelled) return;
                const scanIndex = buildClusterScanIndex({
                    lawsuitFiles: snapshot.lawsuitFiles,
                    executionFiles: snapshot.executionFiles,
                    criminalCases: snapshot.criminalCases,
                    urgentCases: snapshot.urgentCases,
                    threadingTransactions: snapshot.threadingTransactions,
                    notes: snapshot.notes,
                    fieldTasks: snapshot.fieldTasks,
                });
                // لا تُفرّغ التثبيتات عند فهرس فارغ (قبل التحميل أو حساب جديد بلا بيانات)
                if (scanIndex.length === 0) return;
                const pinnedItems = useWorkspaceStore.getState().pinnedItems;
                const keepKeys = buildConservativePruneKeepKeys(scanIndex, pinnedItems);
                useWorkspaceStore.getState().pruneMissingPins(keepKeys);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [enabled, sources]);
}
