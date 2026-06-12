import React, { useEffect, useMemo, useState, useCallback, memo } from 'react';
import { motion, LayoutGroup, AnimatePresence } from 'motion/react';
import { ChevronDown, History, Pin } from 'lucide-react';
import type { TimelineEvent } from '@/app/types/execution';
import {
    cleanTimelineCardTitle,
    computeSmartTimelineRadarTop,
    formatTimelineWhenAr,
    parseTimelineDeadlineDate,
    prepareTimelineRadarEvents,
    stripEmojisFromText,
    timelineCardTitleClassName,
    timelineDescriptionForDisplay,
    timelineRadarRowKey,
    timelineSourceForDisplay,
} from '@/app/utils/timelineSmartDisplay';

function formatDeadlineLineAr(daysLeft: number, deadlineRaw: string | undefined): string {
    const d = parseTimelineDeadlineDate(deadlineRaw);
    const dateStr = d
        ? d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
        : deadlineRaw || '—';
    if (daysLeft < 0) {
        return `انتهت المهلة — آخر أجل ${dateStr}`;
    }
    if (daysLeft === 0) {
        return `ينتهي اليوم — ${dateStr}`;
    }
    if (daysLeft === 1) {
        return `ينتهي بعد يوم واحد (${dateStr})`;
    }
    if (daysLeft === 2) {
        return `ينتهي بعد يومين (${dateStr})`;
    }
    return `متبقٍ ${daysLeft} أيام — ${dateStr}`;
}

export interface SmartTimelineRadarProps {
    events: TimelineEvent[];
    onTogglePin: (event: TimelineEvent) => void;
    onOpenFull: () => void;
    previewLimit?: number;
    /** وضع المعاينة التاريخية — تعطيل التثبيت */
    isHistoricalMode?: boolean;
}

