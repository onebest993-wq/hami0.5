import React, { Suspense } from 'react';
import { motion } from 'motion/react';
import type { ElementType } from 'react';
import { X } from 'lucide-react';
import type { TimelineEvent } from '@/app/types/execution';

type PremiumTimelineAuditLogComponent = React.ComponentType<{
    events: TimelineEvent[];
    onTogglePin: (ev: TimelineEvent) => void;
    onRequestTrash: (ev: TimelineEvent) => void;
    onRequestEdit: (ev: TimelineEvent) => void;
    isHistoricalMode: boolean;
    onRequestHistoricalPreview: (event: TimelineEvent) => void;
}>;

export interface ExecutionFullTimelineModalContainerProps {
    showTimelineModal: boolean;
    setShowTimelineModal: (show: boolean) => void;
    debtorBrowserTabsMode: boolean;
    activeTimelineEventsDebtorScoped: TimelineEvent[];
    activeTimelineEvents: TimelineEvent[];
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    PremiumTimelineAuditLog: PremiumTimelineAuditLogComponent;
    History: ElementType;
    toggleTimelineEventPin: (ev: TimelineEvent) => void;
    moveTimelineEventToTrash: (ev: TimelineEvent) => void;
    onRequestEditTimelineEvent: (ev: TimelineEvent) => void;
    isHistoricalMode: boolean;
    handleRequestHistoricalSnapshotPreview: (event: TimelineEvent) => void;
}

export const ExecutionFullTimelineModalContainer: React.FC<
    ExecutionFullTimelineModalContainerProps
> = ({
    showTimelineModal,
    setShowTimelineModal,
    debtorBrowserTabsMode,
    activeTimelineEventsDebtorScoped,
    activeTimelineEvents,
    EXEC_OVERLAY_LAZY_FALLBACK,
    PremiumTimelineAuditLog,
    History,
    toggleTimelineEventPin,
    moveTimelineEventToTrash,
    onRequestEditTimelineEvent,
    isHistoricalMode,
    handleRequestHistoricalSnapshotPreview,
}) => {
    if (!showTimelineModal) return null;

    const scopedEvents = debtorBrowserTabsMode
        ? activeTimelineEventsDebtorScoped
        : activeTimelineEvents;

    return (
        <div
            className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-slate-950/55 p-0 backdrop-blur-2xl sm:p-2"
            onClick={(e) => {
                if (e.target === e.currentTarget) setShowTimelineModal(false);
            }}
            role="presentation"
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden border-0 border-white/10 bg-slate-900/35 shadow-none backdrop-blur-2xl sm:rounded-2xl sm:border"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
                    <h3 className="text-lg font-bold text-slate-100 sm:text-xl">السجل الزمني الكامل</h3>
                    <button
                        type="button"
                        onClick={() => setShowTimelineModal(false)}
                        className="rounded-lg border border-transparent p-2 text-slate-300 transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white"
                        aria-label="إغلاق"
                    >
                        <X size={22} />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
                    {scopedEvents.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <History size={48} className="mx-auto mb-3 opacity-40" />
                            <p className="text-sm">لا توجد أحداث مسجلة</p>
                        </div>
                    ) : (
                        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                            <PremiumTimelineAuditLog
                                events={scopedEvents}
                                onTogglePin={toggleTimelineEventPin}
                                onRequestTrash={moveTimelineEventToTrash}
                                onRequestEdit={onRequestEditTimelineEvent}
                                isHistoricalMode={isHistoricalMode}
                                onRequestHistoricalPreview={handleRequestHistoricalSnapshotPreview}
                            />
                        </Suspense>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
