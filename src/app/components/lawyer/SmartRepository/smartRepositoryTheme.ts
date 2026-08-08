export const REPO_OVERLAY =
    'fixed inset-0 z-[220] flex flex-col overscroll-contain hami-repository-overlay';

/** فوق طبقة المستودع (z-220) — قوائم portal للفلاتر والعرض */
export const REPO_PORTAL_Z = 'z-[230]';

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

/** هدف لمس أيقونة داخل بطاقة — 44×44 */
export const REPO_CARD_ICON_BTN =
    'hami-repo-card-icon-btn ' +
    `${REPO_TOUCH_ICON} rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/50 ` +
    'hover:text-[#E6C673] hover:border-[#E6C673]/28 hover:bg-[#E6C673]/8 transition-colors';

export const REPO_CARD_ICON_BTN_ACTIVE =
    'hami-repo-card-icon-btn ' +
    `${REPO_TOUCH_ICON} rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673] transition-colors`;

export const REPO_VIEW_BTN =
    'inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[5.25rem] px-3 py-2 rounded-xl text-xs font-bold border border-white/10 ' +
    'bg-white/[0.04] text-white/60 hover:text-[#E6C673] hover:border-[#E6C673]/28 transition-colors shrink-0';

export const REPO_TOOLBAR_ROW =
    'px-5 py-3 flex flex-nowrap items-center gap-2 shrink-0 border-b border-white/[0.06] overflow-x-auto scrollbar-none';

/** شبكة أزرار الإنشاء — 5 خلايا متناسقة */
export const REPO_ACTION_GRID =
    'hami-repository-action-grid grid grid-cols-5 gap-2 px-5 py-3 shrink-0';

export const REPO_CONTROLS_SHELL = 'hami-repository-controls shrink-0 relative z-[1]';

/** زر إنشاء موحّد — بئر أيقونة فاخر + لمس 44px (+ كروم فوري عبر hami-repository-action-*) */
export const REPO_ACTION_BTN =
    'hami-repository-action-btn group flex flex-col items-center justify-center gap-1 min-h-[40px] h-[2.85rem] sm:h-[3rem] w-full rounded-2xl border text-[10px] font-bold touch-manipulation ' +
    'border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] text-zinc-300 ' +
    'hover:border-[#E6C673]/28 hover:from-[#E6C673]/10 hover:to-white/[0.03] hover:text-[#F4F0E8] ' +
    'transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] select-none';

export const REPO_ACTION_ICON_WELL =
    'hami-repository-action-icon-well inline-flex items-center justify-center size-8 rounded-xl border border-white/[0.08] bg-[#0A0F1C]/55 ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors ' +
    'group-hover:border-[#E6C673]/25 group-hover:bg-[#0A0F1C]/75';

/** أيقونة تبديل العرض بجانب البحث — كروم فوري يمنع الإطار الأبيض */
export const REPO_LAYOUT_ICON_BTN =
    'hami-repository-layout-toggle ' +
    `${REPO_TOUCH_ICON} rounded-xl border border-white/10 bg-[#090d18]/90 text-zinc-400 ` +
    'hover:text-[#E6C673] hover:border-[#E6C673]/28 hover:bg-[#0A0F1C]/92 transition-colors';

/** شريط فلاتر موحّد (غرفة + نوع) تحت البحث */
export const REPO_FILTER_RAIL =
    'hami-repository-filter-scroll flex items-center gap-2 px-4 pb-2 pt-1.5 shrink-0 min-h-[40px]';

export const REPO_ADD_MENU_BTN =
    'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 rounded-2xl text-xs font-bold touch-manipulation ' +
    'border border-[#E6C673]/35 bg-[#E6C673]/14 text-[#E6C673] backdrop-blur-md ' +
    'hover:bg-[#E6C673]/22 hover:border-[#E6C673]/50 active:scale-[0.98] transition-colors';

export const REPO_ADD_MENU_PANEL =
    'absolute top-full mt-1.5 end-0 z-40 min-w-[11.5rem] rounded-2xl border border-white/12 ' +
    'bg-[#0B1120]/92 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.55)] p-1.5 flex flex-col gap-0.5';

export const REPO_ADD_MENU_ITEM =
    'flex w-full items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-xs font-bold text-[#F4F0E8]/90 ' +
    'hover:bg-[#E6C673]/12 hover:text-[#F4F0E8] text-right touch-manipulation';

/** رقاقة الغرفة — زجاج خفيف */
export const REPO_ROOM_CHIP =
    `${REPO_TOUCH_CHIP} gap-1.5 px-3.5 rounded-2xl text-xs font-bold border transition-colors ` +
    'border-white/14 bg-white/[0.05] text-white/75 backdrop-blur-md ' +
    'hover:border-[#E6C673]/35 hover:text-[#F4F0E8] hover:bg-white/[0.08]';

