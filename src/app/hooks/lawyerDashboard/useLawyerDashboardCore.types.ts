import { useLawyerDashboardNavigation } from '@/app/hooks/useLawyerDashboardNavigation';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';
import type { LawyerDashboardOverlaysHostProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysHostBundles';
import type { LawyerDashboardShellPropsWithoutChildren } from '@/app/hooks/lawyerDashboard/buildLawyerDashboardShellProps';
import type { QuantumTasksContextValue } from '@/app/context/quantumTasksContext';
import type { LawyerDashboardHomeTab } from '@/app/components/lawyer/dashboard/LawyerDashboardHomeTab';
import type { LawyerDashboardScheduleTab } from '@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab';
import type { ComponentProps, ReactNode } from 'react';
import type { Header } from '@/app/components/lawyer/LawyerDashboardParts/components/Header';

export type UseLawyerDashboardCoreParams = LawyerDashboardShellProps & {
    /** @deprecated للتوافق — استخدم pendingFieldTasksCount + quantumTasksFingerprint */
    quantum?: QuantumTasksContextValue;
    pendingFieldTasksCount: number;
    quantumTasksFingerprint: string;
    backgroundRuntimeEnabled: boolean;
};

export type LawyerDashboardCoreViewModel =
    | { status: 'gate'; node: ReactNode }
    | { status: 'empty' }
    | {
          status: 'ready';
          shellProps: LawyerDashboardShellPropsWithoutChildren;
          notificationPanel: {
              isOpen: boolean;
              panelSessionKey: number;
              userId: string;
              onClose: () => void;
              onNavigate: ReturnType<typeof useLawyerDashboardNavigation>['handleNotificationRouting'];
              onOpenPanel: () => void;
          };
          headerProps: ComponentProps<typeof Header>;
          homeTabProps: ComponentProps<typeof LawyerDashboardHomeTab>;
          scheduleTabProps: ComponentProps<typeof LawyerDashboardScheduleTab>;
          profileTab: {
              visible: boolean;
              sessionKey: number;
              perfOpenEpoch?: number;
              onBack: () => void;
          };
          tabStackHidden: boolean;
          overlaysHostProps: LawyerDashboardOverlaysHostProps;
      };
