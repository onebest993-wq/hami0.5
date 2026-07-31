import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    dismissHomeHubRadarId,
} from '@/app/services/alerts/homeHubRadarDismiss';
import {
    guardedHomeHubNavigateRoute,
    HOME_HUB_CARD_FEATURE,
    isSafeHomeHubNavigateRoute,
} from '@/app/services/alerts/homeHubCardLogic';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ClusterPinView } from '@/app/workspace/types';

export type CreateHomeHubGuardedActionsParams = {
    signedIn: boolean;
    lawyerId: string | null;
    guardInteraction: (onProceed: () => void) => void;
    onNavigateRoute: (routePath: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onDismissAlert?: (alertId: string) => void;
    onAcceptedConvertToCase?: (alert: SecretaryAlert) => void;
    onResolved?: (alert: SecretaryAlert) => void;
    unpinItem: (id: string, type: ClusterPinView['pin']['type']) => void;
};

export type HomeHubGuardedActions = {
    guardedDismissAlert?: (id: string) => void;
    guardedOpenEntity: (alert: SecretaryAlert) => void;
    guardedAcceptedConvertToCase?: (alert: SecretaryAlert) => void;
    guardedResolved?: (alert: SecretaryAlert) => void;
    guardedNavigateRoute: (routePath: string) => void;
    guardedDismissRadar: (eventId: string) => void;
    guardedUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
};

export function createHomeHubGuardedActions({
    signedIn,
    lawyerId,
    guardInteraction,
    onNavigateRoute,
    onOpenEntity,
    onDismissAlert,
    onAcceptedConvertToCase,
    onResolved,
    unpinItem,
}: CreateHomeHubGuardedActionsParams): HomeHubGuardedActions {
    const guardedDismissAlert = onDismissAlert
        ? (id: string) => guardInteraction(() => onDismissAlert(id))
        : undefined;
    const guardedOpenEntity = (alert: SecretaryAlert) => guardInteraction(() => onOpenEntity(alert));
    const guardedAcceptedConvertToCase = onAcceptedConvertToCase
        ? (alert: SecretaryAlert) => guardInteraction(() => onAcceptedConvertToCase(alert))
        : undefined;
    const guardedResolved = onResolved
        ? (alert: SecretaryAlert) => guardInteraction(() => onResolved(alert))
        : undefined;
    const guardedNavigateRoute = (routePath: string) => {
        if (!isSafeHomeHubNavigateRoute(routePath)) {
            if (signedIn && routePath.trim()) {
                SmartToast.warning('تعذر فتح هذا العنصر — المسار غير صالح');
            }
            return;
        }
        guardedHomeHubNavigateRoute(routePath, signedIn, onNavigateRoute, () =>
            SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${HOME_HUB_CARD_FEATURE}`),
        );
    };
    const guardedDismissRadar = (eventId: string) =>
        guardInteraction(() => dismissHomeHubRadarId(lawyerId, eventId));
    const guardedUnpin = (id: string, type: ClusterPinView['pin']['type']) =>
        guardInteraction(() => unpinItem(id, type));

    return {
        guardedDismissAlert,
        guardedOpenEntity,
        guardedAcceptedConvertToCase,
        guardedResolved,
        guardedNavigateRoute,
        guardedDismissRadar,
        guardedUnpin,
    };
}
