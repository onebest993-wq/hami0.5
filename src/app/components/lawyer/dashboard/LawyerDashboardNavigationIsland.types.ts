import type {
    LawyerDashboardNavigationBag,
    UseLawyerDashboardNavigationParams,
} from '@/app/hooks/useLawyerDashboardNavigation';

export type LawyerDashboardNavigationIslandProps = {
    params: UseLawyerDashboardNavigationParams;
    onReady: (bag: LawyerDashboardNavigationBag) => void;
};

export type { LawyerDashboardNavigationBag };
