import React, { createContext, useContext, useMemo } from 'react';
import { SMART_FILE_NESTED_MODAL_OVERLAY_CLASS } from './smartFileOverlayZ';
import { HUB_DOSSIER_ACTIONS_MENU_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';
import { personalPearlModalTheme } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';
import {
    LV_BTN_GOLD,
    LV_CHIP_ACTIVE,
    LV_ELEVATION,
    LV_ELEVATION_SOFT,
    LV_INSET,
    LV_INSET_HOVER,
    LV_RADIUS,
    LV_RADIUS_LG,
    LV_SURFACE_GOLD_SOLID,
} from '@/app/components/lawyer/lawyerShared/lawsuitVisualLite';

export type SmartFileModalVisualVariant = 'civil' | 'personal-pearl';

type SmartFileModalTheme = {
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
    shellCard: `w-full overflow-hidden ${LV_RADIUS_LG} ${LV_SURFACE_GOLD_SOLID} ${LV_ELEVATION}`,
    header:
        'relative px-4 py-2.5 border-b border-white/[0.07] bg-[#0A0F1C] flex justify-between items-center shrink-0',
    headerTitle: 'font-bold flex items-center gap-2 text-[14px] text-white/95 tracking-tight',
    headerIcon: 'text-[#E6C673] shrink-0',
    body: 'p-3 sm:p-3.5 space-y-3 max-h-[82vh] overflow-y-auto overscroll-contain bg-[#0A0F1C] scrollbar-thin scrollbar-thumb-[#E6C673]/15 scrollbar-track-transparent',
    field: `w-full ${LV_INSET} rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/36 focus:bg-white/[0.05] transition-colors [color-scheme:dark]`,
    select:
        'w-full bg-[#0A0F1C] border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/35 transition-colors cursor-pointer appearance-none [color-scheme:dark]',
    label: 'block text-[11px] font-semibold text-white/48 mb-1.5 tracking-wide',
    btn: `w-full min-h-[44px] ${LV_BTN_GOLD} py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation`,
    btnDisabled: 'disabled:opacity-40 disabled:cursor-not-allowed',
    closeBtn:
        'inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/45 hover:text-white hover:bg-white/[0.08] transition-colors touch-manipulation',
    chip: 'px-3 py-1 rounded-full text-[11px] font-semibold transition-colors border border-white/[0.08] bg-white/[0.03] text-white/50 hover:bg-white/[0.07] hover:text-white/80',
    chipActive: `px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${LV_CHIP_ACTIVE}`,
    sectionTitle: 'px-1 pb-1.5 text-[10px] font-semibold text-[#E6C673]/75 tracking-wide',
    actionRow: `flex w-full items-center gap-2.5 text-right px-3 py-2.5 ${LV_RADIUS} ${LV_INSET} ${LV_INSET_HOVER} min-h-[44px] touch-manipulation transition-colors active:scale-[0.99]`,
    actionRowDanger:
        'flex w-full items-center gap-2.5 text-right px-3 py-2.5 rounded-2xl border border-rose-500/22 bg-rose-500/[0.06] hover:bg-rose-500/[0.10] hover:border-rose-400/28 min-h-[44px] touch-manipulation transition-colors active:scale-[0.99]',
    actionRowIcon: 'text-[#E6C673] shrink-0',
    actionRowIconDanger: 'text-rose-300/90 shrink-0',
    sheet: `fixed inset-x-3 bottom-2 mx-auto w-auto max-w-[28rem] ${HUB_DOSSIER_ACTIONS_MENU_Z_CLASS} flex flex-col max-h-[min(78dvh,32rem)] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0A0F1C] ${LV_ELEVATION_SOFT} px-3 pt-0.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-auto`,
    sheetHandle: 'w-9 h-1 rounded-full bg-white/28',
    sheetTitle:
        'text-white/90 font-bold text-sm mb-2 text-center flex items-center justify-center gap-1.5',
    accentText: 'text-[#E6C673]',
    useMoroccanCorners: false,
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

function resolveSmartFileModalTheme(variant: SmartFileModalVisualVariant): SmartFileModalTheme {
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
