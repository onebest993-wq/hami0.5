import { useEffect } from 'react';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { useIncrementalCalendarSync } from '@/app/hooks/useIncrementalCalendarSync';
import { useClusterScanSources } from '@/app/workspace/useClusterScanSources';
import { useWorkspacePinMaintenance } from '@/app/workspace/useWorkspacePinMaintenance';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote, ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { useVaultDocsForClusterScan } from '@/app/workspace/useVaultDocsForClusterScan';
import { useCalendarEventsForClusterScan } from '@/app/workspace/useCalendarEventsForClusterScan';

export type UseLawyerDashboardCalendarClusterParams = {
    enabled: boolean;
    userId?: string;
    authUserId?: string;
    files: FileData[];
    executionFiles: ExecutionFile[];
    globalNotes: GlobalNote[];
    quantumTasks: LegalTask[];
    criminalCasesForCluster: unknown[];
    /** يغذي stem بعد interactive — اختياري */
    onClusterScanSources?: (sources: ClusterScanSources) => void;
};

export function useLawyerDashboardCalendarCluster({
    enabled,
    userId,
    authUserId,
    files,
    executionFiles,
    globalNotes,
    quantumTasks,
    criminalCasesForCluster,
    onClusterScanSources,
}: UseLawyerDashboardCalendarClusterParams) {
    const calendarUserId = resolveCalendarUserId(userId ?? authUserId ?? null);
    const vaultDocs = useVaultDocsForClusterScan(calendarUserId, enabled);
    const calendarEvents = useCalendarEventsForClusterScan(calendarUserId, enabled);

    useIncrementalCalendarSync(
        enabled,
        calendarUserId,
        files,
        executionFiles,
        globalNotes,
        quantumTasks,
        criminalCasesForCluster,
    );

    const clusterScanSources = useClusterScanSources({
        enabled,
        lawyerId: calendarUserId,
        lawsuitFiles: files,
        executionFiles,
        criminalCases: criminalCasesForCluster,
        notes: globalNotes,
        fieldTasks: quantumTasks,
        vaultDocs,
        calendarEvents,
    });

    useWorkspacePinMaintenance({ enabled, clusterScanSources });

    useEffect(() => {
        onClusterScanSources?.(clusterScanSources);
    }, [clusterScanSources, onClusterScanSources]);

    return { calendarUserId, clusterScanSources };
}
