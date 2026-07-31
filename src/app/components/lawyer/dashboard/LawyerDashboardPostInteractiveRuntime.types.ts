import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { UseLawyerDashboardCalendarClusterParams } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCalendarCluster';
import type { UseLawyerDashboardRuntimeEffectsParams } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRuntimeEffects';

export type LawyerDashboardPostInteractiveRuntimeProps = {
    onClusterScanSources: (sources: ClusterScanSources) => void;
} & UseLawyerDashboardCalendarClusterParams &
    UseLawyerDashboardRuntimeEffectsParams;
