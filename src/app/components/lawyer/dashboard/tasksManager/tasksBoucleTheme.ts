/** مهام الميدان — كحلي بحري · ذهب دافئ · زمرد للنجاح */
export const TASKS_EMERALD = '#0D4A3C';
export const TASKS_EMERALD_LIGHT = '#1A7059';
export const TASKS_BRONZE = '#A67C52';
export const TASKS_GOLD = '#E6C673';
export const TASKS_NAVY = '#0A0F1C';
export const TASKS_IVORY = '#E8F5F0';

export const TASKS_PAGE =
    "relative flex flex-col w-full h-full min-h-[100dvh] font-['Tajawal','Cairo',sans-serif] " +
    'bg-gradient-to-b from-[#0A0F1C] via-[#0C1220] to-[#05060D]';

export const TASKS_HEADER =
    'shrink-0 px-4 py-3.5 flex items-center justify-between gap-2 ' +
    'border-b border-[#A67C52]/28 bg-[#0A0F1C]/94';

export const TASKS_BODY =
    'flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 pb-16 max-w-3xl mx-auto w-full space-y-6';

export const TASKS_GLASS_PANEL =
    'rounded-2xl border border-[#A67C52]/22 bg-[#0C1218]/78 ' +
    'shadow-[inset_0_1px_0_rgba(230,198,115,0.06)]';

export const TASKS_DAY_PANEL =
    'relative mb-4 p-4 rounded-2xl border border-[#A67C52]/22 bg-[#0C1218]/70 ' +
    'shadow-[inset_0_1px_0_rgba(230,198,115,0.06)]';

export const TASKS_INPUT =
    'w-full rounded-xl border border-[#A67C52]/28 bg-[#0A0F1C]/70 px-4 py-2.5 text-sm text-[#E8F5F0] ' +
    'placeholder:text-[#D4B896]/40 outline-none focus:border-[#E6C673]/45 focus:ring-1 focus:ring-[#E6C673]/15';

export const TASKS_BTN_PRIMARY =
    'text-xs font-extrabold px-4 py-2 min-h-[44px] rounded-xl border border-[#1A7059]/45 bg-[#1A7059]/25 text-[#E8F5F0] ' +
    'hover:bg-[#1A7059]/38 transition touch-manipulation';

export const TASKS_BTN_BRONZE =
    'hami-tasks-btn-bronze text-xs font-extrabold px-4 py-2 min-h-[44px] rounded-xl border border-[#A67C52]/40 bg-[#A67C52]/14 text-[#E6C673] ' +
    'hover:bg-[#A67C52]/22 transition touch-manipulation';

export const TASKS_BTN_GHOST =
    'text-xs font-bold px-3 py-2 min-h-[44px] rounded-lg border border-[#A67C52]/25 text-[#D4B896] hover:bg-[#0A0F1C]/55 touch-manipulation';

export const TASKS_SECTION_TITLE = 'text-lg font-extrabold text-[#E8F5F0] flex flex-row-reverse items-center gap-2';

export const TASKS_BRONZE_LINE = 'h-px bg-gradient-to-r from-transparent via-[#E6C673]/40 to-transparent';

/** ستارة الميدان السفلية — كحلي مع لمسة ذهب وزمرد خفيف */
export const CURTAIN_SHEET =
    "fixed bottom-0 left-0 right-0 z-[215] max-h-[min(88dvh,640px)] flex flex-col rounded-t-[24px] " +
    "border border-[#A67C52]/35 border-b-0 font-['Tajawal','Cairo',sans-serif] " +
    'bg-gradient-to-b from-[#12181F]/98 via-[#0C1220]/97 to-[#05060D]/98 ' +
    'shadow-[0_-16px_56px_rgba(0,0,0,0.55)] overflow-hidden';

export const CURTAIN_GLASS_INNER =
    'rounded-xl border border-[#A67C52]/16 bg-[#0C1218]/80';

