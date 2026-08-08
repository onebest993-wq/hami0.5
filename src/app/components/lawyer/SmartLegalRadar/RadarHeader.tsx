import React from 'react';
import { ArrowRight, Calendar, ChevronRight, ChevronLeft, Loader2 } from '@/app/components/ui/lucideIcons';
import { prefetchRadarCalendarGrid } from '@/app/runtime/radarWidgetLoader';
import { MONTHS, getDayName, isToday } from './utils';
import {
    RADAR_BTN_GHOST,
    RADAR_BTN_GHOST_ACTIVE,
    RADAR_HEADER,
    RADAR_MONTH_NAV,
    RADAR_ICON_GOLD,
    RADAR_ICON_ACCENT,
    RADAR_BACK_BTN,
    RADAR_TITLE,
    RADAR_NAV_ICON_BTN,
    RADAR_TEXT,
    RADAR_TEXT_MUTED,
} from './radarTheme';

interface RadarHeaderProps {
    onBack: () => void;
    syncing?: boolean;
}

export const RadarHeader = React.memo(function RadarHeader({ onBack, syncing = false }: RadarHeaderProps) {
    return (
        <header className={RADAR_HEADER}>
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onBack();
                }}
                data-testid="radar-back"
                className={RADAR_BACK_BTN}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
                <ArrowRight size={20} />
                <span className="font-bold text-sm">رجوع</span>
            </button>
            <h1 className={RADAR_TITLE}>
                <span>رادار المواعيد</span>
            </h1>
            <div
                className="w-10 flex items-center justify-end"
                aria-live="polite"
                aria-busy={syncing}
            >
                {syncing ? (
                    <Loader2
                        size={16}
                        className={`${RADAR_ICON_GOLD} animate-spin opacity-70`}
                        aria-label="جاري تحديث المواعيد"
                    />
                ) : null}
            </div>
        </header>
    );
});

function formatSelectedDayLabel(selectedDate: string): { title: string; meta: string } {
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
        return { title: selectedDate, meta: getDayName(selectedDate) };
    }
    try {
        const title = new Intl.DateTimeFormat('ar-IQ', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        }).format(d);
        const meta = new Intl.DateTimeFormat('ar-IQ', {
            year: 'numeric',
        }).format(d);
        return { title, meta };
    } catch {
        return { title: `${getDayName(selectedDate)} · ${selectedDate}`, meta: '' };
    }
}

export const MonthNav = React.memo(function MonthNav({
    viewYear,
    viewMonth,
    onPrevMonth,
    onNextMonth,
    onGoToToday,
    showFullMonth,
    onToggleFullMonth,
    selectedDate,
}: {
    viewYear: number;
    viewMonth: number;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onGoToToday: () => void;
    showFullMonth: boolean;
    onToggleFullMonth: () => void;
    selectedDate?: string;
}) {
    const todaySelected = Boolean(selectedDate && isToday(selectedDate));
    const dayLabel = selectedDate ? formatSelectedDayLabel(selectedDate) : null;

    return (
        <div className={RADAR_MONTH_NAV} dir="rtl" data-testid="radar-month-nav">
            <div className="hami-radar-month-nav__month-row flex items-center gap-2 min-w-0 w-full">
                <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
                    <button
                        type="button"
                        onClick={onPrevMonth}
                        aria-label="الشهر السابق"
                        className={RADAR_NAV_ICON_BTN}
                    >
                        <ChevronRight size={18} />
                    </button>
                    <p
                        className={`min-w-0 px-1 text-center text-[15px] sm:text-base font-bold tabular-nums truncate ${RADAR_TEXT}`}
                        aria-live="polite"
                    >
                        {MONTHS[viewMonth]} {viewYear}
                    </p>
                    <button
                        type="button"
                        onClick={onNextMonth}
                        aria-label="الشهر التالي"
                        className={RADAR_NAV_ICON_BTN}
                    >
                        <ChevronLeft size={18} />
                    </button>
                </div>

                <button
                    type="button"
                    onClick={onToggleFullMonth}
                    onPointerEnter={prefetchRadarCalendarGrid}
                    onPointerDown={prefetchRadarCalendarGrid}
                    data-testid="radar-toggle-full-month"
                    aria-label={showFullMonth ? 'إغلاق التقويم' : 'فتح التقويم'}
                    className={`${showFullMonth ? RADAR_BTN_GHOST_ACTIVE : RADAR_BTN_GHOST} hami-radar-month-nav__calendar-btn shrink-0`}
                >
                    <Calendar size={15} className={showFullMonth ? RADAR_ICON_ACCENT : RADAR_ICON_GOLD} />
                    <span className="hidden sm:inline">{showFullMonth ? 'إغلاق' : 'التقويم'}</span>
                </button>
            </div>

            <div className="hami-radar-month-nav__divider" aria-hidden />

            <div
                className={`hami-radar-month-nav__day-row flex items-center justify-between gap-2 min-w-0 w-full ${
                    todaySelected ? 'hami-radar-month-nav__day-row--today' : ''
                }`}
                data-testid="radar-selected-day-label"
                aria-live="polite"
            >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="hami-radar-month-nav__date-icon shrink-0" aria-hidden>
                        <Calendar size={14} className={RADAR_ICON_GOLD} />
                    </span>
                    <div className="min-w-0">
                        <p className={`truncate text-[13px] sm:text-sm font-bold leading-tight ${RADAR_TEXT}`}>
                            {dayLabel?.title ?? 'اختر تاريخاً'}
                        </p>
                        {dayLabel?.meta ? (
                            <p className={`truncate text-[10px] sm:text-[11px] mt-0.5 ${RADAR_TEXT_MUTED}`}>
                                {dayLabel.meta}
                            </p>
                        ) : null}
                    </div>
                </div>

                {todaySelected ? (
                    <span className="hami-radar-month-nav__today-badge shrink-0">اليوم</span>
                ) : (
                    <button
                        type="button"
                        onClick={onGoToToday}
                        className="hami-radar-month-nav__today-btn shrink-0 min-h-[40px] px-3 text-[11px] font-extrabold touch-manipulation"
                        data-testid="radar-today"
                    >
                        اليوم
                    </button>
                )}
            </div>
        </div>
    );
});
