import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { NotificationPanelProps } from '@/app/components/lawyer/NotificationPanel/types';
import { useNotificationPanel } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanel';
import { useNotificationFocusTrap } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationFocusTrap';
import { useNotificationPanelChrome } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelChrome';
import { useNotificationPanelRoute } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelRoute';
import { useNotificationPanelViewState } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelViewState';
import { useNotificationLayeredEscape } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationLayeredEscape';
import { NotificationHeader } from '@/app/components/lawyer/NotificationPanel/components/NotificationHeader';
import { NotificationTabs } from '@/app/components/lawyer/NotificationPanel/components/NotificationTabs';
import { NotificationArrivalAnnouncer } from '@/app/components/lawyer/NotificationPanel/components/NotificationArrivalAnnouncer';
import { NotificationPanelRoot } from '@/app/components/lawyer/NotificationPanel/components/NotificationPanelRoot';
import { NotificationPanelSheet } from '@/app/components/lawyer/NotificationPanel/components/NotificationPanelSheet';
import { NotificationPanelScrollRegion } from '@/app/components/lawyer/NotificationPanel/components/NotificationPanelScrollRegion';
import { NotificationErrorBoundary } from '@/app/components/lawyer/NotificationPanel/NotificationErrorBoundary';
import { NOTIFICATION_TAB_ORDER } from '@/app/components/lawyer/NotificationPanel/notificationPanelLayout';
import { loadCaseSharePanelSectionModule } from '@/app/components/lawyer/NotificationPanel/notificationPanelLazyModules';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useHorizontalTabSwipe } from '@/app/utils/horizontalTabSwipe';
import { OVERLAY_EDGE_GESTURE_PX } from '@/app/runtime/overlayEdgeBackGesture';
import { useLawyerSettings } from '@/app/context/lawyerSettings/lawyerSettingsHooks';
import { isSessionMuted } from '@/app/services/notifications/notificationSessionMute';
import { isNotificationShellSnappedOpen } from '@/app/services/notifications/notificationShellSnap';
import { useNotificationPanelKeyboardInsetScroll } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelKeyboardInsetScroll';
import './notificationPanel.css';

export type { NotificationPanelProps } from '@/app/components/lawyer/NotificationPanel/types';

function NotificationPanelInner({
    isOpen,
    keepAlive = false,
    onClose,
    userId,
    onNavigate,
}: NotificationPanelProps) {
    const {
        reduceMotion,
        keyboardInset,
        isDesktop,
        overlayTransition,
        sheetEnterTransition,
        sheetInitial,
        sheetExit,
    } = useNotificationPanelChrome(isOpen);

    const [snapEpoch, setSnapEpoch] = useState(0);
    useLayoutEffect(() => {
        if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
        const bump = () => setSnapEpoch((n) => n + 1);
        bump();
        const observer = new MutationObserver(bump);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-hami-notifications-open'],
        });
        return () => observer.disconnect();
    }, []);
    const surfaceOpen = isOpen && snapEpoch >= 0 && isNotificationShellSnappedOpen();

    useBodyScrollLock(surfaceOpen);

    const panel = useNotificationPanel(isOpen, userId, onClose, onNavigate);
    const route = useNotificationPanelRoute(isOpen);
    const { settings } = useLawyerSettings();
    const isAlertsMuted = isSessionMuted(settings);

    const handleEscapeOrBack = useNotificationLayeredEscape(
        route.isInboxRoute,
        route.backToInbox,
        onClose,
    );

    useEffect(() => {
        if (!isOpen) return;
        void loadCaseSharePanelSectionModule();
    }, [isOpen]);

    const panelRef = useRef<HTMLDivElement>(null);
    const { onKeyDownCapture } = useNotificationFocusTrap(surfaceOpen, panelRef, handleEscapeOrBack);
    useNotificationPanelKeyboardInsetScroll(panelRef, surfaceOpen, isDesktop, keyboardInset);

    const viewState = useNotificationPanelViewState({
        isInboxRoute: route.isInboxRoute,
        isLoading: panel.isLoading,
        visibleCount: panel.visibleNotifications.length,
        hasCaseShareContent: panel.hasCaseShareContent,
        hasHydratedOnce: panel.hasHydratedOnce,
        hasCachedNotifications: panel.hasCachedNotifications,
    });

    const { swipeHandlers: tabSwipeHandlers } = useHorizontalTabSwipe({
        order: NOTIFICATION_TAB_ORDER,
        activeId: panel.activeTab,
        onChange: panel.setActiveTab,
        enabled: surfaceOpen && route.isInboxRoute,
        ignoreInlineStartEdgePx: OVERLAY_EDGE_GESTURE_PX,
    });

    if (!(isOpen || keepAlive)) {
        return null;
    }

    return (
        <NotificationPanelRoot isOpen={surfaceOpen} keepAlive={keepAlive}>
            <NotificationPanelSheet
                panelRef={panelRef}
                isOpen={surfaceOpen}
                keepAlive={keepAlive}
                isInboxRoute={route.isInboxRoute}
                panelRoute={route.panelRoute}
                showListLoading={viewState.showListLoading}
                sheetDragEnabled={surfaceOpen && !isDesktop && !reduceMotion && route.isInboxRoute}
                reduceMotion={reduceMotion}
                keyboardInset={keyboardInset}
                isDesktop={isDesktop}
                overlayTransition={overlayTransition}
                sheetEnterTransition={sheetEnterTransition}
                sheetInitial={sheetInitial}
                sheetExit={sheetExit}
                onClose={onClose}
                onKeyDownCapture={onKeyDownCapture}
            >
                <NotificationHeader
                    panelRoute={route.panelRoute}
                    unreadCount={panel.unreadCount}
                    showHeaderBusy={viewState.showHeaderBusy}
                    isMarkingAllRead={panel.isMarkingAllRead}
                    onMarkAllRead={panel.handleMarkAllRead}
                    onClose={onClose}
                    showDragHandle={!isDesktop && route.isInboxRoute}
                    isAlertsMuted={isAlertsMuted}
                    onPrefetchAlertControls={route.prefetchAlertControls}
                    onNavigateToAlertControls={route.navigateToAlertControls}
                    onBackToInbox={route.backToInbox}
                />

                <NotificationArrivalAnnouncer />

                <div
                    className={route.isInboxRoute ? undefined : 'hami-notif-tabs-slot--hidden'}
                    aria-hidden={!route.isInboxRoute}
                >
                    <NotificationTabs
                        activeTab={panel.activeTab}
                        onTabChange={panel.setActiveTab}
                        tabCounts={panel.tabCounts}
                    />
                </div>

                <NotificationPanelScrollRegion
                    panelRoute={route.panelRoute}
                    isInboxRoute={route.isInboxRoute}
                    reduceMotion={reduceMotion}
                    userId={userId}
                    hasCaseShareContent={panel.hasCaseShareContent}
                    caseShareAll={panel.caseShareAll}
                    onCaseShareChanged={panel.refreshCaseShares}
                    activeTab={panel.activeTab}
                    view={viewState.panelBodyView}
                    groupedByTime={panel.groupedByTime}
                    onTap={panel.handleTap}
                    onScan={panel.handleScan}
                    tabSwipeHandlers={tabSwipeHandlers}
                    contentArmed={isOpen}
                    ensureId={panel.focusNotificationId}
                />
            </NotificationPanelSheet>
        </NotificationPanelRoot>
    );
}

export function NotificationPanel(props: NotificationPanelProps) {
    return (
        <NotificationErrorBoundary onClose={props.onClose}>
            <NotificationPanelInner {...props} />
        </NotificationErrorBoundary>
    );
}
