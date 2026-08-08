/**
 * مهام الميدان — لوحة «Midnight Legal»
 * Navy عميق (هوية Hami) · ذهب #E6C673 · زمرد عصري للنجاح
 */
export const TASKS_INK = '#0A0F1C';
export const TASKS_NAVY_DEEP = '#0A0F1C';
export const TASKS_NAVY_MID = '#0F1629';
export const TASKS_NAVY_SURFACE = '#151B2E';
export const TASKS_NAVY_ELEVATED = '#1A2238';
export const TASKS_NAVY_INSET = '#12182B';

export const TASKS_GOLD = '#E6C673';
export const TASKS_GOLD_SOFT = '#C9A85C';
export const TASKS_EMERALD = '#34D399';
export const TASKS_EMERALD_DARK = '#10B981';
export const TASKS_EMERALD_DEEP = '#059669';

/** توافق مع الاستيرادات القديمة */
export const TASKS_EMERALD_LIGHT = TASKS_EMERALD_DARK;
export const TASKS_TEAL_MINT = TASKS_EMERALD;
export const TASKS_BRONZE = TASKS_GOLD_SOFT;
export const TASKS_NAVY = TASKS_INK;
export const TASKS_IVORY = '#F4F4F5';
export const TASKS_WARM_SURFACE = TASKS_NAVY_SURFACE;
export const TASKS_WARM_SURFACE_SOFT = TASKS_NAVY_ELEVATED;
export const TASKS_DAY_SURFACE = TASKS_NAVY_SURFACE;
export const TASKS_CHROME = TASKS_NAVY_MID;

/** إخفاء شريط التمرير مع الإبقاء على التمرير */
export const TASKS_SCROLL_CHROME =
    '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/** سطح داخلي للبطاقات — زجاج navy خفيف مع لمسة ذهب */
export const TASKS_INNER_GLASS = 'border-[#E6C673]/14 bg-white/[0.04]';

export const TASKS_INNER_GLASS_SOFT = 'bg-white/[0.03]';

export const TASKS_INNER_GLASS_HOVER = 'hover:bg-white/[0.06]';

/** خلفية شاشة المهام */
export const TASKS_PAGE =
    "relative flex flex-col w-full h-full min-h-[100dvh] overflow-x-hidden font-['Tajawal','Cairo',sans-serif] " +
    'bg-[#0A0F1C] bg-gradient-to-b from-[#0F1629] via-[#0A0F1C] to-[#05060D]';

export const TASKS_HEADER =
    'shrink-0 px-4 py-3.5 flex items-center justify-between gap-2 ' +
    'border-b border-[#E6C673]/12 bg-[#12182B]';

export const TASKS_BODY =
    'flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain ' +
    'px-4 py-5 pb-16 max-w-3xl mx-auto w-full space-y-6 ' +
    TASKS_SCROLL_CHROME;

/** حاويات الأيام والأقسام */
export const TASKS_GLASS_PANEL =
    'rounded-2xl border border-white/[0.08] bg-[#151B2E] ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]';

export const TASKS_DAY_PANEL =
    'relative mb-4 p-4 rounded-2xl border border-white/[0.07] bg-[#151B2E] ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';

export const TASKS_INPUT =
    'w-full rounded-xl border border-white/[0.1] bg-[#12182B] px-4 py-2.5 text-sm text-[#F4F4F5] ' +
    'placeholder:text-white/35 outline-none focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/14';

export const TASKS_LABEL = 'text-[11px] font-bold text-[#E6C673]/78 block mb-1';

export const TASKS_DIALOG_CONTENT =
    'border-white/[0.08] bg-gradient-to-b from-[#1A2238] via-[#151B2E] to-[#0A0F1C] ' +
    'text-[#F4F4F5] sm:max-w-md rounded-2xl';

export const TASKS_DIALOG_CONTENT_WIDE =
    'border-white/[0.08] bg-gradient-to-b from-[#1A2238] via-[#151B2E] to-[#0A0F1C] ' +
    `text-[#F4F4F5] sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl ${TASKS_SCROLL_CHROME}`;

export const TASKS_DIALOG_FOOTER =
    'flex flex-row-reverse gap-2 sm:justify-start sticky bottom-0 bg-[#12182B] pt-2 border-t border-white/[0.08]';

