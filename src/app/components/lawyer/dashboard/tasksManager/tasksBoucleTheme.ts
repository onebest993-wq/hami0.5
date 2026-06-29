/** مهام الميدان — بوكلé زمردي · زجاج مدخّن · برونز */
export const TASKS_EMERALD = '#0D4A3C';
export const TASKS_EMERALD_LIGHT = '#1A7059';
export const TASKS_BRONZE = '#A67C52';
export const TASKS_IVORY = '#E8F5F0';

export const TASKS_PAGE =
    "relative flex flex-col w-full h-full min-h-[100dvh] font-['Tajawal','Cairo',sans-serif] " +
    'bg-gradient-to-b from-[#061612] via-[#0A2E25] to-[#051410]';

export const TASKS_HEADER =
    'shrink-0 px-5 py-4 flex items-center justify-between gap-3 ' +
    'border-b border-[#A67C52]/20 bg-[#0c0c0e]/88';

export const TASKS_BODY =
    'flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 pb-16 max-w-3xl mx-auto w-full space-y-8';

export const TASKS_GLASS_PANEL =
    'rounded-2xl border border-white/[0.07] bg-[#0c0c0e]/72 ' +
    'shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]';

export const TASKS_DAY_PANEL =
    `${TASKS_GLASS_PANEL} relative p-5 mb-2 border-[#A67C52]/15 hover:border-[#A67C52]/28`;

export const TASKS_INPUT =
    'w-full rounded-xl border border-[#A67C52]/22 bg-[#0c0c0e]/45 px-4 py-2.5 text-sm text-[#E8F5F0] ' +
    'placeholder:text-[#1A7059]/50 outline-none focus:border-[#A67C52]/45 focus:ring-1 focus:ring-[#A67C52]/12';

export const TASKS_BTN_PRIMARY =
    'text-xs font-extrabold px-4 py-2 rounded-xl border border-[#1A7059]/45 bg-[#1A7059]/25 text-[#E8F5F0] ' +
    'hover:bg-[#1A7059]/38 transition';

export const TASKS_BTN_BRONZE =
    'text-xs font-extrabold px-4 py-2 rounded-xl border border-[#A67C52]/35 bg-[#A67C52]/12 text-[#D4B896] ' +
    'hover:bg-[#A67C52]/20 transition';

export const TASKS_BTN_GHOST =
    'text-xs font-bold px-3 py-2 rounded-lg border border-[#A67C52]/20 text-[#A67C52]/80 hover:bg-[#0c0c0e]/40';

export const TASKS_SECTION_TITLE = 'text-lg font-extrabold text-[#E8F5F0] flex flex-row-reverse items-center gap-2';

export const TASKS_BRONZE_LINE = 'h-px bg-gradient-to-r from-transparent via-[#A67C52]/35 to-transparent';

/** ستارة الميدان السفلية */
export const CURTAIN_SHEET =
    "fixed bottom-0 left-0 right-0 z-[215] max-h-[min(88dvh,640px)] flex flex-col rounded-t-[24px] " +
    "border border-[#A67C52]/28 border-b-0 font-['Tajawal','Cairo',sans-serif] " +
    'bg-gradient-to-b from-[#0D4A3C]/98 via-[#0A2E25]/96 to-[#061612]/98 ' +
    'shadow-[0_-16px_56px_rgba(0,0,0,0.5)] overflow-hidden';

export const CURTAIN_GLASS_INNER =
    'rounded-xl border border-white/[0.08] bg-[#0c0c0e]/72';

export const CURTAIN_BACKDROP = 'fixed inset-0 z-[214] bg-[#051410]/75 border-0 cursor-default';

export const CURTAIN_BTN_MANAGE =
    'w-full py-3.5 rounded-xl font-extrabold text-sm text-[#061612] ' +
    'bg-gradient-to-l from-[#B8956A] to-[#A67C52] border border-[#A67C52]/50 ' +
    'shadow-[0_4px_20px_rgba(166,124,82,0.2)] active:scale-[0.99] transition-transform';

export const TASK_CARD_BASE =
    'relative border rounded-xl flex flex-col overflow-hidden bg-[#0c0c0e]/72';

export const TASK_CARD_DEFAULT = 'border-[#A67C52]/18 hover:border-[#A67C52]/32';

export const TASK_CARD_DONE = 'border-[#1A7059]/35 bg-[#0c0c0e]/55';

export const TASK_CARD_FATAL = 'border-rose-500/55 shadow-[0_0_24px_rgba(244,63,94,0.22)]';

export const TASK_TOOL_BTN =
    'flex flex-row-reverse items-center justify-center gap-1 rounded-lg px-3 py-2 min-h-[44px] text-[10px] font-extrabold border transition touch-manipulation';
