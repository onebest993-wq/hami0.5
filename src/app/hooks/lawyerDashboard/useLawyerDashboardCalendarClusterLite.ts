import { useMemo } from 'react';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { createEmptyClusterScanSources } from '@/app/workspace/clusterScanSourcesLite';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote, ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

export type UseLawyerDashboardCalendarClusterLiteParams = {
    enabled: boolean;
    userId?: string;
    authUserId?: string;
    files: FileData[];
    executionFiles: ExecutionFile[];
    globalNotes: GlobalNote[];
    quantumTasks: LegalTask[];
    criminalCasesForCluster: unknown[];
    vaultDocs?: SmartVaultDoc[];
    calendarEvents?: UnifiedEvent[];
};

/**
 * calendarUserId + مصادر محلية خفيفة فقط — بلا hook مسح العناقيد الثقيل.
 * قواعد المستعجل/المعاملات تُحمَّل بعد interactive عبر PostInteractive.
 */
export function useLawyerDashboardCalendarClusterLite({
    userId,
    authUserId,
    files,
    executionFiles,
    globalNotes,
    quantumTasks,
    criminalCasesForCluster,
    vaultDocs = [],
    calendarEvents = [],
}: UseLawyerDashboardCalendarClusterLiteParams): {
    calendarUserId: string;
    clusterScanSources: ClusterScanSources;
} {
    const calendarUserId = resolveCalendarUserId(userId ?? authUserId ?? null);

    const clusterScanSources = useMemo(
        () =>
            createEmptyClusterScanSources(
                files,
                executionFiles,
                criminalCasesForCluster,
                globalNotes,
                quantumTasks,
                vaultDocs,
                calendarEvents,
            ),
        [criminalCasesForCluster, executionFiles, files, globalNotes, quantumTasks, vaultDocs, calendarEvents],
    );

    return { calendarUserId, clusterScanSources };
}
