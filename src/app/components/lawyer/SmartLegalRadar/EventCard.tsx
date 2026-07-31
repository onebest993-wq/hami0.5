import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { isAndroidNativeShell } from '@/app/runtime/nativePlatform';
import {
    Clock,
    CheckCircle2,
    Trash2,
    ExternalLink,
    Pencil,
} from 'lucide-react';
import { TYPE_STYLES } from './utils';
import { RADAR_GLASS_PANEL } from './radarTheme';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { calendarModuleVisual } from '@/app/services/calendarModuleVisuals';
import { resolveRadarEventDisplayMeta } from './radarEventDisplayMeta';
import { describeLegalDeadlineForCalendarCard } from '@/app/services/calendar/legalDeadlineEngine';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';

interface EventCardProps {
    event: UnifiedEvent;
    index: number;
    highlighted?: boolean;
    onEdit: (event: UnifiedEvent) => void;
    onDelete: (event: UnifiedEvent) => void;
    onOpenSource?: (event: UnifiedEvent) => void;
}

const LEGAL_DEADLINE_MODULES = new Set<CalendarSourceModule>([
    'lawsuit',
    'execution',
    'criminal',
    'urgent',
]);

function looksLikeCaseNumber(value: string): boolean {
    const v = value.trim();
    if (!v || v.length < 2) return false;
    if (/^مهمة\s*ميدان$/i.test(v)) return false;
    return /\d/.test(v);
}

