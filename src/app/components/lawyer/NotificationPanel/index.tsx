/**
 * NotificationPanel — إشعارات المنتدى والنظام
 *
 * سجل النشاطات (audit_log) أُزيل من المنتج.
 * التبويبات: المنتدى | النظام — وارد حقيقي فقط (لا إجراءات ذاتية).
 */
import React, { useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { NotificationPanelProps } from '@/app/components/lawyer/NotificationPanel/types';
import { useNotificationPanel } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanel';
import { useNotificationFocusTrap } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationFocusTrap';
import { useNotificationPanelChrome } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelChrome';
import { NotificationHeader } from '@/app/components/lawyer/NotificationPanel/components/NotificationHeader';
import { NotificationTabs } from '@/app/components/lawyer/NotificationPanel/components/NotificationTabs';
import { NotificationEmptyState } from '@/app/components/lawyer/NotificationPanel/components/NotificationEmptyState';
import { NotificationList } from '@/app/components/lawyer/NotificationPanel/components/NotificationList';
import { NotificationLoadingState } from '@/app/components/lawyer/NotificationPanel/components/NotificationLoadingState';
import { NotificationErrorBoundary } from '@/app/components/lawyer/NotificationPanel/NotificationErrorBoundary';
import { CaseShareIncomingSection } from '@/app/components/lawyer/NotificationPanel/components/CaseShareIncomingSection';
import { NotificationArrivalAnnouncer } from '@/app/components/lawyer/NotificationPanel/components/NotificationArrivalAnnouncer';
import { useNotificationLifecycle } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationLifecycle';
import {
    isNotificationHeaderBusy,
    isNotificationPanelColdLoading,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationHeaderBusy';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';

export type { NotificationPanelProps } from '@/app/components/lawyer/NotificationPanel/types';

function NotificationPanelInner({
    isOpen,
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

    useNotificationLifecycle(isOpen);

    const panelRef = useRef<HTMLDivElement>(null);
    const { onKeyDownCapture } = useNotificationFocusTrap(isOpen, panelRef, onClose);

    const showHeaderBusy = isNotificationHeaderBusy(isLoading, hasCachedNotifications);
    const showListLoading = useMemo(
        () =>
            isNotificationPanelColdLoading(
                isLoading,
                visibleNotifications.length,
                hasCaseShareContent,
            ),
        [hasCaseShareContent, isLoading, visibleNotifications.length],
    );

    return (
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, pointerEvents: 'none' as const }}
                    transition={overlayTransition}
                    className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-start sm:items-end sm:px-0 sm:pt-[max(72px,env(safe-area-inset-top))] sm:pe-4 sm:pb-6 overscroll-none"
                    role="presentation"
                >
                    <motion.button
                        type="button"
                        aria-label="إغلاق الإشعارات"
                        className="absolute inset-0 bg-[#010308]/70 backdrop-blur-xl sm:bg-[#010308]/55"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0, pointerEvents: 'none' as const }}
                        transition={overlayTransition}
                        onClick={onClose}
                    />

                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-label="الإشعارات"
                        aria-modal="true"
                        aria-busy={showListLoading || undefined}
                        data-testid="notification-panel"
                        onKeyDownCapture={onKeyDownCapture}
                        initial={sheetInitial}
                        animate={{ x: 0, y: 0, opacity: 1 }}
                        exit={sheetExit}
                        transition={sheetEnterTransition}
                        style={{ marginBottom: !isDesktop && keyboardInset > 0 ? keyboardInset : undefined }}
                        className="relative w-full sm:max-w-[420px] max-h-[88dvh] sm:max-h-[min(82dvh,720px)] flex flex-col rounded-t-[28px] sm:rounded-3xl overflow-hidden border-t border-x border-[#E6C673]/15 sm:border bg-[#080D18]/96 backdrop-blur-3xl shadow-[0_-16px_64px_rgba(0,0,0,0.7),0_0_56px_rgba(230,198,115,0.06)] sm:shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_48px_rgba(230,198,115,0.08)] pb-[max(12px,env(safe-area-inset-bottom))]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#E6C673]/[0.05] blur-3xl"
                            aria-hidden
                        />
                        <div
                            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#E6C673]/[0.04] to-transparent"
                            aria-hidden
                        />

                        <NotificationHeader
                            unreadCount={unreadCount}
                            showHeaderBusy={showHeaderBusy}
                            isMarkingAllRead={isMarkingAllRead}
                            onMarkAllRead={handleMarkAllRead}
                            onClose={onClose}
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
                            className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar min-h-0 overscroll-contain"
                        >
                            <CaseShareIncomingSection
                                userId={userId}
                                shares={caseShareIncoming}
                                onChanged={refreshCaseShares}
                            />
                            {showListLoading ? (
                                <NotificationLoadingState />
                            ) : visibleNotifications.length === 0 ? (
                                <NotificationEmptyState tab={activeTab} />
                            ) : (
                                <NotificationList
                                    groupedByTime={groupedByTime}
                                    onTap={handleTap}
                                    onScan={handleScan}
                                    onClientRequest={handleClientRequest}
                                />
                            )}
                        </div>
                    </motion.div>
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
