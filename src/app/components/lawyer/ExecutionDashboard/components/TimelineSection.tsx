import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Dispatch, ElementType, SetStateAction, TransitionStartFunction } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import { useEntityCalendarEvents } from '@/app/hooks/useEntityCalendarEvents';
import { mergeTimelineEventsWithCalendar } from '@/app/utils/calendarTimelineMerge';
import {
    EXECUTION_TIMELINE_FILTER_OPTIONS,
    adjacentExecutionTimelineFilter,
    filterExecutionTimelineEvents,
    type ExecutionTimelineFilterLabel,
} from '@/app/utils/timelineCategoryFilter';
import { dedupeTimelineEventsForDisplay } from '@/app/utils/timelineDedup';

interface TimelineSectionProps {
    timelineAccordionExpanded: boolean;
    setTimelineAccordionExpanded: Dispatch<SetStateAction<boolean>>;
    startTransition: TransitionStartFunction;
    ChevronUp: ElementType;
    Activity: ElementType;
    History: ElementType;
    debtorBrowserTabsMode: boolean;
    activeTimelineEventsDebtorScoped: TimelineEvent[];
    activeTimelineEvents: TimelineEvent[];
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    SmartTimelineRadar: React.ComponentType<{
        events: TimelineEvent[];
        onTogglePin: (ev: TimelineEvent) => void;
        onOpenFull: () => void;
        previewLimit: number;
        isHistoricalMode: boolean;
    }>;
    toggleTimelineEventPin: (ev: TimelineEvent) => void;
    setShowTimelineModal: (show: boolean) => void;
    timelineRadarPreviewLimit: number;
    isHistoricalMode: boolean;
    activeTimelineFilter: string;
    setActiveTimelineFilter: Dispatch<SetStateAction<string>>;
    todayYmd: string;
    PremiumTimelineAuditLog: React.ComponentType<{
        events: TimelineEvent[];
        onTogglePin: (ev: TimelineEvent) => void;
        onRequestTrash: (ev: TimelineEvent) => void;
        onRequestEdit: (ev: TimelineEvent) => void;
        isHistoricalMode: boolean;
    }>;
    moveTimelineEventToTrash: (ev: TimelineEvent) => void;
    onRequestEditTimelineEvent: (ev: TimelineEvent) => void;
    /** الإضبارة الأم/الفرعية — أحداث مدمجة */
    showOnlyActiveFileTimeline?: boolean;
    setShowOnlyActiveFileTimeline?: Dispatch<SetStateAction<boolean>>;
    subFilesCount?: number;
    /** عند التوفير: مواعيد السجل تُعرض بتواريخ التقويم المركزي */
    calendarUserId?: string | null;
    executionEntityId?: string | null;
    /** تصنيفات السجل الظاهرة — مزامنة مع إخفاء أقسام التنفيذ */
    timelineFilterOptions?: readonly ExecutionTimelineFilterLabel[];
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({
    timelineAccordionExpanded,
    setTimelineAccordionExpanded,
    startTransition,
    ChevronUp,
    Activity,
    History,
    debtorBrowserTabsMode,
    activeTimelineEventsDebtorScoped,
    activeTimelineEvents,
    EXEC_OVERLAY_LAZY_FALLBACK,
    SmartTimelineRadar,
    toggleTimelineEventPin,
    setShowTimelineModal,
    timelineRadarPreviewLimit,
    isHistoricalMode,
    activeTimelineFilter,
    setActiveTimelineFilter,
    todayYmd,
    PremiumTimelineAuditLog,
    moveTimelineEventToTrash,
    onRequestEditTimelineEvent,
    showOnlyActiveFileTimeline,
    setShowOnlyActiveFileTimeline,
    subFilesCount,
    calendarUserId,
    executionEntityId,
    timelineFilterOptions = EXECUTION_TIMELINE_FILTER_OPTIONS,
}) => {
    const TIMELINE_PAGE_SIZE = 100;
    const [timelineVisibleCount, setTimelineVisibleCount] = useState(TIMELINE_PAGE_SIZE);
    const [activeAppointmentsVisibleCount, setActiveAppointmentsVisibleCount] = useState(TIMELINE_PAGE_SIZE);
    const [endedAppointmentsVisibleCount, setEndedAppointmentsVisibleCount] = useState(TIMELINE_PAGE_SIZE);
    const filterChipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const dedupedAllEvents = useMemo(() => {
        const base = debtorBrowserTabsMode ? activeTimelineEventsDebtorScoped : activeTimelineEvents;
        return dedupeTimelineEventsForDisplay(base);
    }, [debtorBrowserTabsMode, activeTimelineEventsDebtorScoped, activeTimelineEvents]);

    const effectiveEvents = useMemo(
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

    const hasSubFiles = (subFilesCount ?? 0) > 0;

    const entityCal = useEntityCalendarEvents(
        calendarUserId,
        executionEntityId ? 'execution' : null,
        executionEntityId,
    );

    const radarEvents = useMemo(() => {
        if (!executionEntityId || entityCal.length === 0) return dedupedAllEvents;
        return mergeTimelineEventsWithCalendar(
            dedupedAllEvents,
            entityCal,
            'execution',
            executionEntityId,
        );
    }, [dedupedAllEvents, entityCal, executionEntityId]);

    useEffect(() => {
        void import('@/app/components/lawyer/SmartTimelineRadar');
    }, []);

    const appointmentsSplit = useMemo(() => {
        if (activeTimelineFilter !== 'مواعيد') return null;
        const today = todayYmd;
        const isAppt = (ev: TimelineEvent) => String(ev?.type || '') === 'appointment';
        const appts = effectiveEvents.filter(isAppt);
        const ymdOf = (ev: TimelineEvent): string => {
            const raw = String(ev?.date || ev?.timestamp || '').trim();
            const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
            return m ? m[0] : '';
        };
        const active = appts.filter((ev) => {
            const y = ymdOf(ev);
            return y && y >= today;
        });
        const ended = appts.filter((ev) => {
            const y = ymdOf(ev);
            return y && y < today;
        });
        return { active, ended };
    }, [activeTimelineFilter, effectiveEvents, todayYmd]);

    useEffect(() => {
        setTimelineVisibleCount(TIMELINE_PAGE_SIZE);
        setActiveAppointmentsVisibleCount(TIMELINE_PAGE_SIZE);
        setEndedAppointmentsVisibleCount(TIMELINE_PAGE_SIZE);
    }, [activeTimelineFilter, debtorBrowserTabsMode, showOnlyActiveFileTimeline, effectiveEvents.length]);

    useEffect(() => {
        filterChipRefs.current[activeTimelineFilter]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
        });
    }, [activeTimelineFilter]);

