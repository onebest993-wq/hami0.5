export const REPO_OVERLAY =
    'fixed inset-0 z-[220] flex flex-col overscroll-contain hami-repository-overlay';

/** فوق طبقة المستودع (z-220) — قوائم portal للفلاتر والعرض */
export const REPO_PORTAL_Z = 'z-[230]';

/** حجز الشريط عبر .hami-repository-panel / --hami-lawyer-header-safe-top */
export const REPO_PANEL =
    'hami-repository-panel relative w-full max-w-none flex flex-col min-h-0 overflow-hidden rounded-none ' +
    'h-[100dvh] max-h-[100dvh] hami-overlay-safe-insets ' +
    'border-0 shadow-none';

/** هدف لمس أيقونة — 44×44 (Apple HIG / Material) */
export const REPO_TOUCH_ICON =
    'inline-flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] touch-manipulation';

/** هدف لمس رقاقة/فلتر — ارتفاع 44px */
export const REPO_TOUCH_CHIP =
    'inline-flex items-center justify-center shrink-0 min-h-[44px] touch-manipulation';

/** هدف لمس أيقونة داخل بطاقة — 44×44 */
export const REPO_CARD_ICON_BTN =
    'hami-repo-card-icon-btn ' +
    `${REPO_TOUCH_ICON} rounded-xl border-0 bg-white/[0.04] text-white/50 ` +
    'hover:text-[#E6C673] hover:bg-[#E6C673]/10 transition-colors';

export const REPO_CARD_ICON_BTN_ACTIVE =
    'hami-repo-card-icon-btn ' +
    `${REPO_TOUCH_ICON} rounded-xl border-0 bg-[#E6C673]/12 text-[#E6C673] transition-colors`;

export const REPO_CONTROLS_SHELL = 'hami-repository-controls shrink-0 relative z-[1]';

/** شريط الغرف تحت البحث */
export const REPO_FILTER_RAIL =
    'hami-repository-filter-scroll flex items-center gap-2 px-4 py-1.5 shrink-0 min-h-[44px]';

export const REPO_ADD_MENU_BTN =
    'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 rounded-2xl text-xs font-medium touch-manipulation ' +
    'border-0 bg-[#E6C673]/16 text-[#E6C673] ' +
    'hover:bg-[#E6C673]/24 active:opacity-[0.88] transition-colors';

export const REPO_ADD_MENU_PANEL =
    'absolute top-full mt-1.5 end-0 z-40 min-w-[11.5rem] rounded-2xl border border-white/10 ' +
    'bg-[#121826] p-1.5 flex flex-col gap-0.5';

export const REPO_ADD_MENU_ITEM =
    'flex w-full items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-xs font-medium text-[#F4F4F5]/90 ' +
    'hover:bg-white/[0.06] hover:text-[#F4F4F5] text-right touch-manipulation';

export const REPO_ROOM_CHIP =
    `${REPO_TOUCH_CHIP} gap-1.5 px-3.5 rounded-full text-xs font-medium border-0 transition-colors ` +
    'bg-white/[0.05] text-white/70 ' +
    'hover:text-[#F4F4F5] hover:bg-white/[0.08]';

export const REPO_ROOM_CHIP_ACTIVE =
    `${REPO_TOUCH_CHIP} gap-1.5 px-3.5 rounded-full text-xs font-medium border-0 transition-colors ` +
    'bg-[#E6C673]/16 text-[#E6C673]';

export const REPO_ROOM_MENU =
    `${REPO_PORTAL_Z} min-w-[15rem] max-w-[min(92vw,18rem)] rounded-2xl border border-white/10 ` +
    'bg-[#121826] p-0 overflow-hidden ' +
    'flex flex-col max-h-[min(52vh,22rem)]';

export const REPO_ROOM_MENU_SCROLL =
    'flex-1 min-h-0 overflow-y-auto overscroll-contain p-1.5';

export const REPO_ROOM_MENU_FOOTER =
    'shrink-0 border-t border-white/[0.06] bg-[#0A0F1C] p-1.5 flex flex-col gap-0.5';

export const REPO_ROOM_MENU_ITEM =
    'flex w-full items-center justify-between gap-2 min-h-[44px] px-3 rounded-xl text-xs font-medium text-[#F4F4F5]/90 ' +
    'hover:bg-white/[0.06] text-right touch-manipulation';

export const REPO_ROOM_MENU_ACTION =
    'flex w-full items-center gap-2 min-h-[44px] px-3 rounded-xl text-xs font-medium text-[#E6C673] ' +
    'hover:bg-[#E6C673]/12 text-right touch-manipulation';

export const REPO_HEADER =
    'hami-repository-header relative px-4 py-2.5 shrink-0 z-[20] isolate';

