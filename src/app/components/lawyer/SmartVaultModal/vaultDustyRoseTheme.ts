/** ألواح المخزن داخل المستودع — كحلي مسطّح، بلا ترافرتين/تدرج نحاسي ميت */
export const VAULT_INPUT =
    'w-full bg-white/[0.05] border-0 rounded-xl px-3 py-2.5 text-[#F4F4F5] text-base ' +
    'placeholder:text-white/35 outline-none transition-colors ' +
    'focus:ring-1 focus:ring-[#E6C673]/30';

export const VAULT_LABEL = 'text-white/45 text-xs font-medium mb-1.5 block';

export const VAULT_SHEET =
    'w-full sm:max-w-md bg-[#0A0F1C] border-0 rounded-t-xl sm:rounded-xl overflow-hidden max-h-[92vh] flex flex-col';

export const VAULT_SHEET_OVERLAY =
    'absolute inset-0 z-[50] flex items-end sm:items-center justify-center bg-[#0A0F1C]/70';

export const VAULT_SHEET_OVERLAY_VIEWPORT =
    'fixed inset-0 z-[140] flex items-end sm:items-center justify-center bg-[#0A0F1C]/80 overscroll-contain pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]';

export const VAULT_BTN_SAVE =
    'flex-1 min-h-[44px] py-2.5 rounded-xl bg-[#E6C673] border-0 text-[#0A0F1C] text-sm font-medium ' +
    'hover:bg-[#edd49a] disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation';

export const VAULT_BTN_CANCEL =
    'flex-1 min-h-[44px] py-2.5 rounded-xl bg-white/[0.05] border-0 text-white/55 text-sm font-medium hover:bg-white/[0.08] disabled:opacity-50 touch-manipulation';
