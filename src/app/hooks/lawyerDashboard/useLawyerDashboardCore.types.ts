import { useLawyerDashboardNavigation } from '@/app/hooks/useLawyerDashboardNavigation';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';
import type { LawyerDashboardOverlaysHostProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysHostBundles';
import type { LawyerDashboardShellPropsWithoutChildren } from '@/app/hooks/lawyerDashboard/buildLawyerDashboardShellProps';
import type { QuantumTasksContextValue } from '@/app/context/quantumTasksContext';
import type { ComponentProps, ReactNode } from 'react';
import type { LawyerDashboardHomeTab } from '@/app/components/lawyer/dashboard/LawyerDashboardHomeTab';
import type { LawyerDashboardScheduleTab } from '@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab';
import type { Header } from '@/app/components/lawyer/LawyerDashboardParts/components/Header';

export type UseLawyerDashboardCoreParams = LawyerDashboardShellProps & {
    quantum: QuantumTasksContextValue;
    backgroundRuntimeEnabled: boolean;
};

export type LawyerDashboardCoreViewModel =
    | { status: 'gate'; node: ReactNode }
    | { status: 'empty' }
    | {
          status: 'ready';
          shellProps: LawyerDashboardShellPropsWithoutChildren;
          notificationPanel: {
              mounted: boolean;
              isOpen: boolean;
              userId: string;
              onClose: () => void;
              onNavigate: ReturnType<typeof useLawyerDashboardNavigation>['handleNotificationRouting'];
          };
          headerProps: ComponentProps<typeof Header>;
          homeTabProps: ComponentProps<typeof LawyerDashboardHomeTab>;
          scheduleTabProps: ComponentProps<typeof LawyerDashboardScheduleTab>;
          profileTabVisible: boolean;
          onProfileBack: () => void;
          tabStackHidden: boolean;
          overlaysHostProps: LawyerDashboardOverlaysHostProps;
      };
