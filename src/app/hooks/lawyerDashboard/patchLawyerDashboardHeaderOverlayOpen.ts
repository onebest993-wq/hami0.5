import type { LawyerDashboardCoreViewModel } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';
import {
    computeLawyerDashboardHeaderShouldShow,
    type LawyerDashboardHeaderVisibilityInput,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardHeaderVisibility';
import {
    isLawyerDashboardTabMounted,
    shouldMaskLawyerDashboardTabStack,
    type LawyerDashboardTabStackMaskState,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardTabStack';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

export type LawyerDashboardHeaderOverlayPatchInput = {
    showSettings: boolean;
    showGlobalSearch: boolean;
    showCommunity?: boolean;
    showNotifications: boolean;
    notificationsUnreadCount: number;
    activeTab: LawyerDashboardTab;
    tabStackMask: LawyerDashboardTabStackMaskState;
    headerVisibility: LawyerDashboardHeaderVisibilityInput;
};

type ReadyView = Extract<LawyerDashboardCoreViewModel, { status: 'ready' }>;

/** تحديث خفيف لحالة فتح overlays الهيدر — بلا إعادة تجميع كاملة للوحة. */
export function patchLawyerDashboardHeaderOverlayOpen(
    view: ReadyView,
    input: LawyerDashboardHeaderOverlayPatchInput,
): ReadyView {
    const tabStackHidden = shouldMaskLawyerDashboardTabStack(input.tabStackMask);
    const headerShouldShow = computeLawyerDashboardHeaderShouldShow(input.headerVisibility);
    const homeTabBaseActive = input.activeTab === 'home';
    const scheduleTabBaseActive = input.activeTab === 'schedule';
    const homeTabMounted = isLawyerDashboardTabMounted(homeTabBaseActive, input.tabStackMask);
    const scheduleTabMounted = isLawyerDashboardTabMounted(scheduleTabBaseActive, input.tabStackMask);
    const overlaysBundleOverlayChanged =
        view.overlaysBundle.overlays.showSettings !== input.showSettings ||
        view.overlaysBundle.overlays.showGlobalSearch !== input.showGlobalSearch;

    if (
        view.tabStackHidden === tabStackHidden &&
        view.headerProps.shouldShow === headerShouldShow &&
        view.notificationPanel.isOpen === input.showNotifications &&
        view.headerProps.unreadCount === input.notificationsUnreadCount &&
        view.overlaysBundle.overlays.showSettings === input.showSettings &&
        view.overlaysBundle.overlays.showGlobalSearch === input.showGlobalSearch &&
        view.homeTabProps.visible === homeTabMounted &&
        view.scheduleTabProps.visible === scheduleTabMounted
    ) {
        return view;
    }

    return {
        ...view,
        headerProps: {
            ...view.headerProps,
            shouldShow: headerShouldShow,
            unreadCount: input.notificationsUnreadCount,
        },
        tabStackHidden,
        homeTabProps: {
            ...view.homeTabProps,
            visible: homeTabMounted,
        },
        scheduleTabProps: {
            ...view.scheduleTabProps,
            visible: scheduleTabMounted,
        },
        notificationPanel: {
            ...view.notificationPanel,
            isOpen: input.showNotifications,
        },
        overlaysBundle: overlaysBundleOverlayChanged
            ? {
                  ...view.overlaysBundle,
                  overlays: {
                      ...view.overlaysBundle.overlays,
                      showSettings: input.showSettings,
                      showGlobalSearch: input.showGlobalSearch,
                  },
              }
            : view.overlaysBundle,
    };
}
