import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import type { Dispatch, ElementType, SetStateAction } from 'react';
import { X } from 'lucide-react';
import type { TimelineEvent } from '@/app/types/execution';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_SHELL_HEIGHT_CLASS,
} from '../executionModalMobileShell';
import {
    EXECUTION_TIMELINE_FILTER_OPTIONS,
    adjacentExecutionTimelineFilter,
    filterExecutionTimelineEvents,
    type ExecutionTimelineFilterLabel,
} from '@/app/utils/timelineCategoryFilter';
import { dedupeTimelineEventsForDisplay } from '@/app/utils/timelineDedup';
import { ExecutionTimelineFilterBar } from './ExecutionTimelineFilterBar';

type PremiumTimelineAuditLogComponent = React.ComponentType<{
    events: TimelineEvent[];
    onTogglePin: (ev: TimelineEvent) => void;
    onRequestTrash: (ev: TimelineEvent) => void;
    onRequestEdit: (ev: TimelineEvent) => void;
    isHistoricalMode: boolean;
}>;

export interface ExecutionFullTimelineModalContainerProps {
    showTimelineModal: boolean;
    setShowTimelineModal?: (show: boolean) => void;
    onCloseTimelineModal?: () => void;
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
    activeTimelineFilter: string;
    setActiveTimelineFilter: Dispatch<SetStateAction<string>>;
    todayYmd: string;
    timelineFilterOptions?: readonly ExecutionTimelineFilterLabel[];
}

export const ExecutionFullTimelineModalContainer: React.FC<
    ExecutionFullTimelineModalContainerProps