export const REPO_ROOM_CHIP_ACTIVE =
    `${REPO_TOUCH_CHIP} gap-1.5 px-3.5 rounded-2xl text-xs font-bold border transition-colors ` +
    'border-[#E6C673]/45 bg-[#E6C673]/18 text-[#E6C673] backdrop-blur-md ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]';

/**
 * قائمة الغرف — تُستخدم مع موضع fixed (تجنّب قصّ overflow-x على الشريط).
 * الهيكل الفعلي يُبنى في RepositoryFiltersRail.
 */
export const REPO_ROOM_MENU =
    `${REPO_PORTAL_Z} min-w-[15rem] max-w-[min(92vw,18rem)] rounded-2xl border border-white/14 ` +
    'bg-[#0B1120]/94 backdrop-blur-xl shadow-[0_20px_48px_rgba(0,0,0,0.55)] p-0 overflow-hidden ' +
    'flex flex-col max-h-[min(52vh,22rem)]';

export const REPO_ROOM_MENU_SCROLL =
    'flex-1 min-h-0 overflow-y-auto overscroll-contain p-1.5';

export const REPO_ROOM_MENU_FOOTER =
    'shrink-0 border-t border-white/10 bg-[#0A0F1C]/85 backdrop-blur-md p-1.5 flex flex-col gap-0.5';

export const REPO_ROOM_MENU_ITEM =
    'flex w-full items-center justify-between gap-2 min-h-[44px] px-3 rounded-xl text-xs font-bold text-[#F4F0E8]/90 ' +
    'hover:bg-white/[0.06] text-right touch-manipulation';

export const REPO_ROOM_MENU_ACTION =
    'flex w-full items-center gap-2 min-h-[44px] px-3 rounded-xl text-xs font-bold text-[#E6C673] ' +
    'hover:bg-[#E6C673]/12 text-right touch-manipulation';

/** @deprecated — أُزيل زر الحالة الفارغة */
export const REPO_EMPTY_CTA =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-sm touch-manipulation ' +
    'bg-[#E6C673]/90 text-[#0A0F1C] border border-[#E6C673]/80 hover:bg-[#E6C673] active:scale-[0.98] transition-colors';

export const REPO_HEADER =
    'hami-repository-header relative px-4 py-2.5 shrink-0 z-[20] isolate';

export const REPO_BACK_BTN =
    'hami-repository-back-btn ' +
    `${REPO_TOUCH_ICON} relative z-[30] rounded-xl bg-[#0A0F1C]/96 border border-white/14 text-white/80 ` +
    'shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:text-[#E6C673] hover:border-[#E6C673]/35 hover:bg-[#0B1120] transition-colors';

export const REPO_BODY =
    'hami-repository-feed-scroll hami-repository-feed-surface h-0 flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-5 py-4 ' +
    '[-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]';

export const REPO_FEED_ITEM = 'hami-repository-feed-item';

export const REPO_INPUT =
    'w-full bg-[#0A0F1C]/55 border border-white/[0.12] rounded-xl px-4 py-3 text-[#F4F0E8] placeholder:text-white/30 outline-none ' +
    'backdrop-blur-md transition-all focus:border-[#E6C673]/45 focus:bg-[#0A0F1C]/75 focus:ring-1 focus:ring-[#E6C673]/18';

export const REPO_BTN_GOLD =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm transition-all touch-manipulation ' +
    'bg-[#E6C673]/90 border border-[#E6C673]/80 text-[#0A0F1C] hover:bg-[#E6C673] active:scale-[0.98] disabled:opacity-50';

/** سطح بطاقة موحّد — مستودع، دعاوى، تنفيذ */
export const REPO_SURFACE_BASE =
    'rounded-xl border border-white/[0.07] bg-[#0A0F1C]/42 backdrop-blur-sm ' +
    'shadow-[0_8px_24px_rgba(0,0,0,0.18)]';

/** بطاقة إنشاء المسودة — خفيفة ومضغوطة */
export const REPO_COMPOSE_SHELL =
    `hami-repo-compose ${REPO_SURFACE_BASE} p-3 mb-3 space-y-2.5`;

export const REPO_COMPOSE_META =
    'text-[10px] font-medium uppercase tracking-wide text-white/32';

export const REPO_COMPOSE_TITLE =
    'w-full bg-transparent border-0 border-b border-white/[0.08] rounded-none px-0 py-1.5 text-[15px] font-bold leading-snug text-[#F4F0E8] ' +
    'placeholder:text-white/28 outline-none focus:border-[#E6C673]/35 transition-colors';

export const REPO_COMPOSE_FOOTER =
    'flex flex-wrap items-center gap-2 pt-2 mt-0.5 border-t border-white/[0.06]';

