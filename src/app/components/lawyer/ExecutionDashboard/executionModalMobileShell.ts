/** فئات shell موحّدة للنوافذ الحرجة — Capacitor / safe-area / touch 44px */
export const EXEC_MODAL_CLOSE_BTN_CLASS =
    'touch-manipulation inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-transparent p-2 text-slate-300 transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white';

export const EXEC_MODAL_HEADER_SAFE_TOP = 'pt-[max(0.75rem,env(safe-area-inset-top))]';

export const EXEC_MODAL_SHELL_HEIGHT_CLASS =
    'h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)),920px)]';

export const EXEC_MODAL_BACKDROP_SAFE_PAD =
    'px-[max(0px,env(safe-area-inset-left))] py-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))]';

export const EXEC_MODAL_TRASH_SHELL_MAX =
    'max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]';
