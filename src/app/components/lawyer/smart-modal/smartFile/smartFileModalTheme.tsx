import React, { createContext, useContext, useMemo } from 'react';
import { personalPearlModalTheme } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';

export type SmartFileModalVisualVariant = 'civil' | 'personal-pearl';

export type SmartFileModalTheme = {
    variant: SmartFileModalVisualVariant;
    overlay: string;
    shell: string;
    shellCard: string;
    header: string;
    headerTitle: string;
    headerIcon: string;
    body: string;
    field: string;
    select: string;
    label: string;
    btn: string;
    btnDisabled: string;
    closeBtn: string;
    chip: string;
    chipActive: string;
    sectionTitle: string;
    actionRow: string;
    actionRowDanger: string;
    actionRowIcon: string;
    actionRowIconDanger: string;
    sheet: string;
    sheetHandle: string;
    sheetTitle: string;
    accentText: string;
    useMoroccanCorners: boolean;
};

const CIVIL_THEME: SmartFileModalTheme = {
    variant: 'civil',
    overlay:
        "fixed inset-0 z-[160] flex items-center justify-center bg-[#05060D]/65 backdrop-blur-[3px] p-4 font-['Tajawal']",
    shell: 'relative overflow-visible animate-in zoom-in-95 duration-200',
    shellCard:
        'w-full overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0A0F1C]/80 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.65)]',
    header:
        'relative px-4 py-4 border-b border-white/[0.08] bg-gradient-to-l from-[#E6C673]/10 via-transparent to-transparent flex justify-between items-center',
    headerTitle: 'font-bold flex items-center gap-2 text-[14px] text-white/95',
    headerIcon: 'text-[#E6C673] shrink-0',
    body: 'p-5 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent',
    field:
        'w-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/35 focus:bg-white/[0.06] transition-all [color-scheme:dark]',
    select:
        'w-full bg-[#0A0F1C]/80 border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/35 transition-all cursor-pointer appearance-none [color-scheme:dark]',
    label: 'block text-[11px] font-bold text-white/50 mb-1.5',
    btn: 'w-full bg-[#E6C673]/15 border border-[#E6C673]/35 text-[#E6C673] py-3 rounded-xl font-bold text-sm transition-all hover:bg-[#E6C673]/25 disabled:opacity-50 disabled:cursor-not-allowed',
    btnDisabled: 'disabled:opacity-40 disabled:cursor-not-allowed',
    closeBtn:
        'p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-colors',
    chip: 'px-3 py-1 rounded-full text-[11px] font-bold transition-all border border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80',
    chipActive:
        'px-3 py-1 rounded-full text-[11px] font-bold transition-all border border-[#E6C673]/35 bg-[#E6C673]/18 text-[#E6C673] shadow-[0_0_14px_rgba(230,198,115,0.18)]',
    sectionTitle: 'px-1 pb-2 text-[10px] font-bold text-[#E6C673]/90 tracking-wide',
    actionRow:
        'flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl backdrop-blur-sm border transition-all duration-200 group active:scale-[0.99] bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06] hover:border-[#E6C673]/20',
    actionRowDanger:
        'flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl backdrop-blur-sm border transition-all duration-200 group active:scale-[0.99] bg-rose-500/[0.06] border-rose-500/15 hover:bg-rose-500/10 hover:border-rose-400/25',
    actionRowIcon:
        'w-8 h-8 shrink-0 rounded-lg flex items-center justify-center border bg-white/[0.04] border-white/[0.1] group-hover:border-white/20 transition-colors',
    actionRowIconDanger:
        'w-8 h-8 shrink-0 rounded-lg flex items-center justify-center border bg-rose-500/10 border-rose-500/20 group-hover:border-rose-400/30 transition-colors',
    sheet:
        'fixed bottom-0 left-0 right-0 z-[101] max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent rounded-t-[1.75rem] border-t border-white/[0.1] bg-[#0A0F1C]/80 backdrop-blur-2xl shadow-[0_-24px_64px_rgba(0,0,0,0.55)] px-4 pt-3 pb-8',
    sheetHandle: 'w-10 h-1 rounded-full bg-white/15 mx-auto mb-4',
    sheetTitle: 'text-[#E6C673] font-bold text-base mb-4 text-center flex items-center justify-center gap-2',
    accentText: 'text-[#E6C673]',
    useMoroccanCorners: true,
};

function buildPearlTheme(): SmartFileModalTheme {
    const P = personalPearlModalTheme();
    return {
        variant: 'personal-pearl',
        overlay: P.overlay,
        shell: P.shell,
        shellCard: P.shellCard,
        header: P.header,
        headerTitle: P.headerTitle,
        headerIcon: P.headerIcon,
        body: P.body,
        field: P.field,
        select: P.select,
        label: P.label,
        btn: P.btn,
        btnDisabled: P.btnDisabled,
        closeBtn: P.closeBtn,
        chip: P.chip,
        chipActive: P.chipActive,
        sectionTitle: P.sectionTitle,
        actionRow: P.actionRow,
        actionRowDanger: P.actionRowDanger,
        actionRowIcon: P.actionRowIcon,
        actionRowIconDanger: P.actionRowIconDanger,
        sheet: P.sheet,
        sheetHandle: P.sheetHandle,
        sheetTitle: P.sheetTitle,
        accentText: P.accentText,
        useMoroccanCorners: false,
    };
}

export function resolveSmartFileModalTheme(variant: SmartFileModalVisualVariant): SmartFileModalTheme {
    return variant === 'personal-pearl' ? buildPearlTheme() : CIVIL_THEME;
}

const SmartFileModalThemeContext = createContext<SmartFileModalTheme>(CIVIL_THEME);

export function SmartFileModalThemeProvider({
    variant = 'civil',
    children,
}: {
    variant?: SmartFileModalVisualVariant;
    children: React.ReactNode;
}) {
    const theme = useMemo(() => resolveSmartFileModalTheme(variant), [variant]);
    return (
        <SmartFileModalThemeContext.Provider value={theme}>{children}</SmartFileModalThemeContext.Provider>
    );
}

export function useSmartFileModalTheme(): SmartFileModalTheme {
    return useContext(SmartFileModalThemeContext);
}
