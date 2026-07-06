import { useEffect, useMemo } from 'react';
import { buildClusterScanIndex } from './buildClusterScanIndex';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { useWorkspacePinPrune } from './useWorkspacePinPrune';
import type { ClusterScanSources } from './useClusterScanSources';

/** فهرس مسح التثبيتات وتنظيف المثبّتات اليتيمة — يستخدم مصدر المسح المشترك من اللوحة */
export function useWorkspacePinMaintenance(params: {
    enabled: boolean;
    clusterScanSources: ClusterScanSources;
}): void {
    const { enabled, clusterScanSources: sources } = params;
    const pruneIneligiblePins = useWorkspaceStore((s) => s.pruneIneligiblePins);

    useEffect(() => {
        if (!enabled) return;
        pruneIneligiblePins();
    }, [enabled, pruneIneligiblePins]);

    const scanIndex = useMemo(
        () =>
            !enabled
                ? []
                :
            buildClusterScanIndex({
                lawsuitFiles: sources.lawsuitFiles,
                executionFiles: sources.executionFiles,
                criminalCases: sources.criminalCases,
                urgentCases: sources.urgentCases,
                threadingTransactions: sources.threadingTransactions,
                notes: sources.notes,
                fieldTasks: sources.fieldTasks,
            }),
        [enabled, sources],
    );

    useWorkspacePinPrune(scanIndex, enabled && sources.ready);
}
