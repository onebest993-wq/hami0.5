import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Dispatch, ElementType, SetStateAction, TransitionStartFunction } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import { useEntityCalendarEvents } from '@/app/hooks/useEntityCalendarEvents';
import { mergeTimelineEventsWithCalendar } from '@/app/utils/calendarTimelineMerge';

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
        onRequestHistoricalPreview: (event: TimelineEvent) => void;
    }>;
    toggleTimelineEventPin: (ev: TimelineEvent) => void;
    setShowTimelineModal: (show: boolean) => void;
    timelineRadarPreviewLimit: number;
    isHistoricalMode: boolean;
    handleRequestHistoricalSnapshotPreview: (event: TimelineEvent) => void;
    activeTimelineFilter: string;
    setActiveTimelineFilter: Dispatch<SetStateAction<string>>;
    todayYmd: string;
    filteredTimelineEvents: TimelineEvent[];
    PremiumTimelineAuditLog: React.ComponentType<{
        events: TimelineEvent[];
        onTogglePin: (ev: TimelineEvent) => void;
        onRequestTrash: (ev: TimelineEvent) => void;
        onRequestEdit: (ev: TimelineEvent) => void;
        isHistoricalMode: boolean;
        onRequestHistoricalPreview: (event: TimelineEvent) => void;
    }>;
    moveTimelineEventToTrash: (ev: TimelineEvent) => void;
    onRequestEditTimelineEvent: (ev: TimelineEvent) => void;
    /** الإضبارة الأم/الفرعية — أحداث مدمجة */
    showOnlyActiveFileTimeline?: boolean;
    setShowOnlyActiveFileTimeline?: Dispatch<SetStateAction<boolean>>;
    subFilesCount?: number;
    filteredMergedTimelineEvents?: TimelineEvent[];
    /** عند التوفير: مواعيد السجل تُعرض بتواريخ التقويم المركزي */
    calendarUserId?: string | null;
    executionEntityId?: string | null;
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
    handleRequestHistoricalSnapshotPreview,
    activeTimelineFilter,
    setActiveTimelineFilter,
    todayYmd,
    filteredTimelineEvents,
    PremiumTimelineAuditLog,
    moveTimelineEventToTrash,
    onRequestEditTimelineEvent,
    showOnlyActiveFileTimeline,
    setShowOnlyActiveFileTimeline,
    subFilesCount,
    filteredMergedTimelineEvents,
    calendarUserId,
    executionEntityId,
}) => {
    const TIMELINE_PAGE_SIZE = 100;
    const [timelineVisibleCount, setTimelineVisibleCount] = useState(TIMELINE_PAGE_SIZE);
    const [activeAppointmentsVisibleCount, setActiveAppointmentsVisibleCount] = useState(TIMELINE_PAGE_SIZE);
    const [endedAppointmentsVisibleCount, setEndedAppointmentsVisibleCount] = useState(TIMELINE_PAGE_SIZE);
    const effectiveEvents = filteredMergedTimelineEvents ?? filteredTimelineEvents;
    const hasSubFiles = (subFilesCount ?? 0) > 0;

    const entityCal = useEntityCalendarEvents(
        calendarUserId,
        executionEntityId ? 'execution' : null,
        executionEntityId,
    );

    const radarEventsRaw = debtorBrowserTabsMode
        ? activeTimelineEventsDebtorScoped
        : activeTimelineEvents;

    const radarEvents = useMemo(() => {
        if (!executionEntityId || entityCal.length === 0) return radarEventsRaw;
        return mergeTimelineEventsWithCalendar(
            radarEventsRaw,
            entityCal,
            'execution',
            executionEntityId,
        );
    }, [radarEventsRaw, entityCal, executionEntityId]);

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
                            onRequestHistoricalPreview={handleRequestHistoricalSnapshotPreview}
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
                            <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide">
                                {[
                                    { label: 'الكل', icon: null },
                                    { label: 'تبليغات وإخبار', icon: 'notification' },
                                    { label: 'مواعيد', icon: 'appointment' },
                                    { label: 'حركة الأموال والرسوم', icon: 'payment' },
                                    { label: 'محجوزات وتنفيذ جبري', icon: 'coercive' },
                                    { label: 'قرارات ومحاضر', icon: 'decision' },
                                    { label: 'مستندات وملاحظات', icon: 'other' },
                                ].map((filter) => (
                                    <button type="button"
                                        key={filter.label}
                                        onClick={() => setActiveTimelineFilter(filter.label)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                                            activeTimelineFilter === filter.label
                                                ? 'bg-[#E6C673]/14 text-amber-100 border border-[#E6C673]/38'
                                                : 'bg-slate-800/30 text-slate-300 border border-slate-700/40 hover:bg-slate-700/45'
                                        }`}
                                    >
                                        {filter.label}
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
                                                onRequestHistoricalPreview={
                                                    handleRequestHistoricalSnapshotPreview
                                                }
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
                                                onRequestHistoricalPreview={
                                                    handleRequestHistoricalSnapshotPreview
                                                }
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
                                        onRequestHistoricalPreview={
                                            handleRequestHistoricalSnapshotPreview
                                        }
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
