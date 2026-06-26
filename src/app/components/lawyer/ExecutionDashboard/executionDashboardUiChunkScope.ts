// @ts-nocheck
/** مزوّدات UI للـ chunk scope — execution-dashboard-core (منفصل عن execution-helpers) */
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { ColleagueConsultationProvider } from '@/app/components/lawyer/caseShare/ColleagueConsultationContext';
import SecureStoreService from '@/app/services/SecureStoreService';
import { PerformanceMonitor } from '@/app/utils/performanceMonitor';
import { ExecutionDashboardSkeleton } from '@/app/components/ui/Skeleton';

export const EXECUTION_DASHBOARD_UI_CHUNK_SCOPE = {
    ColleagueConsultationProvider,
    ExecutionDashboardSkeleton,
    PerformanceMonitor,
    SecureStoreService,
    SmartDialog,
} as const;

export function spreadExecutionDashboardUiChunkScope(): Record<string, unknown> {
    return EXECUTION_DASHBOARD_UI_CHUNK_SCOPE as unknown as Record<string, unknown>;
}
