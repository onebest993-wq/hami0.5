import React from 'react';
import { X } from 'lucide-react';
import { SMART_FILE_NESTED_MODAL_Z } from './smartFileOverlayZ';
import {
    GLASS_MODAL_HEADER,
    MoroccanCloseButton,
    MoroccanHeaderDivider,
} from './moroccanGlassShell';
import { useSmartFileModalTheme } from './smartFileModalTheme';

export function SmartModalHeader({
    icon: Icon,
    title,
    onClose,
}: {
    icon?: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    title: string;
    onClose: () => void;
}) {
    const T = useSmartFileModalTheme();
    return (
        <div className={T.useMoroccanCorners ? GLASS_MODAL_HEADER : T.header}>
            <h3 className={T.useMoroccanCorners ? 'font-bold flex items-center gap-2 text-[14px] text-white/95' : T.headerTitle}>
                {Icon ? <Icon size={17} className={T.headerIcon} strokeWidth={1.75} /> : null}
                {title}
            </h3>
            {T.useMoroccanCorners ? (
                <MoroccanCloseButton onClick={onClose} />
            ) : (
                <button type="button" onClick={onClose} className={T.closeBtn} aria-label="إغلاق">
                    <X size={16} />
                </button>
            )}
            {T.useMoroccanCorners ? <MoroccanHeaderDivider /> : null}
        </div>
    );
}

/** Accent tokens for procedural modals with inline gold/pearl highlights */
export function useSmartModalAccent() {
    const T = useSmartFileModalTheme();
    const isPearl = T.variant === 'personal-pearl';

    return {
        T,
        isPearl,
        required: isPearl ? 'text-rose-300' : 'text-[#E6C673]',
        highlight: isPearl ? 'text-[#FFD4DC]' : 'text-[#E6C673]',
        highlightMuted: isPearl ? 'text-[#F0A8B4]/80' : 'text-[#E6C673]/70',
        cardPrimary: isPearl
            ? 'rounded-xl border border-[#F0A8B4]/22 bg-gradient-to-br from-[#F5C6D0]/[0.12] to-white/[0.04] px-3 py-2.5'
            : 'rounded-xl border border-[#E6C673]/20 bg-[#E6C673]/6 px-3 py-2.5',
        cardSecondary: 'rounded-xl border border-dashed border-white/[0.14] bg-white/[0.02] px-3 py-2.5',
        optionBtn: isPearl
            ? 'rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-3 text-xs font-bold text-[#ECE8E2]/90 hover:border-[#F0A8B4]/30 hover:text-[#FFFEF9] transition-colors text-right'
            : 'rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-3 text-xs font-bold text-white/80 hover:border-[#E6C673]/25 hover:text-[#E6C673] transition-colors text-right',
        optionBtnPrimary: isPearl
            ? 'rounded-xl border border-[#F0A8B4]/32 bg-gradient-to-br from-[#F5C6D0]/[0.16] to-white/[0.05] px-3 py-3 text-xs font-bold text-[#FFFEF9] hover:from-[#F5C6D0]/[0.24] transition-colors text-right'
            : 'rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/10 px-3 py-3 text-xs font-bold text-[#E6C673] hover:bg-[#E6C673]/18 transition-colors text-right',
        listItemActive: isPearl
            ? 'border-[#F0A8B4]/35 bg-[#F5C6D0]/10'
            : 'border-[#E6C673]/35 bg-[#E6C673]/10',
        listItemIdle: isPearl
            ? 'border-white/[0.10] bg-white/[0.04] hover:border-[#F0A8B4]/22'
            : 'border-white/[0.08] bg-white/[0.03] hover:border-[#E6C673]/20',
        optionClass: isPearl ? 'bg-[#16161F] text-[#FFFEF9]' : 'bg-[#0A0F1C] text-white',
        deadlineBox: isPearl
            ? 'bg-white/[0.04] backdrop-blur-sm border border-[#F0A8B4]/22 rounded-xl p-3 flex flex-col items-center justify-center gap-1'
            : 'bg-white/[0.03] backdrop-blur-sm border border-[#E6C673]/20 rounded-xl p-3 flex flex-col items-center justify-center gap-1',
        spawnBox: 'rounded-xl border border-white/[0.08] bg-white/[0.03] p-4',
        cancelBtn:
            'px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/70 text-[11px] font-bold hover:bg-white/[0.04] transition-colors',
    };
}

