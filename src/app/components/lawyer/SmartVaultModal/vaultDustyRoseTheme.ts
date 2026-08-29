/** المخزن الذكي — كتان كحلي · ترافرتين · نحاس مطفي */
export const VAULT_NAVY = '#0E1B2E';
export const VAULT_NAVY_MID = '#132238';
export const VAULT_TRAVERTINE = '#E6DED0';
export const VAULT_TRAVERTINE_MUTED = '#C9BCA8';
export const VAULT_COPPER = '#B87333';

export const VAULT_OVERLAY =
    'hami-vault-overlay fixed inset-0 z-[99999] flex items-start justify-center bg-[#080f18] overflow-hidden isolate';

export const VAULT_PANEL =
    'hami-vault-panel w-full max-w-4xl h-[100dvh] max-h-[100dvh] mx-auto flex flex-col relative overflow-hidden ' +
    'shadow-[0_0_80px_rgba(14,27,46,0.45)] bg-[#0E1B2E] border-x border-[#B87333]/18';

export const VAULT_HEADER =
    'shrink-0 px-5 py-4 border-b border-[#B87333]/15 ' +
    'bg-gradient-to-l from-[#132238] via-[#0E1B2E] to-[#0a1524]';

export const VAULT_SECTION = 'shrink-0 px-5 py-3.5 border-b border-[#B87333]/10 bg-[#0E1B2E]';

export const VAULT_BODY =
    'hami-vault-body flex-1 min-h-0 overflow-y-auto px-5 py-5 custom-scrollbar bg-[#0E1B2E]';

export const VAULT_COPPER_DIVIDER = 'h-px mx-3 bg-gradient-to-r from-transparent via-[#B87333]/45 to-transparent';

export const VAULT_INPUT =
    'w-full bg-white/[0.05] border-0 rounded-2xl px-3 py-2.5 text-[#F4F4F5] text-base ' +
    'placeholder:text-white/35 outline-none transition-colors ' +
    'focus:ring-1 focus:ring-[#E6C673]/30';

export const VAULT_LABEL = 'text-[#C9BCA8] text-xs font-bold mb-1.5 block';

export const VAULT_ACTION_STRIP =
    'rounded-2xl overflow-hidden border border-[#D9CFC0]/20 ' +
    'bg-gradient-to-b from-[#E6DED0]/10 to-[#132238]/40 ' +
    'shadow-[inset_0_1px_0_rgba(230,222,208,0.08)]';

export const VAULT_ACTION_CELL =
    'flex flex-col items-center justify-center gap-1 py-3.5 px-2 text-center transition-all active:scale-[0.98] disabled:opacity-50';

export const VAULT_BTN_VIEW =
    'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl ' +
    'bg-[#132238]/80 border border-[#B87333]/28 text-[#C4926A] text-[11px] font-bold hover:border-[#B87333]/45 transition-colors';

export const VAULT_SHEET =
    'w-full sm:max-w-md bg-[#0A0F1C] border-0 rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col';

export const VAULT_SHEET_OVERLAY =
    'absolute inset-0 z-[50] flex items-end sm:items-center justify-center bg-[#0A0F1C]/70';

export const VAULT_SHEET_OVERLAY_VIEWPORT =
    'fixed inset-0 z-[140] flex items-end sm:items-center justify-center bg-[#0A0F1C]/80 overscroll-contain pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]';

export const VAULT_CARD =
    'rounded-2xl border border-[#D9CFC0]/18 bg-gradient-to-br from-[#1a2840] via-[#132238] to-[#0E1B2E] ' +
    'shadow-[0_12px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(230,222,208,0.06)]';

export const VAULT_BTN_SAVE =
    'flex-1 min-h-[44px] py-2.5 rounded-xl bg-[#E6C673] border-0 text-[#0A0F1C] text-sm font-medium ' +
    'hover:bg-[#edd49a] disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation';

export const VAULT_BTN_CANCEL =
    'flex-1 min-h-[44px] py-2.5 rounded-xl bg-white/[0.05] border-0 text-white/55 text-sm font-medium hover:bg-white/[0.08] disabled:opacity-50 touch-manipulation';

/** @deprecated kept for imports */
export const VAULT_BTN_ROSE = VAULT_ACTION_CELL;
export const VAULT_BTN_IVORY = VAULT_ACTION_CELL;
export const VAULT_BTN_GHOST = VAULT_ACTION_CELL;
