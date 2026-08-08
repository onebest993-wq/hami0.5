/**
 * رادار المواعيد — فحمي / رصاصي أساس، لؤلؤي جانبي
 */
export const RADAR_BG_MAIN = '#121212';
export const RADAR_BG_CARD = '#1A1A1A';
export const RADAR_BG_ELEVATED = '#242424';
export const RADAR_BG_CARD_HOVER = '#2A2A2A';
export const RADAR_BORDER = '#64748B';
export const RADAR_BORDER_SOFT = '#334155';
export const RADAR_BORDER_ACCENT = '#FFFFFF';
export const RADAR_TEXT_PRIMARY = '#FBF9F5';
export const RADAR_TEXT_SECONDARY = '#94A3B8';
export const RADAR_ACCENT_PEARL = '#FBF9F5';
export const RADAR_ACCENT_PEARL_MUTED = '#E2E8F0';
export const RADAR_COLOR_BTN_SURFACE = '#FBF9F5';
export const RADAR_COLOR_BTN_TEXT = '#121212';

/** توافق — مراجع قديمة */
export const RADAR_PEARL = RADAR_ACCENT_PEARL;
export const RADAR_CREAM = '#F5EDE0';
export const RADAR_IVORY = '#E8DCC8';
export const RADAR_BEIGE = '#EDE4D6';
export const RADAR_MIST = RADAR_TEXT_SECONDARY;
export const RADAR_MIST_SOFT = '#64748B';
export const RADAR_SAGE = RADAR_MIST;
export const RADAR_SAGE_SOFT = RADAR_MIST_SOFT;
export const RADAR_COLOR_BTN_PRIMARY = RADAR_COLOR_BTN_TEXT;

export const RADAR_TEXT = 'hami-radar-text-primary';
export const RADAR_TEXT_MUTED = 'hami-radar-text-secondary';
export const RADAR_BORDER_WHITE = 'border-white';

export const RADAR_PAGE =
    'hami-radar-page flex flex-col h-full min-h-[100dvh] overflow-hidden relative isolate ' +
    'hami-radar-dark-surface hami-radar-text-primary';

export const RADAR_SCROLL =
    'hami-radar-scroll flex-1 overflow-y-auto scrollbar-hide p-4 pb-3 relative z-[1]';

export const RADAR_ADD_DOCK =
    'hami-radar-add-dock shrink-0 relative z-[3] px-4 pt-1.5 ' +
    'pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]';

export const RADAR_HEADER =
    'flex items-center justify-between px-4 py-3.5 sticky top-0 z-50 ' +
    'pt-[max(0.875rem,env(safe-area-inset-top,0px))] ' +
    'hami-radar-elevated-surface border-b border-white ' +
    'shadow-[0_4px_20px_rgba(0,0,0,0.35)]';

export const RADAR_MONTH_NAV =
    'hami-radar-month-nav hami-radar-glass-panel flex flex-col mb-4 px-3 py-2.5 rounded-2xl ' +
    'border hami-radar-border-nav hami-radar-card-surface ' +
    'shadow-[0_4px_16px_rgba(0,0,0,0.28)]';

export const RADAR_GLASS_PANEL =
    'hami-radar-glass-panel rounded-2xl border hami-radar-border-briefing hami-radar-card-surface ' +
    'shadow-[0_6px_22px_rgba(0,0,0,0.3)]';

export const RADAR_GLASS_PANEL_BRIEFING_CONFLICT =
    'hami-radar-glass-panel rounded-2xl border hami-radar-border-briefing-conflict hami-radar-card-surface ' +
    'shadow-[0_6px_22px_rgba(0,0,0,0.3)]';

export const RADAR_CALENDAR_SHELL =
    'hami-radar-glass-panel relative overflow-hidden rounded-3xl border border-white ' +
    'hami-radar-card-surface shadow-[0_10px_32px_rgba(0,0,0,0.32)]';

export const RADAR_INPUT =
    'w-full hami-radar-card-surface border border-white/80 rounded-xl px-3 py-2.5 ' +
    'hami-radar-text-primary text-sm outline-none transition-all ' +
    'focus:border-white focus:ring-1 focus:ring-white/25 [color-scheme:dark]';

export const RADAR_LABEL = 'block hami-radar-text-secondary text-[11px] font-bold mb-1.5';

export const RADAR_BTN_PRIMARY =
    'hami-radar-pearl-surface flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold touch-manipulation ' +
    'border border-white transition-colors duration-150';

/** زر إضافة موعد — ألوان هادئة غير فاقعة */
export const RADAR_BTN_ADD =
    'hami-radar-add-btn flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold touch-manipulation w-full transition-colors duration-150';

