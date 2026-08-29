import type { LawyerDashboardNavigationBag } from '@/app/hooks/useLawyerDashboardNavigation';

const noop = () => undefined;

/** stubs خفيفة قبل first-tab-open — الجزيرة تستبدلها بعد العلامة */
export function createNavigationStubs(): LawyerDashboardNavigationBag {
    return {
        handleNotificationRouting: noop,
        openSecretaryAlert: noop,
        navigateWorkspaceRoute: noop,
    };
}
