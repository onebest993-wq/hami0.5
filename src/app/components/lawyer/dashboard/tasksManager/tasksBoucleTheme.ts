/**
 * مهام الميدان — لوحة Midnight Legal خفيفة
 * Navy #0A0F1C · ذهب #E6C673 · زمرد للنجاح
 */
export const TASKS_INK = '#0A0F1C';
export const TASKS_CHROME = TASKS_INK;

/** إخفاء شريط التمرير مع الإبقاء على التمرير */
export const TASKS_SCROLL_CHROME =
    '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/** سطح داخلي للبطاقات */
export const TASKS_INNER_GLASS = 'border-[#E6C673]/12 bg-white/[0.03]';

export const TASKS_INNER_GLASS_SOFT = 'bg-white/[0.025]';

export const TASKS_INNER_GLASS_HOVER = 'hover:bg-white/[0.05]';

/** خلفية شاشة المهام */
export const TASKS_PAGE =
    "relative flex flex-col w-full h-full min-h-[100dvh] overflow-x-hidden font-['Tajawal','Cairo',sans-serif] bg-[#0A0F1C]";

export const TASKS_HEADER =
    'shrink-0 px-4 py-3 flex items-center justify-between gap-2 ' +
    'border-b border-white/[0.06] bg-[#0A0F1C]';

export const TASKS_BODY =
    'flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y ' +
    'px-4 py-5 pb-16 max-w-3xl mx-auto w-full space-y-6 ' +
    TASKS_SCROLL_CHROME;

/** حاويات الأيام والأقسام */
export const TASKS_GLASS_PANEL =
    'rounded-2xl border border-white/[0.07] bg-white/[0.03]';

export const TASKS_DAY_PANEL =
    'relative mb-3 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.025]';

export const TASKS_INPUT =
    'w-full rounded-xl border border-white/[0.1] bg-[#12182B] px-4 py-2.5 text-base text-[#F4F4F5] min-h-[44px] ' +
    'placeholder:text-white/35 outline-none focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/14';

export const TASKS_LABEL = 'text-[11px] font-bold text-[#E6C673]/78 block mb-1';

export const TASKS_DIALOG_CONTENT =
    'border-white/[0.08] bg-[#0A0F1C] text-[#F4F4F5] sm:max-w-md rounded-2xl';

export const TASKS_DIALOG_CONTENT_WIDE =
    'border-white/[0.08] bg-[#0A0F1C] ' +
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
    'text-xs font-semibold px-4 py-2 min-h-[44px] rounded-xl border border-[#34D399]/30 bg-[#34D399]/10 text-[#A7F3D0] ' +
    'hover:bg-[#34D399]/16 transition touch-manipulation';

export const TASKS_BTN_BRONZE =
    'hami-tasks-btn-bronze text-xs font-semibold px-4 py-2 min-h-[44px] rounded-xl border border-[#E6C673]/22 bg-transparent text-[#E6C673] ' +
    'hover:bg-[#E6C673]/10 transition touch-manipulation';

export const TASKS_BTN_GHOST =
    'text-xs font-bold px-3 py-2 min-h-[44px] rounded-lg border border-white/[0.08] text-[#E6C673]/75 hover:bg-white/[0.04] touch-manipulation';

export const TASKS_SECTION_TITLE = 'text-base font-semibold text-[#F4F4F5] flex flex-row-reverse items-center gap-2';

export const TASKS_BRONZE_LINE = 'h-px bg-white/[0.08]';

/** ستارة الميدان السفلية */
export const CURTAIN_SHEET =
    "fixed bottom-0 left-0 right-0 z-[215] max-h-[min(88dvh,640px)] flex flex-col rounded-t-[24px] " +
    "border border-white/[0.08] border-b-0 font-['Tajawal','Cairo',sans-serif] " +
    'bg-[#0A0F1C] shadow-[0_-4px_16px_rgba(0,0,0,0.22)] overflow-hidden';

export const CURTAIN_GLASS_INNER =
    'rounded-2xl border border-white/[0.07] bg-white/[0.03]';

export const CURTAIN_BACKDROP = 'fixed inset-0 z-[214] bg-[#05060D]/72 border-0 cursor-default';

export const CURTAIN_BTN_MANAGE =
    'w-full min-h-[48px] py-3 rounded-2xl font-semibold text-sm text-[#E6C673] ' +
    'border border-[#E6C673]/28 bg-[#E6C673]/8 active:opacity-90 touch-manipulation';

/** عناصر رأس الستارة — مشتركة بين المكوّنات */
export const CURTAIN_HANDLE = 'w-10 h-0.5 rounded-full bg-white/28';
export const CURTAIN_HEADER_ROW =
    'shrink-0 flex items-center justify-between gap-3 px-4 pb-2.5 border-b border-white/[0.06] relative z-[1]';
export const CURTAIN_CLOSE_BTN =
    'shrink-0 w-11 h-11 rounded-xl border border-white/[0.08] bg-transparent flex items-center justify-center text-[#F4F4F5]/80 hover:bg-white/[0.05] touch-manipulation';
export const CURTAIN_FOOTER_ROW =
    'shrink-0 p-4 pt-2 border-t border-white/[0.06] bg-[#0A0F1C] relative z-[1]';

/** بطاقة المهمة */
export const TASK_CARD_BASE =
    'relative border rounded-2xl flex flex-col overflow-hidden bg-white/[0.03]';

export const TASK_CARD_DEFAULT = 'border-white/[0.09] hover:border-[#E6C673]/22';

export const TASK_CARD_DONE =
    'border-[#34D399]/28 bg-[#12182B]/92';

export const TASK_CARD_FATAL =
    'border-rose-500/45';

/** أزرار الأدوات — هدف لمس ≥ 44×44 */
export const TASK_TOOL_BTN =
    'inline-flex flex-row-reverse items-center justify-center gap-1 rounded-xl px-3 ' +
    'min-h-[44px] min-w-[44px] text-[10px] font-extrabold border transition touch-manipulation';

export const TASK_CARD_ICON_BTN =
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border touch-manipulation';

export const TASK_CARD_ICON_BTN_IDLE =
    'border-white/[0.1] bg-[#12182B]/88 text-[#F4F4F5]/88 hover:border-[#E6C673]/28 hover:bg-[#1A2238] hover:text-[#E6C673]';

export const TASK_CARD_ICON_BTN_ACTIVE =
    'border-[#34D399]/32 bg-[#059669]/14 text-[#34D399]';

/** بطاقة ستارة الميدان */
export const CURTAIN_TASK_TITLE = 'text-[#F4F4F5] text-[15px] font-semibold leading-snug break-words';
export const CURTAIN_LOCATION_TEXT =
    'mt-1 text-[11px] font-medium text-white/55 flex flex-row-reverse items-center gap-1 justify-end';
export const CURTAIN_COMPLETE_BTN =
    'min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl border border-[#34D399]/35 bg-[#34D399]/10 text-[#A7F3D0] text-[12px] font-semibold whitespace-nowrap touch-manipulation';
export const CURTAIN_DONE_BADGE =
    'bg-[#34D399]/12 border-[#34D399]/28 text-[#A7F3D0]';
export const CURTAIN_DONE_BADGE_READONLY =
    'bg-transparent border-white/[0.08] text-white/45';
export const CURTAIN_PIN_BADGE =
    'inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#E6C673]/10 text-[#E6C673]/80';

export const CURTAIN_FATAL_DIALOG =
    'border-[#E6C673]/22 bg-[#12182B] text-[#F4F4F5] sm:max-w-md [&]:translate-x-[-50%] [&]:translate-y-[-50%]';
