export const SMART_REQUESTS_FIELD_CLASS =
    'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-1.5 px-2.5 text-[10px] text-white outline-none focus:border-[#E6C673]/30 placeholder:text-white/25 backdrop-blur-sm';

export type SmartRequestsVisualFlags = {
    isPersonal: boolean;
    isPearlEmbed: boolean;
    isPearlStage: boolean;
    isPearlInline: boolean;
};

export function resolveSmartRequestsVisualFlags(
    visualVariant: 'civil' | 'personal',
    embedMode: 'standalone' | 'pearl-embed' | 'pearl-stage',
): SmartRequestsVisualFlags {
    const isPersonal = visualVariant === 'personal';
    const isPearlEmbed = embedMode === 'pearl-embed';
    const isPearlStage = embedMode === 'pearl-stage';
    return {
        isPersonal,
        isPearlEmbed,
        isPearlStage,
        isPearlInline: isPearlEmbed || isPearlStage,
    };
}

export function resolveSmartRequestsThemeClasses(flags: SmartRequestsVisualFlags) {
    const { isPersonal, isPearlInline } = flags;
    return {
        headerBar: isPearlInline
            ? 'px-0 py-0 border-0 bg-transparent'
            : isPersonal
            ? 'px-3 sm:px-4 py-3 border-b border-white/[0.06] bg-[#141214]'
            : 'px-3 sm:px-4 py-3 border-b border-[#E6C673]/12 bg-gradient-to-l from-[#E6C673]/10 via-transparent to-transparent',
        iconWrap: isPearlInline
            ? 'hidden'
            : isPersonal
            ? 'flex h-7 w-7 items-center justify-center rounded-lg bg-[#C4A574]/10 border border-[#C4A574]/22 shrink-0'
            : 'flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6C673]/10 border border-[#E6C673]/25 shrink-0',
        titleClass: isPearlInline
            ? 'hidden'
            : isPersonal
            ? 'text-white/88 text-sm font-bold leading-tight'
            : 'text-[#E6C673]/95 text-sm font-bold leading-tight',
        badgeClass: isPearlInline
            ? 'shrink-0 bg-white/[0.08] text-[#ECE8E2] px-2 py-0.5 rounded-full text-[9px] font-bold border border-white/[0.14]'
            : isPersonal
            ? 'shrink-0 bg-[#C4A574]/10 text-[#C4A574] px-2 py-0.5 rounded-full text-[9px] font-bold border border-[#C4A574]/22'
            : 'shrink-0 bg-[#E6C673]/15 text-[#E6C673] px-2 py-0.5 rounded-full text-[9px] font-bold border border-[#E6C673]/20',
        addBtnClass: isPearlInline
            ? 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.16] text-[#FFFEF9] hover:bg-white/[0.12] transition-all text-[10px] font-bold'
            : isPersonal
            ? 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#C4A574]/10 border border-[#C4A574]/22 text-[#C4A574] hover:bg-[#C4A574]/15 transition-all text-[10px] font-bold'
            : 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#E6C673]/10 border border-[#E6C673]/25 text-[#E6C673] hover:bg-[#E6C673]/18 transition-all text-[10px] font-bold backdrop-blur-sm',
    };
}
