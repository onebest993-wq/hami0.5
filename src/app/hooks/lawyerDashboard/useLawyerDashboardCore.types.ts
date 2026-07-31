import { useLawyerDashboardNavigation } from '@/app/hooks/useLawyerDashboardNavigation';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
import type { LawyerDashboardPostInteractiveRuntimeProps } from '@/app/components/lawyer/dashboard/LawyerDashboardPostInteractiveRuntime.types';
import type { LawyerDashboardDeferredFeatureSurfacesProps } from '@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.types';
import type { LawyerDashboardShellPropsWithoutChildren } from '@/app/hooks/lawyerDashboard/buildLawyerDashboardShellProps';
import type { QuantumTasksContextValue } from '@/app/context/quantumTasksContext';
import type { LawyerDashboardHomeTab } from '@/app/components/lawyer/dashboard/LawyerDashboardHomeTab';
import type { LawyerDashboardScheduleTab } from '@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab';
import type { ComponentProps, ReactNode } from 'react';
import type { Header } from '@/app/components/lawyer/LawyerDashboardParts/components/Header';
import type { User } from '@supabase/supabase-js';

export type UseLawyerDashboardCoreParams = LawyerDashboardShellProps & {
    /** @deprecated للتوافق — استخدم pendingFieldTasksCount + quantumTasksFingerprint */
    quantum?: QuantumTasksContextValue;
    authUser?: User | null;
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
              hostMounted?: boolean;
              panelSessionKey: number;
              userId: string;
              onClose: () => void;
              onNavigate: ReturnType<typeof useLawyerDashboardNavigation>['handleNotificationRouting'];
              onOpenPanel: () => void;
          };
          headerProps: ComponentProps<typeof Header>;
          homeTabProps: ComponentProps<typeof LawyerDashboardHomeTab>;
          scheduleTabProps: ComponentProps<typeof LawyerDashboardScheduleTab>;
          /** Host التقويم مركّب مخفياً — فتح فوري / استعادة بعد F5 */
          scheduleHostMounted: boolean;
          /** Host الملف المهني مركّب مخفياً — فتح فوري / استعادة بعد F5 */
          profileHostMounted: boolean;
          profileTab: {
              visible: boolean;
              sessionKey: number;
              perfOpenEpoch?: number;
              onBack: () => void;
              keepAlive?: boolean;
          };
          tabStackHidden: boolean;
          overlaysBundle: LawyerDashboardOverlaysBundleProps;
          postInteractiveRuntimeProps: LawyerDashboardPostInteractiveRuntimeProps;
          deferredFeatureSurfacesProps: LawyerDashboardDeferredFeatureSurfacesProps;
      };
