import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';

const EMPTY_LIST: unknown[] = [];

/** عناقيد فارغة حتى يُفعَّل useClusterScanSources بعد dashboard-interactive */
export function createEmptyClusterScanSources(
    lawsuitFiles: unknown[] = EMPTY_LIST,
    executionFiles: unknown[] = EMPTY_LIST,
    criminalCases: unknown[] = EMPTY_LIST,
    notes: unknown[] = EMPTY_LIST,
    fieldTasks: unknown[] = EMPTY_LIST,
): ClusterScanSources {
    return {
        lawsuitFiles,
        executionFiles,
        criminalCases,
        urgentCases: EMPTY_LIST,
        threadingTransactions: EMPTY_LIST,
        notes,
        fieldTasks,
        ready: false,
    };
}
