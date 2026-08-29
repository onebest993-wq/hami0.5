/** Shared fog-glass surface tokens for LawyerNewCase flow */

export const NC_FIELD =
    'w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#E6C673]/45 focus:ring-1 focus:ring-[#E6C673]/15';

const NC_FIELD_ERROR = 'border-amber-500/60 ring-1 ring-amber-500/20';

export const NC_LABEL = 'text-[10px] text-white/52 mb-1.5 block';

export const NC_SECTION = 'border-b border-white/[0.06] bg-white/[0.02] p-4';

export const NC_SECTION_TITLE = 'text-xs font-semibold text-[#E6C673]/88 tracking-wide mb-2.5';

export const NC_GLASS_CARD =
    'rounded-2xl border border-[#E6C673]/14 bg-[#0C1220]/88 shadow-[0_8px_24px_rgba(0,0,0,0.2),0_1px_0_rgba(255,255,255,0.04)_inset]';

export const NC_HEADER =
    'hami-overlay-header-safe-pad shrink-0 z-50 flex items-center justify-between px-4 pb-2 border-b border-white/[0.07] bg-[#0A0F1C]/88 backdrop-blur-sm';

export const NC_FOOTER =
    'shrink-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/[0.07] bg-[#080c14]/88 backdrop-blur-sm';

export function ncFieldClass(hasError?: boolean): string {
    return `${NC_FIELD} ${hasError ? NC_FIELD_ERROR : ''}`;
}
