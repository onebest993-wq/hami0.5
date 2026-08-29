import {
    dismissHomeHubRadarId,
} from '@/app/services/alerts/homeHubRadarDismiss';
import {
    guardedHomeHubNavigateRoute,
    HOME_HUB_CARD_FEATURE,
    isSafeHomeHubNavigateRoute,
} from '@/app/services/alerts/homeHubCardLogic';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ClusterPinView, WorkspacePinnedItem } from '@/app/workspace/types';

type CreateHomeHubGuardedActionsParams = {
    signedIn: boolean;
    lawyerId: string | null;
    guardInteraction: (onProceed: () => void) => void;
    onNavigateRoute: (routePath: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onDismissAlert?: (alertId: string) => void;
    unpinItem: (id: string, type: ClusterPinView['pin']['type']) => void;
    togglePin: (item: WorkspacePinnedItem) => void;
};

type HomeHubGuardedActions = {
    guardedDismissAlert?: (id: string) => void;
    guardedOpenEntity: (alert: SecretaryAlert) => void;
    guardedNavigateRoute: (routePath: string) => void;
    guardedDismissRadar: (eventId: string) => void;
    guardedUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
    guardedTogglePin: (item: WorkspacePinnedItem) => void;
};

function toastError(message: string): void {
    void import('@/app/components/ui/SmartToast')
        .then((m) => m.SmartToast.error(message))
        .catch(() => undefined);
}

function toastWarning(message: string): void {
    void import('@/app/components/ui/SmartToast')
        .then((m) => m.SmartToast.warning(message))
        .catch(() => undefined);
}

export function createHomeHubGuardedActions({
    signedIn,
    lawyerId,
    guardInteraction,
    onNavigateRoute,
    onOpenEntity,
    onDismissAlert,
    unpinItem,
    togglePin,
}: CreateHomeHubGuardedActionsParams): HomeHubGuardedActions {
    const guardedDismissAlert = onDismissAlert
        ? (id: string) => guardInteraction(() => onDismissAlert(id))
        : undefined;
    const guardedOpenEntity = (alert: SecretaryAlert) => guardInteraction(() => onOpenEntity(alert));
    const guardedNavigateRoute = (routePath: string) => {
        if (!isSafeHomeHubNavigateRoute(routePath)) {
            if (signedIn && routePath.trim()) {
                toastWarning('تعذر فتح هذا العنصر — المسار غير صالح');
            }
            return;
        }
        guardedHomeHubNavigateRoute(routePath, signedIn, onNavigateRoute, () =>
            toastError(`يرجى تسجيل الدخول أولاً لاستخدام ${HOME_HUB_CARD_FEATURE}`),
        );
    };
    const guardedDismissRadar = (eventId: string) =>
        guardInteraction(() => dismissHomeHubRadarId(lawyerId, eventId));
    const guardedUnpin = (id: string, type: ClusterPinView['pin']['type']) =>
        guardInteraction(() => unpinItem(id, type));
    const guardedTogglePin = (item: WorkspacePinnedItem) =>
        guardInteraction(() => togglePin(item));

    return {
        guardedDismissAlert,
        guardedOpenEntity,
        guardedNavigateRoute,
        guardedDismissRadar,
        guardedUnpin,
        guardedTogglePin,
    };
}