function normalizeLabel(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function labelsEqual(a: string, b: string): boolean {
    return normalizeLabel(a) === normalizeLabel(b);
}

/** تسميات عامة للمصدر تطابق النوع — لا تُكرَّر بجانب الشارة */
function isGenericModuleEcho(kind: string, source: string): boolean {
    if (labelsEqual(kind, source)) return true;
    const k = normalizeLabel(kind);
    const s = normalizeLabel(source);

    if (/ميدان/.test(k) && /ميدان/.test(s)) return true;

    /* مهلة مستعجلة ↔ قضاء مستعجل / مستعجل — نفس الدلالة */
    if (/مستعجل/.test(k) && /مستعجل/.test(s)) return true;

    if (/^دعوى$/.test(s) && /جلسة|مهلة|مرافع/.test(k)) return true;
    if (/^(تنفيذ|جزائي|إداري|ملاحظة|يدوي)$/.test(s) && (labelsEqual(k, s) || k.includes(s))) {
        return true;
    }

    return false;
}

/** نوع الحدث الظاهر — جلسة / مهلة / مهلة مستعجلة / … */
function resolveKindLabel(event: UnifiedEvent): string {
    const title = String(event.title ?? '');
    const mod = event.bridge?.sourceModule;
    const base = TYPE_STYLES[event.type] || TYPE_STYLES.custom;

    if (mod === 'task') {
        if (/تبليغ/i.test(title)) return 'تبليغ';
        if (/كشف|معاينة/i.test(title)) return 'معاينة';
        return 'مهمة ميدان';
    }

    const urgentish =
        mod === 'urgent' || /مهلة\s*مستعجل|مستعجل\w*\s*مهلة|قضاء\s*مستعجل/i.test(title);
    if (
        urgentish &&
        (event.type === 'deadline' || /مهلة|موعد\s*نهائي|انتهاء|مستعجل/i.test(title))
    ) {
        return 'مهلة مستعجلة';
    }

    if (/مرافع/i.test(title)) return 'موعد مرافعة';
    if (/مهلة|طعن|تمييز|استئناف|اعتراض|انتهاء/i.test(title)) return 'مهلة';
    if (event.type === 'deadline') return 'مهلة';
    if (event.type === 'hearing') return 'جلسة';
    if (event.type === 'execution') return 'تنفيذ';
    if (event.type === 'consultation') return 'استشارة';
    return base.label;
}

function stripKindNoiseFromTitle(title: string): string {
    return title
        .replace(/جلسة\s*[—\-·:：]?\s*/gi, ' ')
        .replace(/مهلة\s*مستعجل[ةه]?\s*[—\-·:：]?\s*/gi, ' ')
        .replace(/موعد\s*نهائي\s*[—\-·:：]?\s*/gi, ' ')
        .replace(/مهلة\s*[—\-·:：]?\s*/gi, ' ')
        .replace(/موعد\s*مرافع[ةه]?\s*[—\-·:：]?\s*/gi, ' ')
        .replace(/مهمة\s*ميدان\s*[—\-·:：]?\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isUselessMark(value: string, kind: string, source?: string | null): boolean {
    if (!value.trim()) return true;
    if (labelsEqual(value, kind)) return true;
    if (source && labelsEqual(value, source)) return true;
    if (/^(مهمة\s*)?ميدان$/i.test(value.trim())) return true;
    return false;
}

/** رقم دعوى / مرجع / عنوان قصير مميز */
function resolveDistinctiveMark(
    event: UnifiedEvent,
    meta: { court?: string; freeNotes?: string },
    kind: string,
    source: string,
): string | null {
    const caseNo = event.caseNo?.trim();
    if (caseNo && looksLikeCaseNumber(caseNo) && !isUselessMark(caseNo, kind, source)) {
        return caseNo;
    }

    const title = String(event.title ?? '');
    const refInTitle = title.match(/\d{1,4}\s*[\\/]\s*\d{2,4}|\b\d{3,}\b/);
    if (refInTitle) {
        const ref = refInTitle[0].replace(/\s+/g, '');
        if (!isUselessMark(ref, kind, source)) return ref;
    }

    const court = meta.court?.trim();
    if (court && !isUselessMark(court, kind, source)) return court;

    const cleaned = stripKindNoiseFromTitle(title);
    if (cleaned && !isUselessMark(cleaned, kind, source)) {
        return cleaned.length > 36 ? `${cleaned.slice(0, 34)}…` : cleaned;
    }

    const note = meta.freeNotes?.trim().split(/\n+/)[0]?.trim();
    if (note && looksLikeCaseNumber(note) && !isUselessMark(note, kind, source)) {
        return note.slice(0, 36);
    }

    return null;
}

/**
 * يبني سطراً بلا تكرار: شارة النوع + نص عريض (مصدر أو معرّف) + ثانوي اختياري
 */
function buildDedupedCardText(input: {
    kind: string;
    source: string;
    distinctive: string | null;
}): { primary: string | null; secondary: string | null; primaryIsSource: boolean } {
    const { kind, source, distinctive } = input;
    const sourceUseful =
        Boolean(source.trim()) &&
        !labelsEqual(source, 'يدوي') &&
        !isGenericModuleEcho(kind, source);

    if (sourceUseful) {
        const secondary =
            distinctive &&
            !labelsEqual(distinctive, source) &&
            !labelsEqual(distinctive, kind)
                ? distinctive
                : null;
        return { primary: source, secondary, primaryIsSource: true };
    }

    if (distinctive && !labelsEqual(distinctive, kind)) {
        return { primary: distinctive, secondary: null, primaryIsSource: false };
    }

    return { primary: null, secondary: null, primaryIsSource: false };
}

function shouldShowLegalCountdown(event: UnifiedEvent): boolean {
    const mod = event.bridge?.sourceModule;
    const title = String(event.title ?? '');
    if (mod && LEGAL_DEADLINE_MODULES.has(mod)) {
        return (
            event.type === 'deadline' ||
            /مهلة|طعن|تمييز|استئناف|اعتراض|انتهاء|مستعجل/i.test(title)
        );
    }
    if (event.isBridged) return false;
    return event.type === 'deadline' || /مهلة|طعن|تمييز|استئناف|اعتراض/i.test(title);
}

function Dot() {
    return <span className="shrink-0 text-[#F5EDE0]/25 select-none" aria-hidden>·</span>;
}

/**
 * صف مضغوط: نوع · وقت · مصدر (عريض) · معرّف مميز · مهلة
 */
export const EventCard = React.memo(function EventCard({
    event,
    index,
    highlighted,
    onEdit,
    onDelete,
    onOpenSource,
}: EventCardProps) {
    const style = TYPE_STYLES[event.type] || TYPE_STYLES.custom;
    const Icon = style.icon;
    const moduleVisual = calendarModuleVisual(event.bridge?.sourceModule);
    const isDiscovered = Boolean(event.bridge?.sourceEventId?.startsWith('field_'));
    const canOpenSource = Boolean(event.isBridged && onOpenSource);
    const canMutateCalendar = event.source === 'calendar' && !isDiscovered;
    const reduceMotion = useReduceMotion();

    const meta = useMemo(
        () =>
            resolveRadarEventDisplayMeta({
                notes: event.notes,
                court: event.court,
                partiesSummary: event.partiesSummary,
                sourceLabel: event.sourceLabel,
                location: event.location,
                moduleLabel: event.isBridged ? moduleVisual.label : undefined,
            }),
        [
            event.notes,
            event.court,
            event.partiesSummary,
            event.sourceLabel,
            event.location,
            event.isBridged,
            moduleVisual.label,
        ],
    );

    const kindLabel = useMemo(() => resolveKindLabel(event), [event]);

    const sourceLabel =
        meta.sourceLabel || (event.isBridged ? moduleVisual.label : undefined) || 'يدوي';

    const distinctive = useMemo(
        () =>
            resolveDistinctiveMark(
                event,
                { court: meta.court, freeNotes: meta.freeNotes },
                kindLabel,
                sourceLabel,
            ),
        [event, meta.court, meta.freeNotes, kindLabel, sourceLabel],
    );

    const lines = useMemo(
        () =>
            buildDedupedCardText({
                kind: kindLabel,
                source: sourceLabel,
                distinctive,
            }),
        [kindLabel, sourceLabel, distinctive],
    );

    const legalCountdown = useMemo(() => {
        if (!shouldShowLegalCountdown(event)) return null;
        if (!/^\d{4}-\d{2}-\d{2}/.test(String(event.date ?? ''))) return null;
        return describeLegalDeadlineForCalendarCard({
            expirationYmd: String(event.date).trim().slice(0, 10),
            decisionSource: event.title,
            asOf: getLocalTodayYmd(),
        });
    }, [event]);

    const countdownLabel = legalCountdown
        ? legalCountdown.remainingLegalWorkingDays <= 0
            ? 'انتهت'
            : `${legalCountdown.remainingLegalWorkingDays}ي عمل`
        : null;

    const cardClassName = `relative ${RADAR_GLASS_PANEL} transition-colors overflow-hidden group ${
        highlighted
            ? 'border-[#E8DCC8]/40 ring-2 ring-[#FAF7F2]/12'
            : 'hover:border-[#E8DCC8]/28'
    }`;
    /* Android WebView: بلا motion على أول رسم — نفس الهيكل البصري */
    const skipMotion = reduceMotion || isAndroidNativeShell();
    const CardRoot = skipMotion ? 'div' : motion.div;
    const motionProps = skipMotion
        ? {}
        : {
              initial: { opacity: 0, y: 6 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: Math.min(index * 0.03, 0.12) },
          };

    return (
        <CardRoot
            key={event.id}
            {...motionProps}
            className={cardClassName}
            data-testid={`radar-event-card-${event.id}`}
        >
            <div className={`absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-b ${moduleVisual.rail}`} />

            <div className="flex items-center gap-1.5 py-2 pl-1.5 pr-3 min-h-[52px]">
                <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden" dir="rtl">
                    <span
                        className={`inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${style.bg} ${style.color} ${style.border}`}
                        data-testid={`radar-event-kind-${event.id}`}
                    >
                        <Icon size={10} aria-hidden />
                        {kindLabel}
                    </span>

                    {event.time ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px] font-bold text-[#FAF7F2]/90">
                            <Clock size={10} aria-hidden />
                            {event.time}
                        </span>
                    ) : null}

                    {event.isCompleted ? (
                        <CheckCircle2 size={13} className="shrink-0 text-emerald-400" aria-label="مكتمل" />
                    ) : null}

                    {lines.primary ? (
                        <p
                            className="min-w-0 max-w-[50%] truncate text-[13px] font-extrabold text-[#FAF7F2] leading-none tracking-tight"
                            data-testid={`radar-event-source-${event.id}`}
                            title={lines.primaryIsSource ? `المصدر: ${lines.primary}` : lines.primary}
                        >
                            {lines.primary}
                        </p>
                    ) : null}

                    {lines.secondary ? (
                        <>
                            <Dot />
                            <p
                                className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#E8DCC8]/75 leading-none"
                                data-testid={`radar-event-summary-${event.id}`}
                                title={lines.secondary}
                            >
                                {lines.secondary}
                            </p>
                        </>
                    ) : null}

                    {countdownLabel ? (
                        <span
                            className="shrink-0 rounded-md border border-[#E8DCC8]/22 bg-[#F5EDE0]/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-[#EDE4D6] leading-none"
                            data-testid={`radar-event-legal-deadline-${event.id}`}
                            title={
                                legalCountdown
                                    ? legalCountdown.remainingLegalWorkingDays <= 0
                                        ? `انتهت المهلة · ${legalCountdown.expirationYmd}`
                                        : `متبقٍ ${legalCountdown.remainingLegalWorkingDays} يوم عمل · ${legalCountdown.expirationYmd}`
                                    : undefined
                            }
                        >
                            {countdownLabel}
                        </span>
                    ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-0">
                    {canOpenSource ? (
                        <button
                            type="button"
                            onClick={() => onOpenSource!(event)}
                            title="فتح المصدر"
                            aria-label={`فتح المصدر الأصلي للموعد ${event.title}`}
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#B7C5C7] transition-colors touch-manipulation hover:bg-[#FAF7F2]/10 hover:text-[#FAF7F2]"
                        >
                            <ExternalLink size={14} aria-hidden />
                        </button>
                    ) : null}
                    {canMutateCalendar ? (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                            <button
                                type="button"
                                onClick={() => onEdit(event)}
                                aria-label={`تعديل الموعد ${event.title}`}
                                className="flex h-11 w-11 items-center justify-center rounded-xl text-[#E8DCC8]/60 transition-colors touch-manipulation hover:bg-[#F5EDE0]/10 hover:text-[#FAF7F2]"
                            >
                                <Pencil size={13} aria-hidden />
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(event)}
                                aria-label={`حذف الموعد ${event.title}`}
                                className="flex h-11 w-11 items-center justify-center rounded-xl text-[#E8DCC8]/45 transition-colors touch-manipulation hover:bg-[#9AADB0]/18 hover:text-[#B7C5C7]"
                            >
                                <Trash2 size={13} aria-hidden />
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </CardRoot>
    );
});
