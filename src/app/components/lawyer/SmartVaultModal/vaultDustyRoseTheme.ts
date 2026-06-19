/** المخزن الذكي — كتان كحلي · ترافرتين · نحاس مطفي */
export const VAULT_NAVY = '#0E1B2E';
export const VAULT_NAVY_MID = '#132238';
export const VAULT_TRAVERTINE = '#E6DED0';
export const VAULT_TRAVERTINE_MUTED = '#C9BCA8';
export const VAULT_COPPER = '#B87333';

export const VAULT_OVERLAY =
    'fixed inset-0 z-[99999] flex items-start justify-center bg-[#080f18]/92 backdrop-blur-md overflow-hidden isolate';

export const VAULT_PANEL =
    'w-full max-w-4xl h-[100dvh] max-h-[100dvh] mx-auto flex flex-col relative overflow-hidden ' +
    'shadow-[0_0_80px_rgba(14,27,46,0.45)] bg-[#0E1B2E] border-x border-[#B87333]/18';

export const VAULT_HEADER =
    'shrink-0 px-5 py-4 border-b border-[#B87333]/15 ' +
    'bg-gradient-to-l from-[#132238] via-[#0E1B2E] to-[#0a1524]';

export const VAULT_SECTION = 'shrink-0 px-5 py-3.5 border-b border-[#B87333]/10 bg-[#0E1B2E]/95';

export const VAULT_BODY =
    'flex-1 min-h-0 overflow-y-auto px-5 py-5 custom-scrollbar bg-[#0E1B2E]';

/** لوحة ترافرتين موحّدة — بحث + تصنيفات */
export const VAULT_TRAVERTINE_HUB =
    'rounded-2xl overflow-hidden border border-[#D9CFC0]/25 ' +
    'bg-gradient-to-br from-[#E6DED0]/14 via-[#D9CFC0]/8 to-[#CBC0AE]/6 ' +
    'shadow-[inset_0_1px_0_rgba(230,222,208,0.12),0_8px_32px_rgba(0,0,0,0.2)]';

export const VAULT_COPPER_DIVIDER = 'h-px mx-3 bg-gradient-to-r from-transparent via-[#B87333]/45 to-transparent';

export const VAULT_INPUT =
    'w-full bg-[#0E1B2E]/40 border border-[#B87333]/22 rounded-xl px-3 py-2.5 text-[#E8E4DC] text-sm ' +
    'placeholder:text-[#C9BCA8]/45 outline-none transition-all ' +
    'focus:border-[#B87333]/45 focus:ring-1 focus:ring-[#B87333]/12';

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
    'w-full sm:max-w-md bg-[#132238] border border-[#B87333]/22 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col';

export const VAULT_SHEET_OVERLAY =
    'absolute inset-0 z-[50] flex items-end sm:items-center justify-center bg-[#080f18]/88 backdrop-blur-sm';

export const VAULT_CARD =
    'rounded-2xl border border-[#D9CFC0]/18 bg-gradient-to-br from-[#E6DED0]/8 via-[#132238]/55 to-[#0E1B2E]/80 ' +
    'backdrop-blur-sm shadow-[0_12px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(230,222,208,0.06)]';

export const VAULT_CHIP_ACTIVE =
    'bg-[#0E1B2E]/55 border-[#B87333]/45 text-[#E8E4DC] shadow-[0_0_12px_rgba(184,115,51,0.12)]';

export const VAULT_CHIP_IDLE =
    'bg-[#E6DED0]/8 border-[#D9CFC0]/22 text-[#C9BCA8] hover:bg-[#E6DED0]/14 hover:border-[#B87333]/28';

export const VAULT_BTN_SAVE =
    'flex-1 py-2.5 rounded-xl bg-[#B87333]/20 border border-[#B87333]/40 text-[#E8E4DC] text-sm font-bold ' +
    'hover:bg-[#B87333]/30 disabled:opacity-50 flex items-center justify-center gap-2';

export const VAULT_BTN_CANCEL =
    'flex-1 py-2.5 rounded-xl bg-[#132238]/60 border border-[#D9CFC0]/15 text-[#C9BCA8] text-sm font-bold hover:bg-[#132238]/80 disabled:opacity-50';

/** @deprecated kept for imports */
export const VAULT_SEARCH_WRAP = VAULT_TRAVERTINE_HUB;
export const VAULT_BTN_ROSE = VAULT_ACTION_CELL;
export const VAULT_BTN_IVORY = VAULT_ACTION_CELL;
export const VAULT_BTN_GHOST = VAULT_ACTION_CELL;
