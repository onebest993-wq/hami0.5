import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { useIncrementalCalendarSync } from '@/app/hooks/useIncrementalCalendarSync';
import { useClusterScanSources } from '@/app/workspace/useClusterScanSources';
import { useWorkspacePinMaintenance } from '@/app/workspace/useWorkspacePinMaintenance';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote, ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';

export type UseLawyerDashboardCalendarClusterParams = {
    userId?: string;
    authUserId?: string;
    files: FileData[];
    executionFiles: ExecutionFile[];
    globalNotes: GlobalNote[];
    quantumTasks: LegalTask[];
    criminalCasesForCluster: unknown[];
};

export function useLawyerDashboardCalendarCluster({
    userId,
    authUserId,
    files,
    executionFiles,
    globalNotes,
    quantumTasks,
    criminalCasesForCluster,
}: UseLawyerDashboardCalendarClusterParams) {
    const calendarUserId = resolveCalendarUserId(userId ?? authUserId ?? null);

    useIncrementalCalendarSync(
        calendarUserId,
        files,
        executionFiles,
        globalNotes,
        quantumTasks,
        criminalCasesForCluster,
    );

    const clusterScanSources = useClusterScanSources({
        lawyerId: calendarUserId,
        lawsuitFiles: files,
        executionFiles,
        criminalCases: criminalCasesForCluster,
        notes: globalNotes,
        fieldTasks: quantumTasks,
    });

    useWorkspacePinMaintenance({ clusterScanSources });

    return { calendarUserId, clusterScanSources };
}
