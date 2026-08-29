/** مخزن التنفيذ — سطح مسطّح كثيف. لا يُستخدم في أرشيف الدعاوى المدنية/الجنائية. */

export const EXECUTION_ARCHIVE_CARD_CLASS =
    'relative rounded-xl border border-white/[0.1] bg-[#0B1021] p-2 touch-manipulation';

/** حجز ارتفاع البطاقة أثناء Suspense — يطابق estimateRowSize تقريباً بلا نبض. */
export const EXECUTION_ARCHIVE_CARD_PAINT_SLOT_CLASS = `${EXECUTION_ARCHIVE_CARD_CLASS} min-h-[10rem]`;

export const EXECUTION_ARCHIVE_FAB =
    'inline-flex h-11 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.08] px-3 text-xs font-bold text-white touch-manipulation';

export const EXECUTION_FILTER_TAB_ACTIVE =
    'bg-white/[0.06] text-white border border-white/10';

export const EXECUTION_FILTER_CHIP_ACTIVE =
    'border border-white/12 bg-white/[0.06] text-white';

/** زر خامل للتنفيذ — بلا بلاطة slate الثقيلة المشتركة مع الدعاوى. */
export const EXECUTION_SEGMENT_BTN_INACTIVE =
    'bg-transparent border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200';

export const EXECUTION_CHIP_INACTIVE =
    'bg-transparent border border-white/[0.08] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200';

export const EXECUTION_SEGMENT_ARCHIVED_ACTIVE =
    'bg-amber-950/30 text-amber-100/95 border border-amber-500/20';

export const EXECUTION_SEGMENT_TRASH_ACTIVE =
    'bg-rose-950/35 text-rose-100/95 border border-rose-500/22';

/** صف شرائح فقط — بلا إطار/خلفية حول المجموعة (الخفة على الأزرار). */
export const EXECUTION_SEGMENT_SHELL =
    'flex items-center gap-1 overflow-x-auto scrollbar-hide';

/** زر شريحة التنفيذ — بلا transition-all المشترك مع الدعاوى */
export const EXECUTION_SEGMENT_BTN_BASE =
    'min-h-[44px] px-3 rounded-xl text-[11px] font-bold whitespace-nowrap touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/25';

export const EXECUTION_ARCHIVE_LIFECYCLE_ROW =
    'px-3 sm:px-4 py-1.5 border-b border-white/[0.06] bg-[#0B1021]';

/** رأس قشرة المخزن الفورية + توأم الغطاء — مضغوط بلا غلاف عنوان إضافي. */
export const EXECUTION_ARCHIVE_INSTANT_HEADER = 'shrink-0 border-b border-white/[0.06]';

export const EXECUTION_ARCHIVE_INSTANT_HEADER_ROW =
    'px-3 sm:px-4 hami-overlay-header-safe-pad pb-1 flex items-center justify-between gap-2';

export const EXECUTION_ARCHIVE_INSTANT_TITLE =
    'min-w-0 truncate text-right text-[13px] font-bold text-white';

export const EXECUTION_ARCHIVE_INSTANT_CLOSE_BTN =
    'inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-white/80 hover:text-white transition-colors touch-manipulation';

export const EXECUTION_ARCHIVE_SEARCH_DECK =
    'px-3 sm:px-4 py-1.5 border-b border-white/[0.06]';

export const EXECUTION_ARCHIVE_SEARCH_SHELL =
    'flex h-11 w-full items-stretch overflow-hidden rounded-xl border border-white/[0.06] bg-transparent';

export const EXECUTION_ARCHIVE_SEARCH_ICON_CLUSTER =
    'flex shrink-0 items-center gap-0.5 border-r border-white/[0.06] px-1';

export const EXECUTION_ARCHIVE_SEARCH_ICON_SLOT =
    'inline-flex h-11 min-h-[44px] min-w-[44px] items-center justify-center';

export const EXECUTION_ARCHIVE_SEARCH_GLYPH_SLOT =
    'flex h-9 w-9 items-center justify-center text-white/40 pointer-events-none';
