import type { useLawyerDashboardCommunity } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCommunity';
import type { useLawyerDashboardScheduleTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';
import type { useLawyerDashboardRepository } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { Dispatch, SetStateAction } from 'react';

export type PreDockCommunity = ReturnType<typeof useLawyerDashboardCommunity>;
export type PreDockSchedule = ReturnType<typeof useLawyerDashboardScheduleTab>;
export type PreDockRepository = ReturnType<typeof useLawyerDashboardRepository>;

export type PreDockFeatureBag = {
    community: PreDockCommunity;
    schedule: PreDockSchedule;
    repository: PreDockRepository;
};

export type PreDockPendingOp = 'community' | 'schedule' | 'repository' | null;

export type PreDockFeatureSurfacesParams = {
    userId: string | null;
    activeTab: LawyerDashboardTab;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
};

export type LawyerDashboardPreDockFeatureSurfacesProps = {
    earlyArm: boolean;
    forceArm: boolean;
    params: PreDockFeatureSurfacesParams;
    onReady: (bag: PreDockFeatureBag) => void;
};
