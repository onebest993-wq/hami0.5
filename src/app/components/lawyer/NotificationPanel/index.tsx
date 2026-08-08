/**
 * NotificationPanel — إشعارات المنتدى والنظام (موبايل أولاً)
 */
import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { NotificationPanelProps } from '@/app/components/lawyer/NotificationPanel/types';
import { useNotificationPanel } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanel';
import { useNotificationFocusTrap } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationFocusTrap';
import { useNotificationPanelChrome } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelChrome';
import { NotificationHeader } from '@/app/components/lawyer/NotificationPanel/components/NotificationHeader';
import { NotificationAlertControls } from '@/app/components/lawyer/NotificationPanel/components/NotificationAlertControls';
import { NotificationTabs } from '@/app/components/lawyer/NotificationPanel/components/NotificationTabs';
import { NotificationEmptyState } from '@/app/components/lawyer/NotificationPanel/components/NotificationEmptyState';
import { NotificationList } from '@/app/components/lawyer/NotificationPanel/components/NotificationList';
import { NotificationLoadingState } from '@/app/components/lawyer/NotificationPanel/components/NotificationLoadingState';
import { NotificationErrorBoundary } from '@/app/components/lawyer/NotificationPanel/NotificationErrorBoundary';
import { CaseShareIncomingSection } from '@/app/components/lawyer/NotificationPanel/components/CaseShareIncomingSection';
import { NotificationArrivalAnnouncer } from '@/app/components/lawyer/NotificationPanel/components/NotificationArrivalAnnouncer';
import { useNotificationLifecycle } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationLifecycle';
import { useMinDisplayedLoading } from '@/app/components/lawyer/NotificationPanel/hooks/useMinDisplayedLoading';
import {
    isNotificationHeaderBusy,
    isNotificationPanelColdLoading,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationHeaderBusy';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { inertProps } from '@/app/utils/inertProps';
import { useHorizontalTabSwipe } from '@/app/utils/horizontalTabSwipe';
import { useLawyerSettings, useLawyerSettingsActions } from '@/app/context/lawyerSettings/lawyerSettingsHooks';
import {
    normalizeNotificationSettings,
    patchNotificationSettings,
    sessionMuteUntilMs,
} from '@/app/services/settings/notificationSettings';
import { isSessionMuted } from '@/app/services/notifications/notificationAlertPolicy';
import { stopHamiLegalReminderAlarm } from '@/app/services/calendar/calendarReminderAlarmSound';
import './notificationPanel.css';

export const NOTIFICATION_TAB_ORDER = ['forum', 'system'] as const;

export type { NotificationPanelProps } from '@/app/components/lawyer/NotificationPanel/types';

function NotificationPanelInner({
    isOpen,
    keepAlive = false,
    onClose,
    userId,
    onNavigate,
    panelSessionKey = 0,
}: NotificationPanelProps) {
    const {
        reduceMotion,
        keyboardInset,
        isDesktop,
        overlayTransition,
        sheetEnterTransition,
        sheetInitial,
        sheetExit,
    } = useNotificationPanelChrome();

    useBodyScrollLock(isOpen);

    const {
        activeTab,
        setActiveTab,
        unreadCount,
        isLoading,
        hasCachedNotifications,
        hasHydratedOnce,
        visibleNotifications,
        groupedByTime,
        tabCounts,
        isMarkingAllRead,
        handleTap,
        handleScan,
        handleClientRequest,
        handleMarkAllRead,
        caseShareIncoming,
        refreshCaseShares,
        hasCaseShareContent,
    } = useNotificationPanel(isOpen, userId, panelSessionKey, onClose, onNavigate);

    const { settings } = useLawyerSettings();
    const { patchSettings } = useLawyerSettingsActions();
    const [alertControlsOpen, setAlertControlsOpen] = useState(false);
    const isAlertsMuted = isSessionMuted(settings);

    const handleQuickMute = () => {
        stopHamiLegalReminderAlarm();
        patchSettings((prev) => ({
            ...prev,
            notifications: patchNotificationSettings(
                normalizeNotificationSettings(prev.notifications),
                {
                    sessionMutedUntil: sessionMuteUntilMs(60),
                },
            ),
        }));
    };

    useNotificationLifecycle(isOpen);

    const panelRef = useRef<HTMLDivElement>(null);
    const { onKeyDownCapture } = useNotificationFocusTrap(isOpen, panelRef, onClose);

    const sheetDragEnabled = isOpen && !isDesktop && !reduceMotion;

    const showHeaderBusy = isNotificationHeaderBusy(
        isLoading,
        hasCachedNotifications || hasHydratedOnce,
    );
    const showListLoading = useMemo(
        () =>
            isNotificationPanelColdLoading(
                isLoading,
                visibleNotifications.length,
                hasCaseShareContent,
                hasHydratedOnce,
            ),
        [hasCaseShareContent, hasHydratedOnce, isLoading, visibleNotifications.length],
    );
    const displayListLoading = useMinDisplayedLoading(
        showListLoading,
        hasHydratedOnce || hasCachedNotifications ? 80 : 360,
    );

    const { swipeHandlers: tabSwipeHandlers } = useHorizontalTabSwipe({
        order: NOTIFICATION_TAB_ORDER,
        activeId: activeTab,
        onChange: setActiveTab,
        enabled: isOpen,
    });

    const mounted = isOpen || keepAlive;
    if (!mounted) {
        return null;
    }

    const panelContent = (
        <>
            <motion.button
                type="button"
                aria-label="إغلاق الإشعارات"
                className="hami-notif-overlay-btn absolute inset-0"
                initial={reduceMotion || keepAlive ? false : { opacity: 0 }}
                animate={{ opacity: isOpen ? 1 : 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, pointerEvents: 'none' as const }}
                transition={overlayTransition}
                onClick={onClose}
            />

            <motion.div
                ref={panelRef}
                role="dialog"
                aria-label="الإشعارات"
                aria-modal={isOpen ? 'true' : undefined}
                aria-busy={showListLoading || undefined}
                data-testid="notification-panel"
                onKeyDownCapture={onKeyDownCapture}
                drag={sheetDragEnabled ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.38 }}
                onDragEnd={(
                    _event: unknown,
                    info: { offset: { y: number }; velocity: { y: number } },
                ) => {
                    if (info.offset.y > 108 || info.velocity.y > 620) onClose();
                }}
                initial={keepAlive && !isOpen ? false : sheetInitial}
                animate={{ x: 0, y: 0, opacity: isOpen ? 1 : 0 }}
                exit={sheetExit}
                transition={sheetEnterTransition}
                style={{ marginBottom: !isDesktop && keyboardInset > 0 ? keyboardInset : undefined }}
                className="hami-notif-sheet relative w-full sm:max-w-[420px] flex flex-col overflow-hidden touch-pan-y pb-[max(12px,env(safe-area-inset-bottom))]"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <div
                    className="hami-notif-fx-orb pointer-events-none absolute -top-24 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#E6C673]/[0.06] blur-3xl"
                    aria-hidden
                />

                <NotificationHeader
                    unreadCount={unreadCount}
                    showHeaderBusy={showHeaderBusy}
                    isMarkingAllRead={isMarkingAllRead}
                    onMarkAllRead={handleMarkAllRead}
                    onClose={onClose}
                    showDragHandle={!isDesktop}
                    alertControlsOpen={alertControlsOpen}
                    isAlertsMuted={isAlertsMuted}
                    onToggleAlertControls={() => setAlertControlsOpen((v) => !v)}
                    onQuickMute={handleQuickMute}
                />

                <NotificationAlertControls
                    open={alertControlsOpen}
                    onClose={() => setAlertControlsOpen(false)}
                />

                <NotificationArrivalAnnouncer />

                <NotificationTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    tabCounts={tabCounts}
                />

                <div
                    id="notification-panel-tabpanel"
                    role="tabpanel"
                    aria-labelledby={`notification-tab-${activeTab}`}
                    className="hami-notif-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 touch-pan-y"
                    data-testid="notification-panel-tabpanel"
                    {...tabSwipeHandlers}
                >
                    <CaseShareIncomingSection
                        userId={userId}
                        shares={caseShareIncoming}
                        onChanged={refreshCaseShares}
                    />
                    <AnimatePresence mode="wait" initial={false}>
                        {displayListLoading ? (
                            <motion.div
                                key="notif-loading"
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={reduceMotion ? undefined : { opacity: 0 }}
                                transition={{ duration: reduceMotion ? 0 : 0.18 }}
                            >
                                <NotificationLoadingState />
                            </motion.div>
                        ) : visibleNotifications.length === 0 ? (
                            <motion.div
                                key="notif-empty"
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={reduceMotion ? undefined : { opacity: 0 }}
                                transition={{ duration: reduceMotion ? 0 : 0.22 }}
                            >
                                <NotificationEmptyState tab={activeTab} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="notif-list"
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={reduceMotion ? undefined : { opacity: 0 }}
                                transition={{ duration: reduceMotion ? 0 : 0.18 }}
                            >
                                <NotificationList
                                    groupedByTime={groupedByTime}
                                    onTap={handleTap}
                                    onScan={handleScan}
                                    onClientRequest={handleClientRequest}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </>
    );

    if (keepAlive) {
        return (
            <div
                className="hami-notif-root fixed inset-0 z-[100] flex flex-col justify-end sm:justify-start sm:items-end sm:pe-4 sm:pb-6 overscroll-none"
                role="presentation"
                aria-hidden={!isOpen}
                {...inertProps(!isOpen)}
                style={
                    isOpen
                        ? undefined
                        : {
                              opacity: 0,
                              visibility: 'hidden',
                              pointerEvents: 'none',
                          }
                }
            >
                {panelContent}
            </div>
        );
    }

    return (
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, pointerEvents: 'none' as const }}
                    transition={overlayTransition}
                    className="hami-notif-root fixed inset-0 z-[100] flex flex-col justify-end sm:justify-start sm:items-end sm:pe-4 sm:pb-6 overscroll-none"
                    role="presentation"
                >
                    {panelContent}
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

export function NotificationPanel(props: NotificationPanelProps) {
    return (
        <NotificationErrorBoundary onClose={props.onClose}>
            <NotificationPanelInner {...props} />
        </NotificationErrorBoundary>
    );
}
