/** Shared fog-glass surface tokens for LawyerNewCase flow */

export const NC_FIELD =
    'w-full rounded-xl border border-white/[0.1] bg-white/[0.05] backdrop-blur-sm px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#E6C673]/55 focus:ring-1 focus:ring-[#E6C673]/20';

export const NC_FIELD_ERROR = 'border-amber-500/60 ring-1 ring-amber-500/20';

export const NC_LABEL = 'text-[10px] text-white/55 mb-1.5 block';

export const NC_SECTION = 'border-b border-white/[0.06] bg-white/[0.028] backdrop-blur-md p-5';

export const NC_SECTION_TITLE = 'text-xs font-bold text-[#E6C673]/88 tracking-wide mb-4';

export const NC_GLASS_CARD =
    'rounded-2xl border border-white/[0.08] bg-white/[0.035] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] ring-1 ring-inset ring-white/[0.04]';

export const NC_HEADER =
    'h-14 shrink-0 z-50 flex items-center justify-between px-4 border-b border-white/[0.08] bg-white/[0.04] backdrop-blur-xl';

export const NC_TAB_BAR =
    'sticky top-0 z-40 border-b border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';

export const NC_TAB_ACTIVE =
    'flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white/95 bg-white/[0.08] border border-white/[0.12] backdrop-blur-sm';

export const NC_FOOTER =
    'shrink-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/[0.08] bg-[#080c14]/75 backdrop-blur-xl';

export function ncFieldClass(hasError?: boolean): string {
    return `${NC_FIELD} ${hasError ? NC_FIELD_ERROR : ''}`;
}
