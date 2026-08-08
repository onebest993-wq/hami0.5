import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

const EMPTY_LIST: unknown[] = [];
const EMPTY_VAULT: SmartVaultDoc[] = [];
const EMPTY_CALENDAR: UnifiedEvent[] = [];

/** عناقيد فارغة حتى يُفعَّل useClusterScanSources بعد dashboard-interactive */
export function createEmptyClusterScanSources(
    lawsuitFiles: unknown[] = EMPTY_LIST,
    executionFiles: unknown[] = EMPTY_LIST,
    criminalCases: unknown[] = EMPTY_LIST,
    notes: unknown[] = EMPTY_LIST,
    fieldTasks: unknown[] = EMPTY_LIST,
    vaultDocs: SmartVaultDoc[] = EMPTY_VAULT,
    calendarEvents: UnifiedEvent[] = EMPTY_CALENDAR,
): ClusterScanSources {
    return {
        lawsuitFiles,
        executionFiles,
        criminalCases,
        urgentCases: EMPTY_LIST,
        threadingTransactions: EMPTY_LIST,
        threadingTasks: EMPTY_LIST,
        notes,
        fieldTasks,
        vaultDocs,
        calendarEvents,
        ready: false,
    };
}