export type JudgmentModalStyles = {
    isPearl: boolean;
    overlay: string;
    shell: string;
    header: string;
    headerIconWrap: string;
    headerIcon: string;
    headerTitle: string;
    body: string;
    field: string;
    label: string;
    labelIcon: string;
    section: string;
    closeBtn: string;
    toggle: string;
    toggleActive: string;
    toggleIdle: string;
    btnPrimary: string;
    btnNeutral: string;
    hint: string;
    divider: string;
    diamondSection: string;
    diamondTrigger: string;
    diamondMenu: string;
    diamondOptionActive: string;
    diamondOptionIdle: string;
    accentCheck: string;
    accentChevron: string;
    waitBox: string;
    waitHintText: string;
    waitHintIcon: string;
    btnWait: string;
};

export function useJudgmentModalStyles(): JudgmentModalStyles {
    const T = useSmartFileModalTheme();
    const isPearl = T.variant === 'personal-pearl';

    if (!isPearl) {
        return {
            isPearl: false,
            overlay:
                `fixed inset-0 ${SMART_FILE_NESTED_MODAL_Z} flex items-start justify-center overflow-y-auto overscroll-contain bg-[#03050B]/94 p-3 sm:items-center sm:p-4 font-['Tajawal'] pointer-events-auto`,
            shell:
                'w-full max-w-2xl rounded-2xl border border-white/[0.1] bg-[#0A0F1C] shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden max-h-[92vh] flex flex-col',
            header:
                'relative px-5 py-4 border-b border-white/[0.08] bg-gradient-to-l from-[#E6C673]/10 via-transparent to-transparent flex justify-between items-center shrink-0',
            headerIconWrap:
                'flex items-center justify-center w-10 h-10 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/20 shrink-0',
            headerIcon: 'text-[#E6C673]',
            headerTitle: 'text-[#E6C673] text-lg font-bold truncate',
            body: 'flex-1 overflow-y-auto overflow-x-visible scrollbar-hide p-5 sm:p-6 space-y-5',
            field:
                'w-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#E6C673]/30 focus:bg-white/[0.06] transition-all [color-scheme:dark]',
            label: 'text-xs font-bold text-white/50 mb-2 flex items-center gap-2',
            labelIcon: 'text-[#E6C673]/70',
            section: 'rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-4',
            closeBtn:
                'p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-colors',
            toggle:
                'flex-1 py-2.5 px-3 rounded-xl text-sm transition-all border flex items-center justify-center gap-2',
            toggleActive: 'bg-[#E6C673]/12 border-[#E6C673]/35 text-[#E6C673] font-bold',
            toggleIdle: 'bg-white/[0.03] border-white/[0.08] text-white/45 hover:bg-white/[0.06]',
            btnPrimary:
                'w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border bg-[#E6C673]/12 border-[#E6C673]/30 text-[#E6C673] hover:bg-[#E6C673]/22',
            btnNeutral:
                'w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border bg-white/[0.04] border-white/[0.1] text-white/80 hover:bg-white/[0.08] hover:text-white',
            hint: 'rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs leading-relaxed flex items-start gap-2',
            divider: 'border-t border-white/[0.06] pt-4',
            diamondSection:
                'relative rounded-2xl border border-[#E6C673]/12 bg-gradient-to-br from-white/[0.06] via-[#0A0F1C]/40 to-[#0A0F1C]/60 backdrop-blur-2xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.25),0_12px_40px_rgba(0,0,0,0.35)] overflow-visible',
            diamondTrigger:
                'w-full flex items-center justify-between gap-3 rounded-xl border border-white/[0.1] bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent px-4 py-3.5 text-sm text-right transition-all hover:border-[#E6C673]/28 hover:shadow-[inset_0_1px_0_rgba(230,198,115,0.08)] focus:outline-none focus:border-[#E6C673]/35',
            diamondMenu:
                'overflow-y-auto rounded-xl border border-[#E6C673]/18 bg-[#0A0F1C]/98 backdrop-blur-2xl shadow-[0_20px_56px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.07)] p-1.5 scrollbar-hide',
            diamondOptionActive:
                'w-full text-right px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between gap-2 border bg-[#E6C673]/12 border-[#E6C673]/22 text-[#E6C673] font-bold',
            diamondOptionIdle:
                'w-full text-right px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between gap-2 border border-transparent text-white/80 hover:bg-white/[0.06] hover:text-white',
            accentCheck: 'text-[#E6C673]',
            accentChevron: 'text-[#E6C673]/60',
            waitBox: 'rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] p-4 flex flex-col gap-3',
            waitHintText: 'text-indigo-200/90',
            waitHintIcon: 'text-indigo-300/80',
            btnWait:
                'w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border bg-indigo-500/10 border-indigo-400/25 text-indigo-200 hover:bg-indigo-500/18',
        };
    }

    return {
        isPearl: true,
        overlay: `fixed inset-0 ${SMART_FILE_NESTED_MODAL_Z} flex items-start justify-center overflow-y-auto overscroll-contain bg-[#101018]/94 p-3 sm:items-center sm:p-4 font-['Tajawal'] pointer-events-auto`,
        shell:
            'relative overflow-hidden w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-white/[0.14] bg-[#16161F] shadow-[0_24px_64px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.14)]',
        header:
            'relative px-5 py-4 border-b border-white/[0.10] bg-gradient-to-l from-white/[0.05] to-transparent flex justify-between items-center shrink-0',
        headerIconWrap:
            'flex items-center justify-center w-10 h-10 rounded-xl border border-[#F0A8B4]/24 bg-gradient-to-br from-[#F5C6D0]/[0.14] to-white/[0.05] shrink-0',
        headerIcon: 'text-[#C9B89A]',
        headerTitle: 'text-[#FFFEF9] text-lg font-bold truncate',
        body: 'flex-1 overflow-y-auto overflow-x-visible scrollbar-hide p-4 sm:p-5 space-y-4',
        field: T.field,
        label: `${T.label} mb-2 flex items-center gap-2`,
        labelIcon: 'text-[#C9B89A]',
        section: 'rounded-xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm p-4',
        closeBtn: T.closeBtn,
        toggle:
            'flex-1 py-2.5 px-3 rounded-xl text-sm transition-all border flex items-center justify-center gap-2',
        toggleActive:
            'bg-gradient-to-br from-[#F5C6D0]/[0.16] to-white/[0.05] border-[#F0A8B4]/32 text-[#FFFEF9] font-bold',
        toggleIdle: 'bg-white/[0.04] border-white/[0.12] text-[#9894A0] hover:bg-white/[0.07] hover:text-[#ECE8E2]',
        btnPrimary: `${T.btn} flex items-center justify-center gap-2`,
        btnNeutral:
            'w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-white/[0.14] bg-white/[0.05] text-[#ECE8E2]/90 hover:bg-white/[0.08] hover:text-[#FFFEF9]',
        hint: 'rounded-xl border border-white/[0.10] bg-white/[0.03] px-3 py-2.5 text-xs leading-relaxed flex items-start gap-2',
        divider: 'border-t border-white/[0.08] pt-4',
        diamondSection:
            'relative rounded-2xl border border-[#F0A8B4]/20 bg-gradient-to-br from-[#F5C6D0]/[0.10] via-white/[0.05] to-[#ECE8E2]/[0.04] backdrop-blur-2xl p-4 shadow-[inset_0_1px_0_rgba(255,220,228,0.22),0_12px_40px_rgba(0,0,0,0.28)] overflow-visible',
        diamondTrigger:
            'w-full flex items-center justify-between gap-3 rounded-xl border border-white/[0.14] bg-white/[0.05] px-4 py-3.5 text-sm text-right transition-all hover:border-[#F0A8B4]/28 hover:bg-white/[0.07] focus:outline-none focus:border-[#F0A8B4]/35',
        diamondMenu:
            'overflow-y-auto rounded-xl border border-[#F0A8B4]/22 bg-[#16161F]/98 backdrop-blur-2xl shadow-[0_20px_56px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,220,228,0.12)] p-1.5 scrollbar-hide',
        diamondOptionActive:
            'w-full text-right px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between gap-2 border bg-[#F5C6D0]/12 border-[#F0A8B4]/28 text-[#FFFEF9] font-bold',
        diamondOptionIdle:
            'w-full text-right px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between gap-2 border border-transparent text-[#ECE8E2]/85 hover:bg-white/[0.06] hover:text-[#FFFEF9]',
        accentCheck: 'text-[#FFD4DC]',
        accentChevron: 'text-[#F0A8B4]/70',
        waitBox:
            'rounded-xl border border-[#F0A8B4]/22 bg-gradient-to-br from-[#F5C6D0]/[0.10] via-white/[0.04] to-[#ECE8E2]/[0.03] p-4 flex flex-col gap-3 shadow-[inset_0_1px_0_rgba(255,220,228,0.18)]',
        waitHintText: 'text-[#ECE8E2]/90',
        waitHintIcon: 'text-[#F0A8B4]/85',
        btnWait: `${T.btn} flex items-center justify-center gap-2`,
    };
}
