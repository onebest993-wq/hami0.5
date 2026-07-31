import React, { createContext, useContext, useMemo } from 'react';
import { SMART_FILE_NESTED_MODAL_OVERLAY_CLASS } from './smartFileOverlayZ';
import { HUB_DOSSIER_MODAL_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';
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
    overlay: SMART_FILE_NESTED_MODAL_OVERLAY_CLASS,
    shell: 'relative overflow-visible',
    shellCard:
        'w-full overflow-hidden rounded-[28px] border border-[#E6C673]/16 bg-[radial-gradient(circle_at_top,rgba(230,198,115,0.10),transparent_34%),linear-gradient(180deg,rgba(18,24,38,0.97),rgba(10,15,28,0.98))] backdrop-blur-2xl shadow-[0_28px_72px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.05)]',
    header:
        'relative px-4 py-4 border-b border-[#E6C673]/10 bg-gradient-to-l from-[#E6C673]/12 via-white/[0.02] to-transparent flex justify-between items-center',
    headerTitle: 'font-bold flex items-center gap-2 text-[14px] text-white/95',
    headerIcon: 'text-[#E6C673] shrink-0',
    body: 'p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#E6C673]/15 scrollbar-track-transparent',
    field:
        'w-full bg-white/[0.035] backdrop-blur-sm border border-white/[0.07] rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/32 focus:bg-white/[0.05] transition-all [color-scheme:dark]',
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
        'flex items-center gap-4 w-full text-right px-5 py-4 rounded-[1.6rem] backdrop-blur-sm border transition-all duration-200 group active:scale-[0.99] bg-white/[0.04] border-white/[0.07] hover:bg-[#E6C673]/[0.08] hover:border-[#E6C673]/22 min-h-[4.5rem]',
    actionRowDanger:
        'flex items-center gap-4 w-full text-right px-5 py-4 rounded-[1.6rem] backdrop-blur-sm border transition-all duration-200 group active:scale-[0.99] bg-rose-500/[0.08] border-rose-500/18 hover:bg-rose-500/12 hover:border-rose-400/28 min-h-[4.5rem]',
    actionRowIcon:
        'w-12 h-12 shrink-0 rounded-[1rem] flex items-center justify-center border bg-white/[0.05] border-white/[0.1] group-hover:border-white/20 transition-colors',
    actionRowIconDanger:
        'w-12 h-12 shrink-0 rounded-[1rem] flex items-center justify-center border bg-rose-500/10 border-rose-500/20 group-hover:border-rose-400/30 transition-colors',
    sheet:
        `fixed inset-x-2 bottom-2 ${HUB_DOSSIER_MODAL_Z_CLASS} max-h-[calc(100vh-1rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-[#E6C673]/15 scrollbar-track-transparent rounded-[1.85rem] border border-[#E6C673]/14 bg-[linear-gradient(180deg,rgba(18,24,38,0.992),rgba(9,13,24,0.995))] backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.56)] px-5 pt-4 pb-7 md:left-1/2 md:right-auto md:top-6 md:bottom-6 md:w-[min(94vw,68rem)] md:max-h-[calc(100vh-3rem)] md:-translate-x-1/2 md:rounded-[2.1rem]`,
    sheetHandle: 'w-10 h-1 rounded-full bg-[#E6C673]/20 mx-auto mb-4',
    sheetTitle: 'text-[#E6C673] font-bold text-lg mb-4 text-center flex items-center justify-center gap-2',
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
