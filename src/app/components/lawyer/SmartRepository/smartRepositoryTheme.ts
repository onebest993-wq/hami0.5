export const REPO_OVERLAY =
    'fixed inset-0 z-[120] flex flex-col overscroll-contain hami-repository-overlay';

export const REPO_PANEL =
    'hami-repository-panel relative w-full max-w-none flex flex-col min-h-0 overflow-hidden rounded-none ' +
    'h-[100dvh] max-h-[100dvh] ' +
    'pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ' +
    'border-0 shadow-none';

/** هدف لمس أيقونة — 44×44 (Apple HIG / Material) */
export const REPO_TOUCH_ICON =
    'inline-flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] touch-manipulation';

/** هدف لمس رقاقة/فلتر — ارتفاع 44px */
export const REPO_TOUCH_CHIP =
    'inline-flex items-center justify-center shrink-0 min-h-[44px] touch-manipulation';

/** زر أيقونة داخل بطاقة */
export const REPO_CARD_ICON_BTN =
    'inline-flex items-center justify-center min-h-[44px] min-w-[44px] touch-manipulation rounded-lg';

export const REPO_VIEW_BTN =
    'inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[5.25rem] px-3 py-2 rounded-xl text-xs font-bold border border-white/10 ' +
    'bg-white/[0.04] text-white/60 hover:text-[#E6C673] hover:border-[#E6C673]/28 transition-colors shrink-0';

export const REPO_TOOLBAR_ROW =
    'px-5 py-3 flex flex-nowrap items-center gap-2 shrink-0 border-b border-white/[0.06] overflow-x-auto scrollbar-none';

/** شبكة أزرار الإجراءات — أحجام موحّدة */
export const REPO_ACTION_GRID =
    'hami-repository-action-grid grid grid-cols-3 sm:grid-cols-6 gap-2 px-5 py-3 shrink-0';

export const REPO_CONTROLS_SHELL = 'hami-repository-controls shrink-0 relative z-[1]';

export const REPO_ACTION_BTN =
    'flex flex-col items-center justify-center gap-1 h-[3.5rem] w-full rounded-xl border text-[10px] font-bold ' +
    'bg-[#0A0F1C]/45 transition-colors active:scale-[0.97] select-none';

export const REPO_CUSTOM_CAT_ROW =
    'hami-repository-filter-scroll flex items-center gap-2 px-5 pb-2 pt-0 shrink-0 min-h-[44px]';

export const REPO_CUSTOM_CAT_CHIP =
    'shrink-0 rounded-full text-[10px] font-bold border border-white/10 bg-white/[0.04] text-white/55 min-h-[44px]';

export const REPO_CUSTOM_CAT_CHIP_ACTIVE =
    'shrink-0 rounded-full text-[10px] font-bold border border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673] min-h-[44px]';

export const REPO_CUSTOM_CAT_ADD =
    `${REPO_TOUCH_CHIP} gap-1.5 px-3 rounded-full text-[10px] font-bold ` +
    'border border-dashed border-[#E6C673]/30 text-[#E6C673]/80 hover:bg-[#E6C673]/8 transition-colors';

export const REPO_HEADER =
    'hami-repository-header relative px-5 py-4 shrink-0 z-[2]';

export const REPO_TAB_LIST =
    'flex gap-1 p-1 mx-5 mt-3 rounded-2xl border border-white/[0.08] bg-[#0A0F1C]/60 shrink-0';

export const REPO_TAB_TRIGGER =
    'flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ' +
    'data-[state=active]:bg-[#E6C673]/20 data-[state=active]:text-[#E6C673] data-[state=active]:border data-[state=active]:border-[#E6C673]/35 ' +
    'text-white/50 hover:text-white/70';

export const REPO_BODY =
    'hami-repository-feed-scroll hami-repository-feed-surface h-0 flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-5 py-4 ' +
    '[-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]';

export const REPO_FEED_ITEM = 'hami-repository-feed-item [content-visibility:auto] [contain-intrinsic-size:auto_140px]';

export const REPO_INPUT =
    'w-full bg-[#0A0F1C]/70 border border-white/[0.12] rounded-xl px-4 py-3 text-[#F4F0E8] placeholder:text-white/30 outline-none ' +
    'transition-all focus:border-[#E6C673]/45 focus:bg-[#0A0F1C]/90 focus:ring-1 focus:ring-[#E6C673]/18';

export const REPO_BTN_GOLD =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm transition-all touch-manipulation ' +
    'bg-[#E6C673]/16 border border-[#E6C673]/38 text-[#E6C673] hover:bg-[#E6C673]/24 active:scale-[0.98] disabled:opacity-50';

export const REPO_ICON_BTN =
    `${REPO_TOUCH_ICON} rounded-xl bg-white/[0.05] border border-white/10 text-white/65 hover:text-[#E6C673] hover:border-[#E6C673]/28 transition-colors`;

export const REPO_FILTER_ROW =
    'hami-repository-filter-scroll flex gap-2 overflow-x-auto overscroll-x-contain touch-pan-x pb-1 px-5 pt-3 shrink-0 scrollbar-none items-center';

export const REPO_FILTER_CHIP =
    `${REPO_TOUCH_CHIP} px-3.5 rounded-full text-xs font-bold border transition-[color,background-color,border-color] duration-100 ` +
    'border-white/10 bg-white/[0.04] text-white/55 hover:border-[#E6C673]/25 hover:text-white/75';

export const REPO_FILTER_CHIP_ACTIVE =
    `${REPO_TOUCH_CHIP} px-3.5 rounded-full text-xs font-bold border transition-[color,background-color,border-color] duration-100 ` +
    'border-[#E6C673]/35 bg-[#E6C673]/14 text-[#E6C673]';

export const REPO_CARD =
    'rounded-2xl border border-white/[0.10] bg-[#0A0F1C]/72 p-4 transition-[border-color] hover:border-[#E6C673]/22';

export const REPO_BADGE_GOLD =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ' +
    'bg-[#E6C673]/14 border border-[#E6C673]/30 text-[#E6C673]';
