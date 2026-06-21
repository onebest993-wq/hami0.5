/**
 * NotificationPanel — إشعارات المنتدى والنظام
 *
 * سجل النشاطات (audit_log) أُزيل من المنتج.
 * التبويبات: المنتدى | النظام — وارد حقيقي فقط (لا إجراءات ذاتية).
 */
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { NotificationPanelProps } from '@/app/components/lawyer/NotificationPanel/types';
import { useNotificationPanel } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanel';
import { useNotificationFocusTrap } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationFocusTrap';
import { NotificationHeader } from '@/app/components/lawyer/NotificationPanel/components/NotificationHeader';
import { NotificationTabs } from '@/app/components/lawyer/NotificationPanel/components/NotificationTabs';
import { NotificationEmptyState } from '@/app/components/lawyer/NotificationPanel/components/NotificationEmptyState';
import { NotificationList } from '@/app/components/lawyer/NotificationPanel/components/NotificationList';
import { NotificationLoadingState } from '@/app/components/lawyer/NotificationPanel/components/NotificationLoadingState';
import { NotificationErrorBoundary } from '@/app/components/lawyer/NotificationPanel/NotificationErrorBoundary';
import { CaseShareIncomingSection } from '@/app/components/lawyer/NotificationPanel/components/CaseShareIncomingSection';

export type { NotificationPanelProps } from '@/app/components/lawyer/NotificationPanel/types';

function NotificationPanelInner({
    isOpen,
    onClose,
    userId,
    onNavigate,
}: NotificationPanelProps) {
    const {
        activeTab,
        setActiveTab,
        unreadCount,
        isLoading,
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
    } = useNotificationPanel(isOpen, userId, onClose, onNavigate);

    const panelRef = useRef<HTMLDivElement>(null);
    const { onKeyDownCapture } = useNotificationFocusTrap(isOpen, panelRef, onClose);

    const showLoading = isLoading && visibleNotifications.length === 0;

    return (
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-start sm:items-center sm:px-4 sm:pt-[10vh] sm:pb-8"
                    role="presentation"
                >
                    <motion.button
                        type="button"
                        aria-label="إغلاق الإشعارات"
                        className="absolute inset-0 bg-[#010308]/75 backdrop-blur-[18px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-label="الإشعارات"
                        aria-modal="true"
                        aria-busy={showLoading}
                        data-testid="notification-panel"
                        onKeyDownCapture={onKeyDownCapture}
                        initial={{ y: '100%', opacity: 0.6 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                        className="relative w-full sm:max-w-lg max-h-[88dvh] flex flex-col rounded-t-[28px] sm:rounded-3xl overflow-hidden border-t border-x border-[#E6C673]/12 sm:border bg-[#080D18]/98 backdrop-blur-2xl shadow-[0_-12px_60px_rgba(0,0,0,0.65),0_0_48px_rgba(230,198,115,0.05)] pb-[max(12px,env(safe-area-inset-bottom))]"
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
                            isMarkingAllRead={isMarkingAllRead}
                            onMarkAllRead={handleMarkAllRead}
                            onClose={onClose}
                        />

                        <NotificationTabs
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            tabCounts={tabCounts}
                        />

                        <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar min-h-0">
                            <CaseShareIncomingSection
                                userId={userId}
                                shares={caseShareIncoming}
                                onChanged={refreshCaseShares}
                            />
                            {showLoading ? (
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