export const SmartTimelineRadar = memo(function SmartTimelineRadar({
    events,
    onTogglePin,
    onOpenFull,
    previewLimit = 5,
    isHistoricalMode = false,
}: SmartTimelineRadarProps) {
    const prepared = useMemo(() => prepareTimelineRadarEvents(events), [events]);

    const topRows = useMemo(
        () => computeSmartTimelineRadarTop(prepared, { limit: previewLimit }),
        [prepared, previewLimit]
    );

    const total = prepared.length;

    const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
    const toggleRadarRow = useCallback((id: string) => {
        setExpandedById((p) => ({ ...p, [id]: !p[id] }));
    }, []);

    useEffect(() => {
        setExpandedById({});
    }, [prepared]);

    useEffect(() => {
        const allowed = new Set(topRows.map((e) => timelineRadarRowKey(e)));
        setExpandedById((prev) => {
            let changed = false;
            const next: Record<string, boolean> = {};
            for (const [k, v] of Object.entries(prev)) {
                if (!allowed.has(k)) {
                    changed = true;
                    continue;
                }
                next[k] = v;
            }
            return changed ? next : prev;
        });
    }, [topRows]);

    if (total === 0) return null;

    return (
        <div className="px-3 pb-2">
            <LayoutGroup id="hami-timeline-radar">
                <div className="divide-y divide-transparent">
                    <AnimatePresence initial={false} mode="popLayout">
                        {topRows.map((event, index) => {
                            const pinned = Boolean(event.isPinned);
                            const dl = event.radarDeadlineDaysLeft;
                            const showDeadlineHint =
                                event.deadlineDate && dl !== null && dl <= 3;
                            const pulseHint = showDeadlineHint && dl !== null && dl <= 2;
                            const urgentFrame =
                                event.radarSmartPriority === 'urgent' ||
                                event.radarSmartPriority === 'deadline';
                            const titleClass = timelineCardTitleClassName(event);
                            const srcRadar = timelineSourceForDisplay(event.source);
                            const headerTime =
                                event.timestamp && String(event.timestamp).trim() !== ''
                                    ? event.timestamp
                                    : event.date;
                            const rowKey = timelineRadarRowKey(event);
                            const radarOpen = Boolean(expandedById[rowKey]);
                            const descriptionTrim = timelineDescriptionForDisplay(event);
                            const metaLine = `${srcRadar ? `${srcRadar} • ` : ''}${formatTimelineWhenAr(headerTime)}`;

                            return (
                                <motion.div
                                    key={rowKey}
                                    layout
                                    layoutId={`radar-card-${rowKey}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                    transition={{
                                        layout: { type: 'spring', stiffness: 420, damping: 32 },
                                        opacity: { duration: 0.2 },
                                        delay: index * 0.04,
                                    }}
                                    dir="rtl"
                                    className={`flex items-start gap-2 border-0 bg-transparent p-3 transition-colors ${
                                        pinned ? 'bg-white/[0.02]' : ''
                                    } ${urgentFrame ? 'ring-0' : ''}`}
                                >
                                    <div className="min-w-0 w-full flex-1 text-right">
                                        <button
                                            type="button"
                                            aria-expanded={radarOpen}
                                            aria-label={radarOpen ? 'طي التفاصيل' : 'توسيع التفاصيل'}
                                            onClick={() => toggleRadarRow(rowKey)}
                                            className="flex w-full items-start justify-between gap-2 rounded-lg text-right transition hover:bg-white/5"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm font-bold leading-tight ${titleClass}`}>
                                                    {cleanTimelineCardTitle(event)}
                                                </p>
                                                {!radarOpen && descriptionTrim ? (
                                                    <p className="mt-1 text-xs leading-relaxed text-gray-400 line-clamp-2 whitespace-pre-line">
                                                        {stripEmojisFromText(descriptionTrim)}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <ChevronDown
                                                size={14}
                                                className={radarOpen ? 'mt-0.5 rotate-180 transition-transform text-gray-400' : 'mt-0.5 transition-transform text-gray-500'}
                                            />
                                        </button>

                                        {radarOpen ? (
                                            <div className="mt-2 space-y-1">
                                                <p className="text-xs text-gray-500">{metaLine}</p>
                                                {descriptionTrim ? (
                                                    <p className="text-xs leading-relaxed text-gray-400 whitespace-pre-wrap">
                                                        {stripEmojisFromText(descriptionTrim)}
                                                    </p>
                                                ) : null}
                                                {showDeadlineHint && dl !== null ? (
                                                    <p
                                                        className={`text-xs font-semibold text-rose-200/90 ${
                                                            pulseHint ? 'animate-pulse' : ''
                                                        }`}
                                                    >
                                                        {formatDeadlineLineAr(dl, event.deadlineDate)}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ) : (
                                            showDeadlineHint && dl !== null ? (
                                                <p
                                                    className={`mt-1 text-xs font-semibold text-rose-200/90 ${
                                                        pulseHint ? 'animate-pulse' : ''
                                                    }`}
                                                >
                                                    {formatDeadlineLineAr(dl, event.deadlineDate)}
                                                </p>
                                            ) : null
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={pinned ? 'إلغاء التثبيت' : 'تثبيت في أعلى الرادار'}
                                        aria-pressed={pinned}
                                        disabled={isHistoricalMode}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isHistoricalMode) return;
                                            onTogglePin(event);
                                        }}
                                        className={`shrink-0 rounded-lg p-1 transition-colors ${
                                            pinned
                                                ? 'text-[#D4AF37]'
                                                : 'text-slate-500 hover:text-slate-300'
                                        } ${isHistoricalMode ? 'cursor-not-allowed opacity-40' : ''}`}
                                    >
                                        <Pin size={14} strokeWidth={2} />
                                    </button>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </LayoutGroup>

            <button
                type="button"
                onClick={onOpenFull}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600/40 bg-slate-900/50 py-2.5 text-slate-200 transition hover:border-[#E6C673]/35 hover:bg-slate-800/60"
            >
                <History size={15} className="text-[#E6C673]/85 shrink-0" />
                <span className="text-xs font-semibold">
                    عرض السجل الكامل ({total} {total === 1 ? 'حدث' : 'أحداث'})
                </span>
            </button>
        </div>
    );
});
