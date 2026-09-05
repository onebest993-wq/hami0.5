/** فئات shell موحّدة للنوافذ الحرجة — Capacitor / safe-area / touch 44px */
import type { CSSProperties } from 'react';

export const EXEC_MODAL_CLOSE_BTN_CLASS =
    'touch-manipulation inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-transparent p-2 text-slate-300 transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white';

export const EXEC_MODAL_HEADER_SAFE_TOP = 'pt-[max(0.75rem,env(safe-area-inset-top))]';

export const EXEC_MODAL_SHELL_HEIGHT_CLASS =
    'h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)),920px)]';

export const EXEC_MODAL_BACKDROP_SAFE_PAD =
    'px-[max(0px,env(safe-area-inset-left))] py-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))]';

export const EXEC_MODAL_TRASH_SHELL_MAX =
    'max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]';

export const EXEC_MODAL_NOTES_SHELL_MAX =
    'max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]';

export const EXEC_MODAL_COERCIVE_SHELL_MAX =
    'max-h-[min(80dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]';

/** نوافذ تعديل الطرف / بيانات الإضبارة */
export const EXEC_MODAL_EDIT_SHELL_MAX =
    'max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]';

export const EXEC_MODAL_EDIT_PANEL_CLASS =
    `w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-slate-600/40 bg-[#0A0F1C] p-4 shadow-md ${EXEC_MODAL_EDIT_SHELL_MAX}`;

export const EXEC_MODAL_EDIT_PRIMARY_BTN_CLASS =
    'touch-manipulation min-h-[44px] w-full rounded-lg py-2.5 text-sm font-bold';

/** يُلحق بأزرار الصف الداخلية (حفظ/إلغاء/إصدار) — هدف لمس 44px دون تغيير الألوان */
export const EXEC_MODAL_TOUCH_TARGET = 'touch-manipulation min-h-[44px] min-w-[44px]';

/** خلفية ورقة الهاتف — ملء الشاشة، وعلى الشاشات الأوسع بطاقة خفيفة */
export const EXEC_OVERLAY_PHONE_BACKDROP =
    `fixed inset-0 flex flex-col sm:items-center sm:justify-center bg-[#05060D] sm:bg-black/70 p-0 sm:p-3 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`;

const EXEC_OVERLAY_SHEET_CORE =
    'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#0A0F1C] sm:mx-auto sm:h-auto sm:max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] sm:w-full sm:flex-none sm:rounded-2xl sm:border sm:border-white/10';

export const EXEC_OVERLAY_PHONE_SHEET = `${EXEC_OVERLAY_SHEET_CORE} sm:max-w-lg`;

export const EXEC_OVERLAY_PHONE_SHEET_WIDE = `${EXEC_OVERLAY_SHEET_CORE} sm:max-w-2xl`;

export const EXEC_OVERLAY_PHONE_SHEET_XL = `${EXEC_OVERLAY_SHEET_CORE} sm:max-w-5xl`;

export const EXEC_OVERLAY_NESTED_BACKDROP =
    `fixed inset-0 z-[120] flex flex-col sm:items-center sm:justify-center bg-[#05060D] sm:bg-black/70 p-0 sm:p-3 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`;

export const EXEC_OVERLAY_HEADER =
    'flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4';

export const EXEC_OVERLAY_TITLE = 'min-w-0 truncate text-sm font-bold text-slate-100';

export const EXEC_OVERLAY_PRIMARY_BTN =
    'flex min-h-[44px] items-center justify-center rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/12 px-4 py-2.5 text-[13px] font-bold text-[#E6C673] transition-colors hover:bg-[#E6C673]/18 touch-manipulation';

export const EXEC_OVERLAY_FIELD =
    'w-full min-h-[44px] rounded-xl border border-white/[0.08] bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/12 touch-manipulation';

export const EXEC_OVERLAY_SEG_ACTIVE =
    'border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673]';

export const EXEC_OVERLAY_SEG_IDLE =
    'border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200';

/** حشوة سفلية عند ظهور لوحة المفاتيح (visualViewport) فوق safe-area */
export function execModalKeyboardPadStyle(keyboardInsetPx: number): CSSProperties | undefined {
    if (!(keyboardInsetPx > 0)) return undefined;
    return {
        paddingBottom: `max(${Math.ceil(keyboardInsetPx)}px, env(safe-area-inset-bottom, 0px))`,
    };
}