    return (
        <div className="mx-3 mt-3 rounded-xl border border-slate-500/25 bg-[#0A0F1C]/30 p-0.5 shadow-md shadow-black/25 ring-1 ring-white/[0.05] backdrop-blur-xl">
            <button type="button"
                onClick={() => startTransition(() => setTimelineAccordionExpanded((prev) => !prev))}
                className="flex w-full items-center justify-between rounded-t-[0.65rem] px-3 py-2.5 transition-all hover:bg-white/[0.04]"
            >
                <ChevronUp
                    size={18}
                    className={`text-[#D4AF37]/80 transition-transform ${
                        timelineAccordionExpanded ? '' : 'rotate-180'
                    }`}
                />
                <div className="flex items-center gap-2">
                    <Activity size={16} className="text-[#D4AF37]/85" />
                    <h3 className="text-xs font-semibold text-slate-200 sm:text-sm">السجل الزمني</h3>
                </div>
            </button>

            {!timelineAccordionExpanded && radarEvents.length > 0 && (
                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                        <SmartTimelineRadar
                            events={radarEvents}
                            onTogglePin={toggleTimelineEventPin}
                            onOpenFull={() => setShowTimelineModal(true)}
                            previewLimit={timelineRadarPreviewLimit}
                            isHistoricalMode={isHistoricalMode}
                        />
                    </Suspense>
                )}

            <AnimatePresence>
                {timelineAccordionExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-600/30"
                    >
                        <div className="p-3 pb-0">
                            <div className="mb-2 flex items-center justify-between gap-2" dir="rtl">
                                <button
                                    type="button"
                                    aria-label="التصنيف التالي"
                                    onClick={() =>
                                        setActiveTimelineFilter(
                                            adjacentExecutionTimelineFilter(
                                                activeTimelineFilter,
                                                1,
                                                timelineFilterOptions
                                            )
                                        )
                                    }
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700/50 bg-slate-800/40 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-700/50"
                                >
                                    <ChevronLeft size={14} />
                                    التالي
                                </button>
                                <p className="min-w-0 truncate text-center text-[10px] font-bold text-slate-300">
                                    {activeTimelineFilter}
                                    <span className="mx-1 text-slate-500">·</span>
                                    <span className="text-amber-200/90">
                                        {filterCounts[activeTimelineFilter] ?? 0}
                                    </span>
                                </p>
                                <button
                                    type="button"
                                    aria-label="التصنيف السابق"
                                    onClick={() =>
                                        setActiveTimelineFilter(
                                            adjacentExecutionTimelineFilter(
                                                activeTimelineFilter,
                                                -1,
                                                timelineFilterOptions
                                            )
                                        )
                                    }
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700/50 bg-slate-800/40 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-700/50"
                                >
                                    السابق
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide">
                                {timelineFilterOptions.map((label) => (
                                    <button type="button"
                                        key={label}
                                        ref={(el) => {
                                            filterChipRefs.current[label] = el;
                                        }}
                                        onClick={() => setActiveTimelineFilter(label)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                                            activeTimelineFilter === label
                                                ? 'bg-[#E6C673]/14 text-amber-100 border border-[#E6C673]/38'
                                                : 'bg-slate-800/30 text-slate-300 border border-slate-700/40 hover:bg-slate-700/45'
                                        }`}
                                    >
                                        {label}
                                        {(filterCounts[label] ?? 0) > 0 && label !== 'الكل' ? (
                                            <span className="mr-1 text-[9px] opacity-70">
                                                ({filterCounts[label]})
                                            </span>
                                        ) : null}
                                    </button>
                                ))}
                                {hasSubFiles && setShowOnlyActiveFileTimeline ? (
                                    <button type="button"
                                        onClick={() => setShowOnlyActiveFileTimeline((v) => !v)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                                            showOnlyActiveFileTimeline
                                                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40'
                                                : 'bg-slate-800/30 text-slate-300 border border-slate-700/40 hover:bg-slate-700/45'
                                        }`}
                                    >
                                        {showOnlyActiveFileTimeline ? 'عرض أحداث الإضبارتين' : 'أحداث الإضبارة المحددة فقط'}
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        <div className="max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain px-4 py-5 pb-8">
                            {activeTimelineFilter === 'مواعيد' && appointmentsSplit ? (
                                <div className="space-y-6" dir="rtl">
                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-slate-200">
                                            المواعيد النشطة
                                        </p>
                                        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                                            <PremiumTimelineAuditLog
                                                events={appointmentsSplit.active.slice(0, activeAppointmentsVisibleCount)}
                                                onTogglePin={toggleTimelineEventPin}
                                                onRequestTrash={moveTimelineEventToTrash}
                                                onRequestEdit={onRequestEditTimelineEvent}
                                                isHistoricalMode={isHistoricalMode}
                                            />
                                        </Suspense>
                                        {appointmentsSplit.active.length > activeAppointmentsVisibleCount ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setActiveAppointmentsVisibleCount((v) => v + TIMELINE_PAGE_SIZE)
                                                }
                                                className="mt-2 rounded-lg border border-slate-600/45 bg-slate-800/40 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:border-[#E6C673]/35"
                                            >
                                                تحميل المزيد
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-slate-200">
                                            المواعيد المنتهية
                                        </p>
                                        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                                            <PremiumTimelineAuditLog
                                                events={appointmentsSplit.ended.slice(0, endedAppointmentsVisibleCount)}
                                                onTogglePin={toggleTimelineEventPin}
                                                onRequestTrash={moveTimelineEventToTrash}
                                                onRequestEdit={onRequestEditTimelineEvent}
                                                isHistoricalMode={isHistoricalMode}
                                            />
                                        </Suspense>
                                        {appointmentsSplit.ended.length > endedAppointmentsVisibleCount ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEndedAppointmentsVisibleCount((v) => v + TIMELINE_PAGE_SIZE)
                                                }
                                                className="mt-2 rounded-lg border border-slate-600/45 bg-slate-800/40 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:border-[#E6C673]/35"
                                            >
                                                تحميل المزيد
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            ) : (
                                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                                    <PremiumTimelineAuditLog
                                        events={effectiveEvents.slice(0, timelineVisibleCount)}
                                        onTogglePin={toggleTimelineEventPin}
                                        onRequestTrash={moveTimelineEventToTrash}
                                        onRequestEdit={onRequestEditTimelineEvent}
                                        isHistoricalMode={isHistoricalMode}
                                    />
                                </Suspense>
                            )}
                            {activeTimelineFilter !== 'مواعيد' && effectiveEvents.length > timelineVisibleCount ? (
                                <button
                                    type="button"
                                    onClick={() => setTimelineVisibleCount((v) => v + TIMELINE_PAGE_SIZE)}
                                    className="mt-2 rounded-lg border border-slate-600/45 bg-slate-800/40 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:border-[#E6C673]/35"
                                >
                                    تحميل المزيد
                                </button>
                            ) : null}
                        </div>

                        <div className="p-3 pt-0">
                            <button type="button"
                                onClick={() => setShowTimelineModal(true)}
                                className="w-full rounded-lg border border-slate-600/45 bg-slate-800/40 p-2.5 transition-all hover:border-[#E6C673]/35 hover:bg-slate-800/55"
                            >
                                <div className="flex items-center justify-center gap-2 text-slate-200">
                                    <History size={16} className="text-[#E6C673]/85" />
                                    <span className="text-sm font-semibold">عرض السجل الكامل</span>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
