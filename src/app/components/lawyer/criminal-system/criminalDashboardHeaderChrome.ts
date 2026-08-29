/**
 * أصناف أزرار ترويسة الإضبارة الجزائية — مشتركة بين CriminalDashboardHeader
 * و CriminalDashboardHeaderToolbar (نفس القيم حرفياً؛ صفر تغيير بصري).
 */

/** شَريط القيادة السيادي العلوي — أَزرار مُوَحَّدة الارتفاع (h-10) والزوايا (rounded-xl). */
export const unifiedHeaderButtonBase =
    'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0 disabled:opacity-40 disabled:pointer-events-none';

/** زِرّ القرار الختامي — خَلفية ذَهَبية زُجاجية. */
export const finalDecisionButtonClass = `${unifiedHeaderButtonBase} bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/25 data-[state=open]:bg-[#d4af37]/25`;

/** أَزرار الإجراءات/الموقع — زُجاج رَمادي/أَبيض شَفاف مُوَحَّد. */
export const glassHeaderButtonClass = `${unifiedHeaderButtonBase} bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 data-[state=open]:bg-white/10 data-[state=open]:ring-1 data-[state=open]:ring-white/20`;

export const infoPillClass =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 whitespace-normal break-words print:border-slate-300 print:bg-white print:text-black';
