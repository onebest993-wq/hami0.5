import React, { memo, useEffect, useMemo } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';
import {
    HomeArrowRightIcon,
    HomeChevronLeftIcon,
    HomeChevronRightIcon,
    HomePlusIcon,
} from '@/app/components/lawyer/dashboard/homeStemIcons';
import { buildRadarOpenInstantSnapshot } from '@/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeModel';
import '@/app/components/lawyer/SmartLegalRadar/radarCss/radarPage.css';
import '@/app/components/lawyer/SmartLegalRadar/radarCss/radarChrome.css';
import '@/app/components/lawyer/dashboard/schedule/radarOpenInstantPaint.css';

/** نفس سلاسل radarTheme — CSS الكروم فقط؛ بلا استيراد JS SmartLegalRadar إلى جذع MainView */
const PAGE =
    'hami-radar-page flex flex-col h-full min-h-[100dvh] overflow-hidden relative isolate ' +
    'hami-radar-dark-surface hami-radar-text-primary';
const HEADER =
    'hami-radar-header relative flex items-center justify-between px-4 py-2 sticky top-0 z-50 ' +
    'pt-[max(0.75rem,var(--hami-lawyer-header-safe-top,env(safe-area-inset-top,0px)))]';
const BACK_BTN =
    'flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 hami-radar-text-secondary transition-colors touch-manipulation hami-radar-hover-row';
const TITLE = 'hami-radar-title text-[15px] sm:text-base font-semibold tracking-tight hami-radar-text-primary';
const SCROLL = 'hami-radar-scroll flex-1 overflow-y-auto scrollbar-hide px-4 pt-2 pb-3 relative z-[1]';
const MONTH_NAV = 'hami-radar-month-nav flex flex-col mb-2';
const MONTH_BTN =
    'flex min-h-[44px] items-center justify-center px-3 py-1.5 rounded-lg text-[12px] font-semibold touch-manipulation ' +
    'bg-transparent border-0 hami-radar-text-secondary hami-radar-ghost-hover hami-radar-month-nav__calendar-btn shrink-0';
const NAV_ICON =
    'flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg hami-radar-text-secondary transition-colors touch-manipulation hami-radar-hover-row';
const ADD_DOCK =
    'hami-radar-add-dock shrink-0 relative z-[3] px-4 pt-1.5 ' +
    'pb-[max(0.75rem,var(--hami-lawyer-header-safe-bottom,env(safe-area-inset-bottom,0px)))]';
const ADD_BTN =
    'hami-radar-add-btn flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold touch-manipulation w-full transition-colors duration-150';

/**
 * قشرة فتح التقويم — أصناف الرادار الحي + CSS الكروم.
 * لا تستورد JS الرادار حتى لا يدخل جذع MainView.
 */
export const RadarOpenInstantChrome = memo(function RadarOpenInstantChrome({
    onBack,
}: {
    onBack: () => void;
}): React.ReactElement {
    const snapshot = useMemo(() => buildRadarOpenInstantSnapshot(), []);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            onBack();
        };
        window.addEventListener('keydown', onKey, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            onBack();
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKey, true);
            unregisterNativeBack();
        };
    }, [onBack]);

    return (
        <div
            className={PAGE}
            data-testid="schedule-tab-loading"
            role="status"
            aria-busy="true"
            aria-label="رادار المواعيد"
            dir="rtl"
        >
            <header className={HEADER}>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onBack();
                    }}
                    data-testid="radar-back"
                    className={BACK_BTN}
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    aria-label="رجوع"
                >
                    <HomeArrowRightIcon size={20} />
                    <span className="font-semibold text-sm">رجوع</span>
                </button>
                <h1 className={TITLE}>رادار المواعيد</h1>
                <div className="w-10 flex items-center justify-end" aria-hidden />
            </header>

            <div className={SCROLL}>
                <div className={MONTH_NAV} dir="rtl" data-testid="radar-month-nav">
                    <div className="hami-radar-month-nav__month-row flex items-center gap-2 min-w-0 w-full">
                        <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
                            <button type="button" tabIndex={-1} className={NAV_ICON} aria-hidden>
                                <HomeChevronRightIcon size={18} />
                            </button>
                            <p
                                className="hami-radar-text-primary min-w-0 px-1 text-center text-[15px] sm:text-base font-bold tabular-nums truncate"
                                aria-live="polite"
                                data-testid="radar-month-label"
                            >
                                {snapshot.monthLabel}
                            </p>
                            <button type="button" tabIndex={-1} className={NAV_ICON} aria-hidden>
                                <HomeChevronLeftIcon size={18} />
                            </button>
                        </div>
                        <button type="button" tabIndex={-1} className={MONTH_BTN} aria-hidden>
                            الشهر
                        </button>
                    </div>

                    <div
                        className="hami-radar-month-nav__caption"
                        data-testid="radar-selected-day-label"
                    >
                        <div className="min-w-0 text-right">
                            <p className="hami-radar-text-primary truncate text-[13px] sm:text-sm font-bold leading-tight">
                                {snapshot.dayTitle}
                            </p>
                            {snapshot.dayMeta ? (
                                <p className="hami-radar-text-secondary truncate text-[10px] sm:text-[11px] mt-0.5">
                                    {snapshot.dayMeta}
                                </p>
                            ) : null}
                        </div>
                        <span className="hami-radar-month-nav__today-badge shrink-0">اليوم</span>
                    </div>

                    <div
                        className="hami-radar-week-strip"
                        data-testid="radar-week-strip"
                        role="group"
                        aria-label="أيام الأسبوع"
                    >
                        {snapshot.week.map((day) => (
                            <button
                                key={day.ymd}
                                type="button"
                                tabIndex={-1}
                                data-testid={`radar-week-day-${day.ymd}`}
                                className={`hami-radar-week-strip__day${
                                    day.selected ? ' hami-radar-week-strip__day--selected' : ''
                                }${
                                    day.muted && !day.selected
                                        ? ' hami-radar-week-strip__day--muted'
                                        : ''
                                }`}
                            >
                                <span className="hami-radar-week-strip__name">{day.name}</span>
                                <span className="hami-radar-week-strip__num">{day.dayNum}</span>
                                <span
                                    className="hami-radar-week-strip__dot hami-radar-week-strip__dot--empty"
                                    aria-hidden
                                />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative space-y-2.5 pb-4">
                    <div className="hami-radar-empty" data-testid="radar-empty-state">
                        <p className="hami-radar-text-secondary text-[13px] font-medium leading-relaxed">
                            لا توجد مواعيد لهذا اليوم
                        </p>
                    </div>
                </div>
            </div>

            <div className={ADD_DOCK} data-testid="radar-day-actions">
                <div className={`${ADD_BTN} pointer-events-none select-none`} aria-hidden>
                    <HomePlusIcon size={16} aria-hidden />
                    إضافة موعد
                </div>
            </div>
        </div>
    );
});