export const REPO_ICON_BTN =
    'hami-repository-back-btn ' +
    `${REPO_TOUCH_ICON} relative z-[30] rounded-full bg-transparent border-0 text-white/55 ` +
    'hover:text-[#F4F4F5] hover:bg-white/[0.06] transition-colors';

export const REPO_BODY =
    'hami-repository-feed-scroll hami-repository-feed-surface h-0 flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-5 py-4 ' +
    '[-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]';

export const REPO_FEED_ITEM = 'hami-repository-feed-item';

export const REPO_INPUT =
    'w-full bg-white/[0.05] border-0 rounded-2xl px-4 py-3 text-[#F4F4F5] placeholder:text-white/30 outline-none text-base ' +
    'transition-colors focus:bg-white/[0.07] focus:ring-1 focus:ring-[#E6C673]/30';

export const REPO_SURFACE_BASE =
    'rounded-2xl border border-white/[0.07] bg-white/[0.035]';

/** بطاقة إنشاء المسودة — خفيفة ومضغوطة */
export const REPO_COMPOSE_SHELL =
    `hami-repo-compose ${REPO_SURFACE_BASE} p-3 mb-3 space-y-2.5`;

export const REPO_COMPOSE_META =
    'text-[10px] font-medium uppercase tracking-wide text-white/32';

export const REPO_COMPOSE_TITLE =
    'w-full bg-transparent border-0 border-b border-white/[0.08] rounded-none px-0 py-1.5 text-base font-semibold leading-snug text-[#F4F4F5] ' +
    'placeholder:text-white/28 outline-none focus:border-[#E6C673]/35 transition-colors';

export const REPO_COMPOSE_FOOTER =
    'flex flex-wrap items-center gap-2 pt-2 mt-0.5 border-t border-white/[0.06]';

export const REPO_COMPOSE_ICON_BTN = REPO_CARD_ICON_BTN;

export const REPO_COMPOSE_ICON_BTN_ACTIVE = REPO_CARD_ICON_BTN_ACTIVE;

export const REPO_COMPOSE_SAVE =
    'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-2xl text-xs font-medium touch-manipulation ' +
    'bg-[#E6C673] text-[#0A0F1C] hover:bg-[#edd49a] disabled:opacity-50 transition-colors';

export const REPO_COMPOSE_CANCEL =
    'inline-flex items-center justify-center min-h-[44px] px-3 rounded-2xl text-xs font-medium text-white/45 ' +
    'hover:text-white/70 touch-manipulation transition-colors';

export const REPO_COMPOSE_ATTACH_CHIP =
    'inline-flex items-center gap-1.5 max-w-[min(100%,14.5rem)] min-h-[44px] ps-2 pe-0.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[11px] text-white/55';

export const REPO_CARD = `hami-repo-card ${REPO_SURFACE_BASE} p-3`;

/** صف ملاحظة داخل مخزن الإضبارة */
export const REPO_NOTE_ROW =
    'hami-repo-note-row rounded-lg border border-white/[0.06] bg-white/[0.025] p-2.5';

export const REPO_CARD_META =
    'hami-repo-card-meta flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-2 min-h-[1.25rem]';

export const REPO_CARD_TIMESTAMP = 'text-[10px] font-medium text-white/35 tabular-nums';

export const REPO_CARD_TITLE =
    'hami-repo-card-title font-semibold text-sm leading-snug text-[#F4F4F5] line-clamp-2';

export const REPO_CARD_NOTE = 'hami-repo-card-note text-[12px] leading-relaxed text-white/55 line-clamp-3';

export const REPO_CARD_EDIT_LINK =
    'inline-flex items-center min-h-[44px] px-1 text-[11px] font-medium text-[#E6C673]/90 hover:text-[#E6C673] touch-manipulation transition-colors';

export const REPO_CARD_ACTIONS =
    'hami-repo-card-actions relative z-[2] flex flex-wrap items-center justify-between gap-1.5 pt-2 mt-2 border-t border-white/[0.06] pointer-events-auto';

export const REPO_CARD_HEADING = 'text-[11px] font-medium text-[#E6C673]/85 text-right';

export const REPO_BADGE_GOLD =
    'hami-repo-badge hami-repo-badge--gold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ' +
    'bg-[#E6C673]/12 text-[#E6C673]';

export const REPO_BADGE_IMAGE =
    'hami-repo-badge hami-repo-badge--image inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ' +
    'bg-sky-400/10 text-sky-300/90';

export const REPO_BADGE_PDF =
    'hami-repo-badge hami-repo-badge--pdf inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ' +
    'bg-rose-400/10 text-rose-300/90';

export const REPO_BADGE_AUDIO =
    'hami-repo-badge hami-repo-badge--audio inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ' +
    'bg-violet-400/10 text-violet-300/90';

export const REPO_BADGE_FILE =
    'hami-repo-badge hami-repo-badge--file inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ' +
    'bg-zinc-400/10 text-zinc-300/90';
