import { useEffect, useMemo } from 'react';
import { buildClusterScanIndex } from './buildClusterScanIndex';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { useWorkspacePinPrune } from './useWorkspacePinPrune';
import type { ClusterScanSources } from './useClusterScanSources';

/** فهرس مسح التثبيتات وتنظيف المثبّتات اليتيمة — يستخدم مصدر المسح المشترك من اللوحة */
export function useWorkspacePinMaintenance(params: {
    clusterScanSources: ClusterScanSources;
}): void {
    const { clusterScanSources: sources } = params;
    const pruneIneligiblePins = useWorkspaceStore((s) => s.pruneIneligiblePins);

    useEffect(() => {
        pruneIneligiblePins();
    }, [pruneIneligiblePins]);

    const scanIndex = useMemo(
        () =>
            buildClusterScanIndex({
                lawsuitFiles: sources.lawsuitFiles,
                executionFiles: sources.executionFiles,
                criminalCases: sources.criminalCases,
                urgentCases: sources.urgentCases,
                threadingTransactions: sources.threadingTransactions,
                notes: sources.notes,
                fieldTasks: sources.fieldTasks,
            }),
        [sources],
    );

    useWorkspacePinPrune(scanIndex, sources.ready);
}
