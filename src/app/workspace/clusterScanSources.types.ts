import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

export type ClusterScanSources = {
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    criminalCases: unknown[];
    urgentCases: unknown[];
    threadingTransactions: unknown[];
    threadingTasks: unknown[];
    notes: unknown[];
    fieldTasks: unknown[];
    vaultDocs: SmartVaultDoc[];
    calendarEvents: UnifiedEvent[];
    ready: boolean;
};