export const REPO_COMPOSE_ICON_BTN = REPO_CARD_ICON_BTN;

export const REPO_COMPOSE_ICON_BTN_ACTIVE = REPO_CARD_ICON_BTN_ACTIVE;

export const REPO_COMPOSE_SAVE =
    'inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-xl text-xs font-bold touch-manipulation ' +
    'bg-[#E6C673] text-[#0A0F1C] hover:bg-[#E6C673]/92 active:scale-[0.98] disabled:opacity-50 transition-colors';

export const REPO_COMPOSE_CANCEL =
    'inline-flex items-center justify-center min-h-[40px] px-3 rounded-xl text-xs font-medium text-white/45 ' +
    'hover:text-white/70 touch-manipulation transition-colors';

export const REPO_COMPOSE_ATTACH_CHIP =
    'inline-flex items-center gap-1.5 max-w-[min(100%,11rem)] min-h-[32px] px-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[10px] text-white/55';

export const REPO_ICON_BTN = REPO_BACK_BTN;

export const REPO_FILTER_ROW =
    'hami-repository-filter-scroll flex gap-2 overflow-x-auto overscroll-x-contain touch-pan-x pb-1 px-5 pt-3 shrink-0 scrollbar-none items-center';

export const REPO_FILTER_CHIP =
    `${REPO_TOUCH_CHIP} gap-1.5 px-3.5 rounded-2xl text-xs font-bold border transition-[color,background-color,border-color] duration-100 ` +
    'border-white/10 bg-white/[0.04] text-white/55 backdrop-blur-sm hover:border-[#E6C673]/25 hover:text-white/75';

export const REPO_FILTER_CHIP_ACTIVE =
    `${REPO_TOUCH_CHIP} gap-1.5 px-3.5 rounded-2xl text-xs font-bold border transition-[color,background-color,border-color] duration-100 ` +
    'border-[#E6C673]/40 bg-[#E6C673]/16 text-[#E6C673] backdrop-blur-sm';

/** توافق رجعي — كانت رقائق التصنيف المنفصلة */
export const REPO_CUSTOM_CAT_ROW = REPO_FILTER_RAIL;
export const REPO_CUSTOM_CAT_CHIP = REPO_FILTER_CHIP;
export const REPO_CUSTOM_CAT_CHIP_ACTIVE = REPO_FILTER_CHIP_ACTIVE;
export const REPO_CUSTOM_CAT_ADD = REPO_FILTER_CHIP;

export const REPO_CARD = `hami-repo-card ${REPO_SURFACE_BASE} p-3`;

/** صف ملاحظة داخل مخزن الإضبارة */
export const REPO_NOTE_ROW =
    'hami-repo-note-row rounded-lg border border-white/[0.06] bg-white/[0.025] p-2.5';

export const REPO_CARD_META =
    'hami-repo-card-meta flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-2 min-h-[1.25rem]';

export const REPO_CARD_TIMESTAMP = 'text-[10px] font-medium text-white/35 tabular-nums';

export const REPO_CARD_TITLE = 'font-bold text-[13px] leading-snug text-[#F4F0E8] line-clamp-2';

export const REPO_CARD_NOTE = 'text-[12px] leading-relaxed text-white/50 line-clamp-3';

export const REPO_CARD_EDIT_LINK =
    'inline-flex items-center min-h-[40px] px-1 text-[11px] font-bold text-[#E6C673]/90 hover:text-[#E6C673] touch-manipulation transition-colors';

export const REPO_CARD_ACTIONS =
    'hami-repo-card-actions relative z-[2] flex flex-wrap items-center justify-between gap-1.5 pt-2 mt-2 border-t border-white/[0.06] pointer-events-auto';

export const REPO_CARD_HEADING = 'text-[11px] font-bold text-[#E6C673]/85 text-right';

export const REPO_BADGE_GOLD =
    'hami-repo-badge hami-repo-badge--gold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ' +
    'bg-[#E6C673]/12 border border-[#E6C673]/28 text-[#E6C673]';

export const REPO_BADGE_IMAGE =
    'hami-repo-badge hami-repo-badge--image inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ' +
    'bg-sky-400/10 border border-sky-400/25 text-sky-300/90';

export const REPO_BADGE_PDF =
    'hami-repo-badge hami-repo-badge--pdf inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ' +
    'bg-rose-400/10 border border-rose-400/25 text-rose-300/90';

export const REPO_BADGE_AUDIO =
    'hami-repo-badge hami-repo-badge--audio inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ' +
    'bg-violet-400/10 border border-violet-400/25 text-violet-300/90';

export const REPO_BADGE_FILE =
    'hami-repo-badge hami-repo-badge--file inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ' +
    'bg-zinc-400/10 border border-zinc-400/25 text-zinc-300/90';
