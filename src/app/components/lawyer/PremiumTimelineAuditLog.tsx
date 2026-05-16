import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Calendar, Eye, FileText, Gavel, Pin, Shield, Trash2, Pencil, Wallet } from 'lucide-react';
import type { TimelineEvent as ExecutionTimelineEvent } from '@/app/types/execution';
import {
    cleanTimelineCardTitle,
    formatTimelineWhenAr,
    mergeLegacyEvictionResidentialGracePairs,
    parseTimelineDeadlineDate,
    timelineSourceForDisplay,
} from '@/app/utils/timelineSmartDisplay';

interface PremiumTimelineAuditLogProps {
    events: ExecutionTimelineEvent[];
    onRequestTrash?: (event: ExecutionTimelineEvent) => void;
    onRequestEdit?: (event: ExecutionTimelineEvent) => void;
    onTogglePin?: (event: ExecutionTimelineEvent) => void;
    pinLimit?: number;
    isHistoricalMode?: boolean;
    onRequestHistoricalPreview?: (event: ExecutionTimelineEvent) => void;
}

export const PremiumTimelineAuditLog: React.FC<PremiumTimelineAuditLogProps> = ({
    events,
    onRequestTrash,
    onRequestEdit,
    onTogglePin,
    pinLimit = 15,
    isHistoricalMode = false,
    onRequestHistoricalPreview,
}) => {
    const displayEvents = useMemo(() => {
        const merged = mergeLegacyEvictionResidentialGracePairs(events);
        const sortKeyMs = (ev: ExecutionTimelineEvent): number => {
            const raw = (ev as any).timestamp || (ev as any).date;
            const d = parseTimelineDeadlineDate(raw);
            return d ? d.getTime() : 0;
        };
        return merged.slice().sort((a, b) => sortKeyMs(b) - sortKeyMs(a));
    }, [events]);

    const pickVisual = (event: ExecutionTimelineEvent): { tone: string; icon: React.ReactNode } => {
        const type = String((event as any).type || '');
        const title = String((event as any).title || '');
        const src = String((event as any).source || '');
        const blob = `${type} ${title} ${src}`;

        const isWarning =
            /نكس|رفض|انتهاء المهلة|لم يتم الدفع|تحذير|إنذار|مستأخرة|مهلة/iu.test(blob) ||
            /deadline|overdue|default/iu.test(blob);
        if (isWarning) {
            return {
                tone: 'border-rose-500/18 bg-rose-500/[0.06] hover:bg-rose-500/[0.09] ring-1 ring-rose-500/10',
                icon: <AlertTriangle size={18} className="text-rose-300" />,
            };
        }

        const isFinancial =
            type === 'payment' ||
            type === 'settlement' ||
            /تسوية|دفعة|دفع|رسوم|محفظة|أمانات|مبلغ|الوعاء|تحصيل/iu.test(blob);
        if (isFinancial) {
            return {
                tone: 'border-emerald-500/18 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.09] ring-1 ring-emerald-500/10',
                icon: <Wallet size={18} className="text-emerald-300" />,
            };
        }

        const isProcedure =
            type === 'appointment' || /موعد|جلسة|تاريخ|زيارة|خروج ميداني|تحديد موعد/iu.test(blob);
        if (isProcedure) {
            return {
                tone: 'border-sky-500/16 bg-sky-500/[0.05] hover:bg-sky-500/[0.08] ring-1 ring-sky-500/10',
                icon: <Calendar size={18} className="text-sky-300" />,
            };
        }

        const isCourt = type === 'decision' || /محكمة|قرار|طعون|قضاء|محضر/iu.test(blob);
        if (isCourt) {
            return {
                tone: 'border-indigo-500/16 bg-indigo-500/[0.05] hover:bg-indigo-500/[0.08] ring-1 ring-indigo-500/10',
                icon: <Gavel size={18} className="text-indigo-300" />,
            };
        }

        const isGuard = /كفيل|حارس|شرطة|أمر قبض|إحضار/iu.test(blob);
        if (isGuard) {
            return {
                tone: 'border-slate-500/18 bg-white/[0.03] hover:bg-white/[0.05] ring-1 ring-white/[0.04]',
                icon: <Shield size={18} className="text-slate-300" />,
            };
        }

        return {
            tone: 'border-slate-500/18 bg-white/[0.02] hover:bg-white/[0.04] ring-1 ring-white/[0.03]',
            icon: <FileText size={18} className="text-slate-300" />,
        };
    };

    const pinned = displayEvents.filter((e) => Boolean((e as any).isPinned));
    const unpinned = displayEvents.filter((e) => !Boolean((e as any).isPinned));

    return (
        <div className="space-y-2">
            {pinned.length > 0 ? (
                <div className="mb-2 rounded-xl border border-[#E6C673]/25 bg-[#0A1122]/35 px-3 py-2" dir="rtl">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-[#E6C673]">الأحداث المثبتة</span>
                        <Pin size={14} className="text-[#E6C673]" />
                    </div>
                </div>
            ) : null}

            {pinned.map((event, index) => {
                const id = `${String((event as any).id || 'p')}_${index}`;
                const descriptionTrim = String((event as any).description || '').trim();
                const title = cleanTimelineCardTitle(event);
                const srcDisp = timelineSourceForDisplay((event as any).source);
                const headerTime = (event as any).timestamp && String((event as any).timestamp).trim() !== '' ? (event as any).timestamp : (event as any).date;
                const when = formatTimelineWhenAr(headerTime);
                const { tone, icon } = pickVisual(event);
                const isPinned = Boolean((event as any).isPinned);
                const canPin = Boolean(onTogglePin);

                return (
                    <motion.div
                        key={id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index, 12) * 0.015 }}
                        dir="rtl"
                        className={`group rounded-2xl border ${tone} px-3.5 py-3 transition-all`}
                    >
                        <div className="flex flex-row-reverse items-start gap-3">
                            <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] border border-white/10 shrink-0">
                                {icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-row-reverse items-start justify-between gap-2">
                                    <p className="min-w-0 flex-1 text-sm font-black leading-snug text-white break-words">
                                        {title}
                                    </p>
                                    <p className="shrink-0 text-[10px] font-semibold text-slate-500 tabular-nums">
                                        {when}
                                    </p>
                                </div>
                                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                                    {srcDisp ? srcDisp : '—'}
                                </p>
                                {descriptionTrim ? (
                                    <p className="mt-2 text-[11px] leading-relaxed text-slate-300 whitespace-pre-line break-words">
                                        {descriptionTrim}
                                    </p>
                                ) : (
                                    <p className="mt-2 text-[11px] text-slate-500">لا يوجد وصف للحدث.</p>
                                )}
                                <div className="mt-3 flex flex-row-reverse items-center justify-between gap-2">
                                    <div className="flex flex-row-reverse items-center gap-2">
                                        {canPin ? (
                                            <button
                                                type="button"
                                                aria-pressed={isPinned}
                                                disabled={isHistoricalMode}
                                                onClick={() => {
                                                    if (isHistoricalMode) return;
                                                    onTogglePin?.(event);
                                                }}
                                                className={`inline-flex items-center justify-center rounded-lg border px-2 py-1 text-[10px] font-bold transition ${
                                                    isPinned
                                                        ? 'border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673]'
                                                        : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
                                                } ${isHistoricalMode ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            >
                                                <Pin size={12} />
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                        {onRequestHistoricalPreview ? (
                                            <button
                                                type="button"
                                                onClick={() => onRequestHistoricalPreview(event)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/[0.06]"
                                            >
                                                <Eye size={12} />
                                                وقت الحدث
                                            </button>
                                        ) : null}
                                        {onRequestEdit && !isHistoricalMode ? (
                                            <button
                                                type="button"
                                                onClick={() => onRequestEdit(event)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2 py-1 text-[10px] font-bold text-indigo-200 hover:bg-indigo-500/15"
                                            >
                                                <Pencil size={12} />
                                                تعديل
                                            </button>
                                        ) : null}
                                        {onRequestTrash && !isHistoricalMode ? (
                                            <button
                                                type="button"
                                                onClick={() => onRequestTrash(event)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-200 hover:bg-rose-500/15"
                                            >
                                                <Trash2 size={12} />
                                                حذف
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}

            {unpinned.map((event, index) => {
                const id = `${String((event as any).id || 'u')}_${index}`;
                const descriptionTrim = String((event as any).description || '').trim();
                const title = cleanTimelineCardTitle(event);
                const srcDisp = timelineSourceForDisplay((event as any).source);
                const headerTime =
                    (event as any).timestamp && String((event as any).timestamp).trim() !== ''
                        ? (event as any).timestamp
                        : (event as any).date;
                const when = formatTimelineWhenAr(headerTime);
                const { tone, icon } = pickVisual(event);
                const canPin = Boolean(onTogglePin) && index < pinLimit;

                return (
                    <motion.div
                        key={id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index, 12) * 0.015 }}
                        dir="rtl"
                        className={`group rounded-2xl border ${tone} px-3.5 py-3 transition-all`}
                    >
                        <div className="flex flex-row-reverse items-start gap-3">
                            <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] border border-white/10 shrink-0">
                                {icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-row-reverse items-start justify-between gap-2">
                                    <p className="min-w-0 flex-1 text-sm font-black leading-snug text-white break-words">
                                        {title}
                                    </p>
                                    <p className="shrink-0 text-[10px] font-semibold text-slate-500 tabular-nums">
                                        {when}
                                    </p>
                                </div>
                                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                                    {srcDisp ? srcDisp : '—'}
                                </p>
                                {descriptionTrim ? (
                                    <p className="mt-2 text-[11px] leading-relaxed text-slate-300 whitespace-pre-line break-words">
                                        {descriptionTrim}
                                    </p>
                                ) : (
                                    <p className="mt-2 text-[11px] text-slate-500">لا يوجد وصف للحدث.</p>
                                )}
                                <div className="mt-3 flex flex-row-reverse items-center justify-between gap-2">
                                    <div className="flex flex-row-reverse items-center gap-2">
                                        {canPin ? (
                                            <button
                                                type="button"
                                                aria-pressed={false}
                                                disabled={isHistoricalMode}
                                                onClick={() => {
                                                    if (isHistoricalMode) return;
                                                    onTogglePin?.(event);
                                                }}
                                                className={`inline-flex items-center justify-center rounded-lg border px-2 py-1 text-[10px] font-bold transition border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] ${
                                                    isHistoricalMode ? 'opacity-40 cursor-not-allowed' : ''
                                                }`}
                                            >
                                                <Pin size={12} />
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                        {onRequestHistoricalPreview ? (
                                            <button
                                                type="button"
                                                onClick={() => onRequestHistoricalPreview(event)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/[0.06]"
                                            >
                                                <Eye size={12} />
                                                وقت الحدث
                                            </button>
                                        ) : null}
                                        {onRequestEdit && !isHistoricalMode ? (
                                            <button
                                                type="button"
                                                onClick={() => onRequestEdit(event)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2 py-1 text-[10px] font-bold text-indigo-200 hover:bg-indigo-500/15"
                                            >
                                                <Pencil size={12} />
                                                تعديل
                                            </button>
                                        ) : null}
                                        {onRequestTrash && !isHistoricalMode ? (
                                            <button
                                                type="button"
                                                onClick={() => onRequestTrash(event)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-200 hover:bg-rose-500/15"
                                            >
                                                <Trash2 size={12} />
                                                حذف
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}

            {displayEvents.length === 0 && (
                <div className="py-8 text-center">
                    <p className="text-xs text-gray-500">لا توجد أحداث بعد</p>
                    <p className="mt-1 text-[11px] text-gray-600">
                        سيتم تسجيل جميع الأحداث تلقائياً هنا
                    </p>
                </div>
            )}
        </div>
    );
};