export const CURTAIN_BACKDROP = 'fixed inset-0 z-[214] bg-[#05060D]/78 border-0 cursor-default';

export const CURTAIN_BTN_MANAGE =
    'w-full py-3.5 rounded-xl font-extrabold text-sm text-[#0A0F1C] ' +
    'bg-gradient-to-l from-[#E6C673] to-[#A67C52] border border-[#E6C673]/45 ' +
    'shadow-[0_4px_20px_rgba(230,198,115,0.22)] active:scale-[0.99] transition-transform';

/** بطاقة المهمة — زجاج كحلي مع إطار برونزي */
export const TASK_CARD_BASE =
    'relative border rounded-2xl flex flex-col overflow-hidden bg-[#0C1218]/82 ' +
    'shadow-[inset_0_1px_0_rgba(230,198,115,0.05)]';

export const TASK_CARD_DEFAULT = 'border-[#A67C52]/28 hover:border-[#E6C673]/40';

export const TASK_CARD_DONE =
    'border-[#1A7059]/45 bg-[#0C1220]/70 shadow-[0_8px_28px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(26,112,89,0.16)]';

export const TASK_CARD_FATAL =
    'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.16),inset_0_1px_0_rgba(255,255,255,0.05)]';

/** أزرار الأدوات — هدف لمس ≥ 44×44 */
export const TASK_TOOL_BTN =
    'inline-flex flex-row-reverse items-center justify-center gap-1 rounded-xl px-3 ' +
    'min-h-[44px] min-w-[44px] text-[10px] font-extrabold border transition touch-manipulation';

export const TASK_CARD_ICON_BTN =
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border touch-manipulation transition-all duration-200';

export const TASK_CARD_ICON_BTN_IDLE =
    'border-[#A67C52]/28 bg-[#0A0F1C]/55 text-[#E8F5F0]/85 hover:border-[#E6C673]/40 hover:bg-[#12181F]/80 hover:text-[#E6C673]';

export const TASK_CARD_ICON_BTN_ACTIVE =
    'border-[#E6C673]/50 bg-[#E6C673]/14 text-[#E6C673] shadow-[0_0_0_1px_rgba(230,198,115,0.2)]';

export const TASK_CARD_ICON_BTN_ROSE =
    'border-rose-500/50 bg-rose-500/18 text-rose-100 shadow-[0_0_0_1px_rgba(244,63,94,0.15)]';

export const TASK_CARD_ICON_BTN_AMBER =
    'border-amber-500/50 bg-amber-500/15 text-amber-100';

export const TASK_CARD_ICON_BTN_EMERALD =
    'border-[#1A7059]/50 bg-[#1A7059]/18 text-[#A8D4C4]';

/** زر إجراء نصّي بنفس لغة الأيقونات الدائرية */
export const TASK_CARD_PILL_BTN =
    'inline-flex flex-row-reverse items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full border ' +
    'text-[11px] font-extrabold touch-manipulation whitespace-nowrap transition active:scale-[0.98] ' +
    'border-[#A67C52]/28 bg-[#0A0F1C]/55 text-[#E8F5F0]/90 hover:border-[#E6C673]/40 hover:bg-[#12181F]/80';

export const TASK_CARD_PILL_BTN_EMERALD =
    'inline-flex flex-row-reverse items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full border ' +
    'text-[11px] font-extrabold touch-manipulation whitespace-nowrap transition active:scale-[0.98] ' +
    'border-[#1A7059]/45 bg-[#1A7059]/18 text-[#A8D4C4] hover:bg-[#1A7059]/28';

/** بطاقة ستارة الميدان — خفيفة ومضغوطة */
export const CURTAIN_TASK_CARD =
    'relative rounded-xl border overflow-hidden bg-[#0C1218]/70 text-right ' +
    'shadow-[0_4px_16px_rgba(0,0,0,0.22)]';
