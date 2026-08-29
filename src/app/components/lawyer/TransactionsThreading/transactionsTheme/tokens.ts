export const TX_TOUCH_ICON =
    'inline-flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] touch-manipulation';

/** هدف لمس رقاقة/فلتر — ارتفاع 44px */
export const TX_TOUCH_CHIP =
    'inline-flex items-center justify-center shrink-0 min-h-[44px] touch-manipulation';

export const GLASS_FIELD =
    'w-full min-h-[44px] h-11 px-3 rounded-xl border border-black/10 bg-white text-[#0A0F1C] text-base ' +
    'placeholder:text-black/35 outline-none focus:border-[#E6C673] focus:ring-1 focus:ring-[#E6C673]/30 transition-colors';

export const GLASS_CHIP =
    `${TX_TOUCH_CHIP} px-3.5 rounded-full text-[11px] font-bold border border-white/12 ` +
    'bg-white/[0.04] text-[#F4F4F5] hover:bg-white/[0.08] hover:border-white/20 transition-colors';

export const GLASS_CHIP_ACTIVE =
    `${TX_TOUCH_CHIP} px-3.5 rounded-full text-[11px] font-bold border border-[#E6C673]/45 ` +
    'bg-[#E6C673]/15 text-[#E6C673]';

export const GLASS_BTN =
    'w-full h-12 rounded-xl font-bold text-sm border border-[#E6C673]/50 ' +
    'bg-[#E6C673] text-[#0A0F1C] hover:bg-[#edd49a] ' +
    'disabled:bg-[#E6C673]/40 disabled:text-[#0A0F1C]/50 disabled:border-transparent disabled:opacity-100';

export const TX_OVERLAY =
    'hami-tx-overlay-layer hami-overlay-safe-insets fixed inset-0 z-[230] bg-[#0A0F1C] overflow-hidden overscroll-y-contain touch-pan-y touch-manipulation [contain:layout] pointer-events-auto';

export const TX_PAGE_SHELL =
    "h-[100dvh] min-h-0 flex flex-col overflow-hidden font-['Tajawal','Cairo',sans-serif] text-right relative text-[#F4F4F5] bg-[#0A0F1C]";

/** قائمة البطاقات — تمرير لمس بلا شريط جانبي؛ الارتفاع يتبع المساحة المتبقية */
export const TX_PAGE_SCROLL =
    'hami-tx-page-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y scrollbar-hide [-webkit-overflow-scrolling:touch]';

export const TX_DRAWER_SHELL =
    'bg-[#f8f6f2] border-t border-black/[0.06] rounded-t-2xl px-4 pt-1 overflow-hidden max-h-[92dvh] flex flex-col min-h-0 text-[#0A0F1C]';

/** تذييل ثابت فوق الكيبورد — safe-area سفلي */
export const TX_DRAWER_FOOTER =
    'shrink-0 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] border-t border-black/[0.08] bg-[#f8f6f2]';

export const TX_TAB_TRIGGER =
    'group relative flex-1 inline-flex flex-row items-center justify-center gap-2 ' +
    'h-auto min-h-[44px] px-3 py-1.5 rounded-lg border border-transparent ' +
    'bg-transparent shadow-none text-[12px] font-semibold whitespace-nowrap touch-manipulation ' +
    'text-white/40 ' +
    'data-[state=active]:bg-white/[0.06] data-[state=active]:text-[#E6C673] data-[state=active]:border-[#E6C673]/25 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export const TX_GOLD_BTN =
    'inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl font-bold text-[11px] border border-white/12 touch-manipulation ' +
    'bg-white/[0.04] text-[#F4F4F5] hover:bg-white/[0.08] hover:border-[#E6C673]/40 transition-colors';

export const TX_OCHRE_BTN =
    'inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl font-bold text-[11px] border border-[#E6C673]/45 touch-manipulation ' +
    'bg-[#E6C673]/15 text-[#E6C673] hover:bg-[#E6C673]/22 transition-colors';

export const TX_ICON_BTN =
    `${TX_TOUCH_ICON} rounded-xl border border-white/10 bg-white/[0.04] text-white/55 ` +
    'hover:bg-white/[0.08] hover:text-[#F4F4F5] hover:border-white/18 transition-colors';

export const TX_DIALOG_SHELL =
    'bg-[#121826] border border-white/10 rounded-2xl p-4 max-w-[calc(100vw-2rem)] text-[#F4F4F5]';

export const TX_DIALOG_BTN_CANCEL =
    'inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl border border-white/12 bg-white/[0.04] text-white/55 font-bold text-sm hover:bg-white/[0.08] transition-colors touch-manipulation';

export const TX_DIALOG_BTN_DANGER =
    'inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl border border-[#E6C673]/40 bg-[#E6C673]/12 text-[#E6C673] font-bold text-sm hover:bg-[#E6C673]/20 transition-colors touch-manipulation';

export const TX_DROPDOWN_CONTENT =
    'z-[235] bg-[#121826] border border-white/10 text-[#F4F4F5] rounded-xl p-1 shadow-[0_12px_32px_rgba(0,0,0,0.35)]';

export const TX_DROPDOWN_INSTANT =
    '!animate-none duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100';

export const TX_INNER_SURFACE = 'rounded-xl bg-white/[0.05] border border-white/[0.07]';

export const TX_TEXT_PRIMARY = 'text-[#F4F4F5]';
export const TX_TEXT_SECONDARY = 'text-white/60';
export const TX_TEXT_MUTED = 'text-white/45';
export const TX_TEXT_OCHRE = 'text-[#E6C673]';

export const TX_STATUS_ACTIVE = 'bg-[#E6C673]/14 text-[#E6C673] border-[#E6C673]/35';
export const TX_STATUS_PAUSED = 'bg-white/[0.04] text-white/55 border-white/12';
export const TX_STATUS_COMPLETED = 'bg-white/[0.03] text-white/40 border-white/10';

export const TX_DIALOG_TITLE = 'text-[#F4F4F5] text-base font-semibold';
export const TX_DIALOG_DESC = 'text-white/45 text-sm font-medium';

export const TX_DROPDOWN_FOCUS = 'cursor-default focus:bg-white/[0.08]';
