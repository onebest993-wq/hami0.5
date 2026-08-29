import type { CSSProperties } from 'react';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import type { HomeHubAlertsEmptyState, HomeHubPanel } from '@/app/services/alerts/homeHubCardLogic';
import type { HomeHubCardLayout } from '@/app/services/alerts/homeHubCardLayout';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { CalendarRadarEvent, ClusterPinView, WorkspacePinnedItem } from '@/app/workspace/types';
import type { ClusterAggregatorInput } from '@/app/workspace/useClusterAggregator';
import type { SmartAlert } from '../../NeuralAlertsCard/types';

export type UseLawyerHomeHubCardParams = {
    lawyerId: string | null;
    shellAuthUserId?: string | null;
    clusterScanSources: ClusterScanSources;
    secretaryAlerts: SecretaryAlert[];
    alertsLoading?: boolean;
    alertsError?: string | null;
    onNavigateRoute: (routePath: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onDismissAlert?: (alertId: string) => void;
    blockOverride?: HomeBlockStyleOverride;
    themePrimary?: string;
};

export type LawyerHomeHubCardProps = UseLawyerHomeHubCardParams;

export type LawyerHomeHubCardViewModel = {
    hubPanel: HomeHubPanel;
    selectHubPanel: (panel: HomeHubPanel) => void;
    hubFullyEmpty: boolean;
    hubHasItems: boolean;
    hubInitialPending: boolean;
    hubBootSettling: boolean;
    blockClasses: string;
    blockStyle: CSSProperties;
    containerBorderOn: boolean;
    alertsTabCount: number;
    alertsEmptyState: HomeHubAlertsEmptyState;
    hasCarouselAlerts: boolean;
    hasAlerts: boolean;
    hubHorizonCounts: Record<AlertTimeHorizon, number>;
    activeFilter: AlertTimeHorizon;
    setActiveFilter: (filter: AlertTimeHorizon) => void;
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    radarUrgent: CalendarRadarEvent[];
    /** مدخلات التجميع — تُستهلك داخل مقطع التثبيت فقط */
    pinsAggregatorInput: ClusterAggregatorInput;
    pinsTabCount: number;
    cardLayout: HomeHubCardLayout;
    guardedDismissAlert?: (id: string) => void;
    guardedOpenEntity: (alert: SecretaryAlert) => void;
    guardedNavigateRoute: (routePath: string) => void;
    guardedDismissRadar: (eventId: string) => void;
    guardedUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
    guardedTogglePin: (item: WorkspacePinnedItem) => void;
    isPinned: (id: string, type: WorkspacePinnedItem['type']) => boolean;
};
