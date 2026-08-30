/** أصناف قشرة الفتح والرادار الحي — ملف سلاسل فقط، بلا مكوّن، حتى لا يتكرر الكروم */
export const RADAR_PAGE =
    'hami-radar-page flex flex-col h-full min-h-[100dvh] overflow-hidden relative isolate ' +
    'hami-radar-dark-surface hami-radar-text-primary';

export const RADAR_SCROLL =
    'hami-radar-scroll flex-1 overflow-y-auto scrollbar-hide px-3 pt-1.5 pb-2.5 relative z-[1]';

export const RADAR_ADD_DOCK =
    'hami-radar-add-dock shrink-0 relative z-[3] px-3 pt-1 ' +
    'pb-[max(0.75rem,var(--hami-lawyer-header-safe-bottom,env(safe-area-inset-bottom,0px)))]';

export const RADAR_HEADER =
    'hami-radar-header relative flex items-center justify-between px-3 py-1.5 sticky top-0 z-50 ' +
    'pt-[max(0.75rem,var(--hami-lawyer-header-safe-top,env(safe-area-inset-top,0px)))]';

export const RADAR_MONTH_NAV = 'hami-radar-month-nav flex flex-col mb-2';

export const RADAR_BTN_ADD =
    'hami-radar-add-btn flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold touch-manipulation w-full transition-colors duration-150';

export const RADAR_BTN_GHOST =
    'flex min-h-[44px] items-center justify-center px-3 py-1.5 rounded-lg text-[12px] font-semibold touch-manipulation ' +
    'bg-transparent border-0 hami-radar-text-secondary hami-radar-ghost-hover';

export const RADAR_BACK_BTN =
    'flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 hami-radar-text-secondary transition-colors touch-manipulation hami-radar-hover-row';

export const RADAR_TITLE =
    'hami-radar-title text-[15px] sm:text-base font-semibold tracking-tight hami-radar-text-primary';

export const RADAR_NAV_ICON_BTN =
    'flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg hami-radar-text-secondary transition-colors touch-manipulation hami-radar-hover-row';

export const RADAR_MONTH_CALENDAR_BTN = `${RADAR_BTN_GHOST} hami-radar-month-nav__calendar-btn shrink-0`;

export const RADAR_BTN_GHOST_ACTIVE =
    'flex min-h-[44px] items-center justify-center px-3 py-1.5 rounded-lg text-[12px] font-semibold touch-manipulation ' +
    'bg-transparent border-0 text-[#E6C673]';

export const RADAR_CALENDAR_SHELL =
    'hami-radar-glass-panel relative overflow-hidden rounded-xl border-0 bg-transparent';