export const TASKS_DIALOG_SUBPANEL =
    'rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5 space-y-2';

export const TASKS_DIALOG_MUTED = 'text-[11px] font-bold text-white/45';

export const TASKS_DIALOG_DESC = 'text-[#F4F4F5]/82 text-sm leading-relaxed';

export const TASKS_DIALOG_BTN_CANCEL =
    'min-h-[44px] px-4 py-2 rounded-xl border border-white/[0.1] bg-[#12182B] text-[#F4F4F5]/88 text-xs font-bold touch-manipulation';

export const TASKS_BTN_PRIMARY =
    'text-xs font-extrabold px-4 py-2 min-h-[44px] rounded-xl border border-[#34D399]/35 bg-[#059669]/22 text-[#F4F4F5] ' +
    'hover:bg-[#059669]/32 transition touch-manipulation';

export const TASKS_BTN_BRONZE =
    'hami-tasks-btn-bronze text-xs font-extrabold px-4 py-2 min-h-[44px] rounded-xl border border-[#E6C673]/32 bg-[#E6C673]/10 text-[#E6C673] ' +
    'hover:bg-[#E6C673]/16 transition touch-manipulation';

export const TASKS_BTN_GHOST =
    'text-xs font-bold px-3 py-2 min-h-[44px] rounded-lg border border-white/[0.08] text-[#E6C673]/75 hover:bg-white/[0.04] touch-manipulation';

export const TASKS_SECTION_TITLE = 'text-lg font-extrabold text-[#F4F4F5] flex flex-row-reverse items-center gap-2';

export const TASKS_BRONZE_LINE = 'h-px bg-gradient-to-r from-transparent via-[#E6C673]/28 to-transparent';

/** ستارة الميدان السفلية */
export const CURTAIN_SHEET =
    "fixed bottom-0 left-0 right-0 z-[215] max-h-[min(88dvh,640px)] flex flex-col rounded-t-[24px] " +
    "border border-[#E6C673]/14 border-b-0 font-['Tajawal','Cairo',sans-serif] " +
    'bg-gradient-to-b from-[#12182B] via-[#0A0F1C] to-[#05060D] ' +
    'shadow-[0_-16px_56px_rgba(0,0,0,0.5)] overflow-hidden';

export const CURTAIN_GLASS_INNER =
    'rounded-xl border border-white/[0.08] bg-[#151B2E]';

export const CURTAIN_BACKDROP = 'fixed inset-0 z-[214] bg-[#05060D]/82 border-0 cursor-default';

export const CURTAIN_BTN_MANAGE =
    'w-full py-3.5 rounded-xl font-extrabold text-sm text-[#0A0F1C] ' +
    'bg-gradient-to-l from-[#E6C673] to-[#C9A85C] border border-[#E6C673]/50 ' +
    'shadow-[0_4px_20px_rgba(230,198,115,0.22)] active:scale-[0.99] transition-transform';

/** عناصر رأس الستارة — مشتركة بين المكوّنات */
export const CURTAIN_HANDLE = 'w-12 h-1 rounded-full bg-[#E6C673]/35';
export const CURTAIN_HEADER_ROW =
    'shrink-0 flex items-center justify-between gap-3 px-4 pb-3 border-b border-[#E6C673]/12 relative z-[1]';
export const CURTAIN_ICON_WELL =
    'w-9 h-9 rounded-xl bg-[#12182B] border border-[#E6C673]/18 flex items-center justify-center shrink-0';
export const CURTAIN_CLOSE_BTN =
    'shrink-0 w-11 h-11 rounded-xl border border-white/[0.08] bg-[#12182B] flex items-center justify-center text-[#F4F4F5]/80 hover:bg-[#1A2238] touch-manipulation';
export const CURTAIN_FOOTER_ROW =
    'shrink-0 p-4 pt-2 border-t border-[#E6C673]/10 bg-[#0A0F1C]/55 relative z-[1]';

/** بطاقة المهمة */
export const TASK_CARD_BASE =
    'relative border rounded-2xl flex flex-col overflow-hidden bg-[#151B2E] ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]';