export const RADAR_BTN_GOLD = RADAR_BTN_PRIMARY;

export const RADAR_BTN_GHOST =
    'flex min-h-[44px] items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all touch-manipulation ' +
    'bg-[#2A2A2A] border border-white/70 hami-radar-text-secondary hami-radar-ghost-hover';

export const RADAR_BTN_GHOST_ACTIVE =
    'flex min-h-[44px] items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all touch-manipulation ' +
    'bg-[#1A1A1A] border border-white hami-radar-text-primary ' +
    'shadow-[0_2px_10px_rgba(0,0,0,0.25)]';

export const RADAR_ALERT_PANEL_BASE =
    'rounded-xl border hami-radar-card-surface p-3 hami-radar-text-primary ' +
    'shadow-[0_6px_20px_rgba(0,0,0,0.28)]';

export const RADAR_ALERT_BORDER_OVERLOAD = 'hami-radar-alert-border-overload';
export const RADAR_ALERT_BORDER_LOCATION = 'hami-radar-alert-border-location';
export const RADAR_ALERT_BORDER_TRAVEL = 'hami-radar-alert-border-travel';
export const RADAR_ALERT_BORDER_TIME = 'hami-radar-alert-border-time';
export const RADAR_ALERT_BORDER_DEFAULT = 'hami-radar-alert-border-default';

/** @deprecated استخدم RADAR_ALERT_PANEL_BASE + فئة الإطار المناسبة */
export const RADAR_ALERT_PANEL = `${RADAR_ALERT_PANEL_BASE} ${RADAR_ALERT_BORDER_DEFAULT}`;

export const RADAR_ALERT_ICON = 'hami-radar-text-secondary';
export const RADAR_ALERT_TEXT = 'hami-radar-text-primary';
export const RADAR_ALERT_MUTED = 'hami-radar-text-secondary';

export const RADAR_DEADLINE_PANEL =
    'rounded-xl border border-white/80 bg-[#2A2A2A] px-3 py-2 text-right';

export const RADAR_DEADLINE_TEXT = 'hami-radar-text-primary';

export const RADAR_CHIP =
    'inline-flex max-w-full items-center gap-1 rounded-full border border-white/70 ' +
    'bg-[#2A2A2A] px-2 py-0.5 text-[10px] hami-radar-text-secondary';

export const RADAR_FORM_OVERLAY =
    'fixed inset-0 z-[99999] bg-[#000000]/72 backdrop-blur-[4px] flex items-end sm:items-center justify-center p-3 sm:p-4';

export const RADAR_FORM_PANEL =
    'hami-radar-form-panel w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[90dvh] overflow-y-auto overscroll-contain';

export const RADAR_FORM_INPUT = 'hami-radar-form-input min-h-[44px] touch-manipulation';
export const RADAR_FORM_LABEL = 'hami-radar-form-label';
export const RADAR_FORM_ICON_BTN = 'hami-radar-form-icon-btn touch-manipulation';
export const RADAR_FORM_BTN_DISABLED = 'hami-radar-form-btn-disabled flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold';

export const RADAR_FORM_BTN_DANGER =
    'flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-800 transition-all touch-manipulation ' +
    'hover:bg-rose-100 hover:border-rose-400 disabled:opacity-50';

export const RADAR_ICON_GOLD = 'hami-radar-text-secondary';
export const RADAR_ICON_ACCENT = 'hami-radar-text-primary';

export const RADAR_BACK_BTN =
    'flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 hami-radar-text-secondary transition-colors touch-manipulation hami-radar-hover-row';

export const RADAR_TITLE =
    'text-base sm:text-lg font-bold hami-radar-text-primary flex items-center gap-2';

export const RADAR_NAV_ICON_BTN =
    'flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg hami-radar-text-secondary transition-colors touch-manipulation hami-radar-hover-row';

export const RADAR_BTN_DISABLED =
    'bg-[#2A2A2A] text-[#64748B] cursor-not-allowed border border-white/50';

export const RADAR_BTN_DANGER =
    'flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-400/45 bg-rose-950/40 px-4 py-2.5 text-sm font-bold text-rose-300 transition-all touch-manipulation ' +
    'hover:bg-rose-950/55 hover:border-rose-300/55 disabled:opacity-50';

export const RADAR_ICON_BTN =
    'flex h-[44px] w-[44px] items-center justify-center rounded-lg hami-radar-text-secondary transition-colors touch-manipulation hami-radar-hover-row';

export const RADAR_SKELETON = 'hami-radar-skeleton animate-pulse';

export const RADAR_ACCENT_CHIP = 'hami-radar-accent-chip border-white/70';
