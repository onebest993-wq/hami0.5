/** أنماط موحّدة لشريط أدوات الأرشيف */

export const ARCHIVE_TOOLBAR_SECTION =
    'px-4 sm:px-5 py-2.5 border-b border-white/[0.06] bg-gradient-to-b from-[#0A0F1C]/72 to-[#0B1021]/28 backdrop-blur-xl';

export const ARCHIVE_TOOLBAR_LABEL = 'text-[10px] font-bold tracking-[0.02em] text-white/38 shrink-0';

export const ARCHIVE_FILTER_DECK =
    'rounded-2xl border border-white/[0.08] bg-[#0B1021]/45 p-2.5 space-y-2';

export const ARCHIVE_SEGMENT_SHELL =
    'flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-[#080C16]/88 p-1.5 overflow-x-auto scrollbar-hide shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_30px_rgba(0,0,0,0.16)]';

export const ARCHIVE_SEGMENT_BTN_BASE =
    'min-h-[44px] px-3.5 rounded-xl text-[11px] font-bold transition-all duration-200 whitespace-nowrap touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/25';

/** نشط — زجاج ملكي بدل أصفر مسطح */
export const ARCHIVE_SEGMENT_BTN_ACTIVE = 'hami-royal-glass-chip font-bold';

export const ARCHIVE_SEGMENT_BTN_INACTIVE =
    'bg-slate-900/80 border border-slate-800/90 text-slate-300 hover:bg-slate-800/80 hover:text-slate-100 backdrop-blur-sm';

/** شرائح فلترة سريعة — نشط زجاجي ملكي */
export const ARCHIVE_CHIP_ACTIVE = 'hami-royal-glass-chip font-bold';

export const ARCHIVE_CHIP_INACTIVE =
    'bg-slate-900/80 border border-slate-800/90 text-slate-300 hover:bg-slate-800/80 hover:text-slate-100 backdrop-blur-sm';

export const ARCHIVE_CHIP_BASE =
    'inline-flex items-center justify-center min-h-[36px] px-3.5 rounded-full text-[11px] font-semibold transition-all duration-200 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/35';

/**
 * توافق أسماء الزجاج الملكي — يُستخدم لأزرار العرض المضغوط / الشرائح الصغيرة.
 * الإبقاء على الاسم يمنع كسر HMR إن طلب مستهلك قديم التصدير.
 */
export const ARCHIVE_GLASS_ACTIVE = ARCHIVE_SEGMENT_BTN_ACTIVE;
export const ARCHIVE_GLASS_ACTIVE_COMPACT =
    'hami-royal-glass-chip inline-flex items-center justify-center font-bold';

/** أزرار إجراء ذهبية سابقاً — زجاج ملكي منقوش */
export const ARCHIVE_ROYAL_GLASS_BTN =
    'hami-royal-glass-btn inline-flex items-center justify-center gap-2 font-semibold touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40';

export const ARCHIVE_ROYAL_GLASS_FAB =
    'hami-royal-glass-btn group flex min-h-[3.5rem] items-center gap-2.5 rounded-full pl-5 pr-4 font-bold transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 touch-manipulation';

export const ARCHIVE_SEGMENT_BTN_CRIMINAL_ACTIVE = 'bg-red-600/90 text-white shadow-sm';

/** الحالة النشطة في سياق القضاء المستعجل — قرمزي عالي الوضوح بدل الذهبي */
export const ARCHIVE_SEGMENT_BTN_URGENT_ACTIVE =
    'bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-[0_6px_18px_rgba(225,29,72,0.24)]';

export const ARCHIVE_SEARCH_INPUT =
    'w-full min-h-[44px] pr-11 pl-3 rounded-xl bg-[#0B1021]/80 border border-white/10 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-[#E6C673]/45 focus:ring-1 focus:ring-[#E6C673]/15 transition-all';

/** نفس حقل البحث الموحّد لكن بتركيز قرمزي لسياق القضاء المستعجل */
export const ARCHIVE_SEARCH_INPUT_URGENT =
    'w-full min-h-[44px] pr-11 pl-3 rounded-xl bg-[#0B1021]/80 border border-white/10 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-red-400/50 focus:ring-1 focus:ring-red-400/15 transition-all';