export const TASK_CARD_DEFAULT = 'border-white/[0.09] hover:border-[#E6C673]/22';

export const TASK_CARD_DONE =
    'border-[#34D399]/35 bg-[#12182B]/92 shadow-[0_8px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(52,211,153,0.1)]';

export const TASK_CARD_FATAL =
    'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.16),inset_0_1px_0_rgba(255,255,255,0.05)]';

/** أزرار الأدوات — هدف لمس ≥ 44×44 */
export const TASK_TOOL_BTN =
    'inline-flex flex-row-reverse items-center justify-center gap-1 rounded-xl px-3 ' +
    'min-h-[44px] min-w-[44px] text-[10px] font-extrabold border transition touch-manipulation';

export const TASK_CARD_ICON_BTN =
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border touch-manipulation transition-all duration-200';

export const TASK_CARD_ICON_BTN_IDLE =
    'border-white/[0.1] bg-[#12182B]/88 text-[#F4F4F5]/88 hover:border-[#E6C673]/28 hover:bg-[#1A2238] hover:text-[#E6C673]';

export const TASK_CARD_ICON_BTN_ACTIVE =
    'border-[#34D399]/38 bg-[#059669]/16 text-[#34D399] shadow-[0_0_0_1px_rgba(52,211,153,0.16)]';

export const TASK_CARD_ICON_BTN_ROSE =
    'border-rose-500/50 bg-rose-500/18 text-rose-100 shadow-[0_0_0_1px_rgba(244,63,94,0.15)]';

export const TASK_CARD_ICON_BTN_AMBER =
    'border-amber-500/50 bg-amber-500/15 text-amber-100';

export const TASK_CARD_ICON_BTN_EMERALD =
    'border-[#10B981]/45 bg-[#059669]/18 text-[#6EE7B7]';

/** زر إجراء نصّي */
export const TASK_CARD_PILL_BTN =
    'inline-flex flex-row-reverse items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full border ' +
    'text-[11px] font-extrabold touch-manipulation whitespace-nowrap transition active:scale-[0.98] ' +
    'border-white/[0.09] bg-[#12182B]/82 text-[#F4F4F5]/92 hover:border-[#E6C673]/24 hover:bg-[#1A2238]';

export const TASK_CARD_PILL_BTN_EMERALD =
    'inline-flex flex-row-reverse items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full border ' +
    'text-[11px] font-extrabold touch-manipulation whitespace-nowrap transition active:scale-[0.98] ' +
    'border-[#10B981]/38 bg-[#059669]/18 text-[#6EE7B7] hover:bg-[#059669]/28';

/** بطاقة ستارة الميدان */
export const CURTAIN_TASK_CARD =
    'relative rounded-xl border overflow-hidden bg-[#151B2E] text-right ' +
    'shadow-[0_4px_16px_rgba(0,0,0,0.22)]';

/** نصوص وأزرار شائعة في الستارة */
export const CURTAIN_TASK_TITLE = 'text-[#F4F4F5] text-base font-extrabold leading-snug break-words';
export const CURTAIN_LOCATION_TEXT =
    'mt-1 text-[11px] font-bold text-[#34D399]/88 flex flex-row-reverse items-center gap-1 justify-end';
export const CURTAIN_COMPLETE_BTN =
    'min-h-[44px] px-2.5 py-1 rounded-lg bg-[#059669]/75 hover:bg-[#059669] border border-[#10B981]/45 text-[#F4F4F5] text-[10px] font-extrabold whitespace-nowrap touch-manipulation';
export const CURTAIN_DONE_BADGE =
    'bg-[#059669]/22 border-[#10B981]/38 text-[#F4F4F5]';
export const CURTAIN_DONE_BADGE_READONLY =
    'bg-[#12182B]/55 border-white/[0.08] text-white/45';
export const CURTAIN_PIN_BADGE =
    'inline-flex items-center gap-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#E6C673]/12 text-[#E6C673]/88 border border-[#E6C673]/28';

export const CURTAIN_FATAL_DIALOG =
    'border-[#E6C673]/22 bg-[#12182B] text-[#F4F4F5] sm:max-w-md [&]:translate-x-[-50%] [&]:translate-y-[-50%]';