> = ({
    showTimelineModal,
    setShowTimelineModal,
    onCloseTimelineModal,
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
    activeTimelineFilter,
    setActiveTimelineFilter,
    todayYmd,
    timelineFilterOptions = EXECUTION_TIMELINE_FILTER_OPTIONS,
}) => {
    const filterChipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const eventsScrollRef = useRef<HTMLDivElement | null>(null);

    const closeTimelineModal = () => {
        if (typeof onCloseTimelineModal === 'function') {
            onCloseTimelineModal();
        } else {
            setShowTimelineModal?.(false);
        }
    };

    const dedupedAllEvents = useMemo(() => {
        const base = debtorBrowserTabsMode
            ? activeTimelineEventsDebtorScoped
            : activeTimelineEvents;
        return dedupeTimelineEventsForDisplay(base);
    }, [debtorBrowserTabsMode, activeTimelineEventsDebtorScoped, activeTimelineEvents]);

    const scopedEvents = useMemo(
        () => filterExecutionTimelineEvents(dedupedAllEvents, activeTimelineFilter),
        [dedupedAllEvents, activeTimelineFilter]
    );

    const filterCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const label of timelineFilterOptions) {
            counts[label] = filterExecutionTimelineEvents(dedupedAllEvents, label).length;
        }
        return counts;
    }, [dedupedAllEvents, timelineFilterOptions]);

    const appointmentsSplit = useMemo(() => {
        if (activeTimelineFilter !== 'مواعيد') return null;
        const isAppt = (ev: TimelineEvent) => String(ev?.type || '') === 'appointment';
        const appts = scopedEvents.filter(isAppt);
        const ymdOf = (ev: TimelineEvent): string => {
            const raw = String(ev?.date || ev?.timestamp || '').trim();
            const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
            return m ? m[0] : '';
        };
        const active = appts.filter((ev) => {
            const y = ymdOf(ev);
            return y && y >= todayYmd;
        });
        const ended = appts.filter((ev) => {
            const y = ymdOf(ev);
            return y && y < todayYmd;
        });
        return { active, ended };
    }, [activeTimelineFilter, scopedEvents, todayYmd]);

    useEffect(() => {
        filterChipRefs.current[activeTimelineFilter]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
        });
    }, [activeTimelineFilter, showTimelineModal]);

    useEffect(() => {
        if (!showTimelineModal) return;
        eventsScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }, [activeTimelineFilter, showTimelineModal]);

    useBodyScrollLock(showTimelineModal);

    useEffect(() => {
        if (!showTimelineModal) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeTimelineModal();
                return;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                setActiveTimelineFilter(adjacentExecutionTimelineFilter(activeTimelineFilter, 1, timelineFilterOptions));
                return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setActiveTimelineFilter(adjacentExecutionTimelineFilter(activeTimelineFilter, -1, timelineFilterOptions));
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [showTimelineModal, closeTimelineModal, activeTimelineFilter, setActiveTimelineFilter, timelineFilterOptions]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {showTimelineModal ? (
                <motion.div
                    key="timeline-full-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 flex flex-col overflow-hidden bg-slate-950/75 p-0 backdrop-blur-2xl sm:p-3 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
                    style={{ zIndex: EXEC_MODAL_Z.timelineFullModal }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeTimelineModal();
                    }}
                    role="presentation"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        className={`mx-auto flex min-h-0 w-full max-w-lg flex-col overflow-hidden border border-white/10 bg-[#0A0F1C] shadow-2xl sm:rounded-2xl ${EXEC_MODAL_SHELL_HEIGHT_CLASS}`}
                        onClick={(e) => e.stopPropagation()}
                        dir="rtl"
                    >
                        <div className={`flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 ${EXEC_MODAL_HEADER_SAFE_TOP}`}>
                            <button
                                type="button"
                                onClick={closeTimelineModal}
                                className={EXEC_MODAL_CLOSE_BTN_CLASS}
                                aria-label="إغلاق"
                            >
                                <X size={22} />
                            </button>
                            <div className="min-w-0 flex-1 text-center">
                                <h3 className="text-base font-bold text-slate-100 sm:text-lg">
                                    السجل الزمني الكامل
                                </h3>
                                <p className="text-[10px] text-slate-400">
                                    {scopedEvents.length} حدث
                                    {activeTimelineFilter !== 'الكل' ? ` · ${activeTimelineFilter}` : ''}
                                </p>
                            </div>
                            <span className="w-10 shrink-0" aria-hidden />
                        </div>

                        <div className="shrink-0 border-b border-white/10 px-3 py-2">
                            <ExecutionTimelineFilterBar
                                activeTimelineFilter={activeTimelineFilter}
                                setActiveTimelineFilter={setActiveTimelineFilter}
                                timelineFilterOptions={timelineFilterOptions}
                                filterCounts={filterCounts}
                                filterChipRefs={filterChipRefs}
                            />
                        </div>

                        <div
                            ref={eventsScrollRef}
                            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3"
                        >
                            {scopedEvents.length === 0 ? (
                                <div className="py-12 text-center text-slate-400">
                                    <History size={48} className="mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">لا توجد أحداث في هذا التصنيف</p>
                                </div>
                            ) : activeTimelineFilter === 'مواعيد' && appointmentsSplit ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-slate-200">المواعيد النشطة</p>
                                        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                                            <PremiumTimelineAuditLog
                                                events={appointmentsSplit.active}
                                                onTogglePin={toggleTimelineEventPin}
                                                onRequestTrash={moveTimelineEventToTrash}
                                                onRequestEdit={onRequestEditTimelineEvent}
                                                isHistoricalMode={isHistoricalMode}
                                            />
                                        </Suspense>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-slate-200">المواعيد المنتهية</p>
                                        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                                            <PremiumTimelineAuditLog
                                                events={appointmentsSplit.ended}
                                                onTogglePin={toggleTimelineEventPin}
                                                onRequestTrash={moveTimelineEventToTrash}
                                                onRequestEdit={onRequestEditTimelineEvent}
                                                isHistoricalMode={isHistoricalMode}
                                            />
                                        </Suspense>
                                    </div>
                                </div>
                            ) : (
                                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                                    <PremiumTimelineAuditLog
                                        events={scopedEvents}
                                        onTogglePin={toggleTimelineEventPin}
                                        onRequestTrash={moveTimelineEventToTrash}
                                        onRequestEdit={onRequestEditTimelineEvent}
                                        isHistoricalMode={isHistoricalMode}
                                    />
                                </Suspense>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body
    );
};
