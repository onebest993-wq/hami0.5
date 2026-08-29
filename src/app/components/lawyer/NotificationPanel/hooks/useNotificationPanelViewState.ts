import { useMemo } from 'react';
import {
    isNotificationHeaderBusy,
    isNotificationPanelColdLoading,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationHeaderBusy';
import { resolveNotificationPanelBodyView } from '@/app/components/lawyer/NotificationPanel/utils/resolveNotificationPanelBodyView';

type Input = {
    isInboxRoute: boolean;
    isLoading: boolean;
    visibleCount: number;
    hasCaseShareContent: boolean;
    hasHydratedOnce: boolean;
    hasCachedNotifications: boolean;
};

/** اشتقاق busy / loading / body view للوحة — خارج المُنسّق */
export function useNotificationPanelViewState({
    isInboxRoute,
    isLoading,
    visibleCount,
    hasCaseShareContent,
    hasHydratedOnce,
    hasCachedNotifications,
}: Input) {
    const showHeaderBusy = isNotificationHeaderBusy(
        isLoading,
        hasCachedNotifications || hasHydratedOnce,
    );

    const showListLoading = useMemo(
        () =>
            isInboxRoute &&
            isNotificationPanelColdLoading(
                isLoading,
                visibleCount,
                hasCaseShareContent,
                hasHydratedOnce,
            ),
        [hasCaseShareContent, hasHydratedOnce, isInboxRoute, isLoading, visibleCount],
    );

    const panelBodyView = useMemo(
        () =>
            resolveNotificationPanelBodyView({
                displayListLoading: showListLoading,
                visibleCount,
            }),
        [showListLoading, visibleCount],
    );

    return {
        showHeaderBusy,
        showListLoading,
        panelBodyView,
    };
}
