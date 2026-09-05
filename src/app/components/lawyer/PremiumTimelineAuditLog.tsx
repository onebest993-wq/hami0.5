import React, { useMemo } from 'react';
import { Pin } from '@/app/components/ui/icons/Pin';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { TimelineEvent as ExecutionTimelineEvent } from '@/app/types/execution';
import {
    cleanTimelineCardTitle,
    formatTimelineWhenAr,
    mergeLegacyEvictionResidentialGracePairs,
    sortTimelineByOccurrence,
    timelineDescriptionForDisplay,
    timelineOccurrenceDisplayRaw,
    timelineSourceForDisplay,
} from '@/app/utils/timelineSmartDisplay';
import { dedupeTimelineEventsForDisplay } from '@/app/utils/timelineDedup';

export interface PremiumTimelineAuditLogProps {
    events: ExecutionTimelineEvent[];
    onRequestTrash?: (event: ExecutionTimelineEvent) => void;
    onTogglePin?: (event: ExecutionTimelineEvent) => void;
    pinLimit?: number;
    isHistoricalMode?: boolean;
    /** عند true تُتخطى إعادة dedupe/merge الثقيلة (القائمة مُعالجة مسبقاً) */
    eventsAlreadyPrepared?: boolean;
}

function toneBorderClass(event: ExecutionTimelineEvent): string {
    const type = String(event.type || '');
    const title = String(event.title || '');
    const src = String(event.source || '');
    const blob = `${type} ${title} ${src}`;

    if (
        /نكس|رفض|انتهاء المهلة|لم يتم الدفع|تحذير|إنذار|مستأخرة|مهلة/iu.test(blob) ||
        /deadline|overdue|default/iu.test(blob)
    ) {
        return 'border-rose-500/20';
    }
    if (
        type === 'payment' ||
        type === 'settlement' ||
        /تسوية|دفعة|دفع|رسوم|محفظة|أمانات|مبلغ|الوعاء|تحصيل/iu.test(blob)
    ) {
        return 'border-emerald-500/20';
    }
    if (type === 'appointment' || /موعد|جلسة|تاريخ|زيارة|خروج ميداني|تحديد موعد/iu.test(blob)) {
        return 'border-sky-500/20';
    }
    if (type === 'decision' || /محكمة|قرار|طعون|قضاء|محضر/iu.test(blob)) {
        return 'border-indigo-500/20';
    }
    return 'border-white/[0.08]';
}

function TimelineAuditRow({
    event,
    canPin,
    isHistoricalMode,
    onTogglePin,
    onRequestTrash,
}: {
    event: ExecutionTimelineEvent;
    canPin: boolean;
    isHistoricalMode: boolean;
    onTogglePin?: (event: ExecutionTimelineEvent) => void;
    onRequestTrash?: (event: ExecutionTimelineEvent) => void;
}) {
    const descriptionTrim = timelineDescriptionForDisplay(event);
    const title = cleanTimelineCardTitle(event);
    const srcDisp = timelineSourceForDisplay(event.source);
    const when = formatTimelineWhenAr(timelineOccurrenceDisplayRaw(event));
    const isPinned = Boolean(event.isPinned);
    const border = toneBorderClass(event);
    const showActions = canPin || (Boolean(onRequestTrash) && !isHistoricalMode);

    return (
        <div dir="rtl" className={`rounded-lg border ${border} bg-white/[0.02] px-2.5 py-2`}>
            <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-[12px] font-bold leading-snug text-slate-100 break-words">
                    {title}
                </p>
                <p className="shrink-0 pt-0.5 text-[9px] font-medium tabular-nums text-slate-500">
                    {when}
                </p>
            </div>
            {srcDisp ? (
                <p className="mt-0.5 text-[9px] font-medium text-slate-500">{srcDisp}</p>
            ) : null}
            {descriptionTrim ? (
                <p className="mt-1 text-[10px] leading-relaxed text-slate-400 whitespace-pre-line break-words">
                    {descriptionTrim}
                </p>
            ) : null}
            {showActions ? (
                <div className="mt-1.5 flex flex-row-reverse items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                        {canPin ? (
                            <button
                                type="button"
                                aria-label={isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                                aria-pressed={isPinned}
                                disabled={isHistoricalMode}
                                onClick={() => {
                                    if (isHistoricalMode) return;
                                    onTogglePin?.(event);
                                }}
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-md border touch-manipulation ${
                                    isPinned
                                        ? 'border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673]'
                                        : 'border-white/10 bg-transparent text-slate-400'
                                } ${isHistoricalMode ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                                <Pin size={11} />
                            </button>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                        {onRequestTrash && !isHistoricalMode ? (
                            <button
                                type="button"
                                onClick={() => onRequestTrash(event)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-rose-500/20 px-1.5 text-[9px] font-bold text-rose-200/90 touch-manipulation"
                            >
                                <Trash2 size={11} />
                                حذف
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export const PremiumTimelineAuditLog: React.FC<PremiumTimelineAuditLogProps> = ({
    events,
    onRequestTrash,
    onTogglePin,
    pinLimit = 15,
    isHistoricalMode = false,
    eventsAlreadyPrepared = false,
}) => {
    const displayEvents = useMemo(() => {
        const base = eventsAlreadyPrepared
            ? events
            : dedupeTimelineEventsForDisplay(mergeLegacyEvictionResidentialGracePairs(events));
        return sortTimelineByOccurrence(base);
    }, [events, eventsAlreadyPrepared]);

    const pinned = useMemo(
        () => displayEvents.filter((e) => Boolean(e.isPinned)),
        [displayEvents],
    );
    const unpinned = useMemo(
        () => displayEvents.filter((e) => !Boolean(e.isPinned)),
        [displayEvents],
    );

    return (
        <div className="space-y-1.5">
            {pinned.length > 0 ? (
                <div
                    className="mb-1 flex items-center justify-between rounded-md border border-[#E6C673]/20 bg-[#E6C673]/[0.06] px-2 py-1"
                    dir="rtl"
                >
                    <span className="text-[9px] font-bold text-[#E6C673]">مثبت</span>
                    <Pin size={11} className="text-[#E6C673]" />
                </div>
            ) : null}

            {pinned.map((event, index) => (
                <TimelineAuditRow
                    key={`p_${String(event.id || index)}`}
                    event={event}
                    canPin={Boolean(onTogglePin)}
                    isHistoricalMode={isHistoricalMode}
                    onTogglePin={onTogglePin}
                    onRequestTrash={onRequestTrash}
                />
            ))}

            {unpinned.map((event, index) => (
                <TimelineAuditRow
                    key={`u_${String(event.id || index)}`}
                    event={event}
                    canPin={Boolean(onTogglePin) && index < pinLimit}
                    isHistoricalMode={isHistoricalMode}
                    onTogglePin={onTogglePin}
                    onRequestTrash={onRequestTrash}
                />
            ))}

            {displayEvents.length === 0 ? (
                <div className="py-5 text-center">
                    <p className="text-[11px] text-slate-500">لا توجد أحداث بعد</p>
                </div>
            ) : null}
        </div>
    );
};
