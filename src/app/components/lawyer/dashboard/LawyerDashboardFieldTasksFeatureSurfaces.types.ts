import type { DeferredFieldTasks } from '@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.types';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { Dispatch, SetStateAction } from 'react';

export type FieldTasksFeatureSurfacesParams = {
    userId: string | null;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    closeCommunity: () => void;
};

export type LawyerDashboardFieldTasksFeatureSurfacesProps = {
    earlyArm: boolean;
    forceArm: boolean;
    params: FieldTasksFeatureSurfacesParams;
    onReady: (fieldTasks: DeferredFieldTasks) => void;
};
