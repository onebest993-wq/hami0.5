import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import {
    SMART_FILE_NESTED_MODAL_OVERLAY_CLASS,
    SMART_FILE_NESTED_MODAL_Z,
} from './smartFileOverlayZ';
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
            : 'rounded-xl border border-[#E6C673]/18 bg-[#E6C673]/[0.05] px-3 py-2.5',
        cardSecondary: 'rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-3 py-2.5',
        optionBtn: isPearl
            ? 'rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-3 text-xs font-bold text-[#ECE8E2]/90 hover:border-[#F0A8B4]/30 hover:text-[#FFFEF9] transition-colors text-right'
            : 'rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-3 text-xs font-semibold text-white/80 hover:border-[#E6C673]/22 hover:text-[#E6C673] transition-colors text-right',
        optionBtnPrimary: isPearl
            ? 'rounded-xl border border-[#F0A8B4]/32 bg-gradient-to-br from-[#F5C6D0]/[0.16] to-white/[0.05] px-3 py-3 text-xs font-bold text-[#FFFEF9] hover:from-[#F5C6D0]/[0.24] transition-colors text-right'
            : 'rounded-xl border border-[#E6C673]/28 bg-[#E6C673]/[0.09] px-3 py-3 text-xs font-semibold text-[#E6C673] hover:bg-[#E6C673]/[0.14] transition-colors text-right',
        listItemActive: isPearl
            ? 'border-[#F0A8B4]/35 bg-[#F5C6D0]/10'
            : 'border-[#E6C673]/35 bg-[#E6C673]/10',
        listItemIdle: isPearl
            ? 'border-white/[0.10] bg-white/[0.04] hover:border-[#F0A8B4]/22'
            : 'border-white/[0.08] bg-white/[0.03] hover:border-[#E6C673]/20',
        optionClass: isPearl ? 'bg-[#16161F] text-[#FFFEF9]' : 'bg-[#0A0F1C] text-white',
        deadlineBox: isPearl
            ? 'bg-white/[0.04] border border-[#F0A8B4]/22 rounded-xl p-3 flex flex-col items-center justify-center gap-1'
            : 'bg-white/[0.03] border border-[#E6C673]/20 rounded-xl p-3 flex flex-col items-center justify-center gap-1',
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

const JUDGMENT_TOGGLE =
    'flex-1 min-h-[44px] py-2 px-3 rounded-xl text-sm transition-colors border flex items-center justify-center gap-2 touch-manipulation';
const JUDGMENT_BTN =
    'w-full min-h-[44px] py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border touch-manipulation';
const JUDGMENT_DIAMOND_OPT =
    'w-full min-h-[44px] text-right px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 border touch-manipulation';
const JUDGMENT_SHELL =
    'w-full max-w-xl rounded-2xl border border-white/[0.08] overflow-hidden max-h-[min(86dvh,34rem)] flex flex-col pb-[env(safe-area-inset-bottom)]';

export function useJudgmentModalStyles(): JudgmentModalStyles {
    const T = useSmartFileModalTheme();
    const isPearl = T.variant === 'personal-pearl';

    if (!isPearl) {
        return {
            isPearl: false,
            overlay: SMART_FILE_NESTED_MODAL_OVERLAY_CLASS,
            shell: `${JUDGMENT_SHELL} bg-[#0A0F1C] shadow-[0_8px_20px_rgba(0,0,0,0.28)]`,
            header: `${T.header} shrink-0`,
            headerIconWrap:
                'flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] shrink-0',
            headerIcon: 'text-[#E6C673]',
            headerTitle: T.headerTitle,
            body: 'flex-1 overflow-y-auto overflow-x-visible scrollbar-hide p-3 space-y-3',
            field: `w-full min-h-[44px] ${T.field}`,
            label: `${T.label} mb-1.5 flex items-center gap-2`,
            labelIcon: 'text-[#E6C673]/70',
            section: 'p-0',
            closeBtn: T.closeBtn,
            toggle: JUDGMENT_TOGGLE,
            toggleActive: 'bg-[#E6C673]/10 border-[#E6C673]/28 text-[#E6C673] font-semibold',
            toggleIdle: 'bg-white/[0.025] border-white/[0.08] text-white/50 hover:bg-white/[0.05]',
            btnPrimary: `${JUDGMENT_BTN} bg-[#E6C673]/12 border-[#E6C673]/30 text-[#E6C673] hover:bg-[#E6C673]/20`,
            btnNeutral: `${JUDGMENT_BTN} bg-white/[0.03] border-white/[0.09] text-white/80 hover:bg-white/[0.07] hover:text-white`,
            hint: 'rounded-xl border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 text-xs leading-relaxed flex items-start gap-2',
            divider: 'border-t border-white/[0.06] pt-3',
            diamondSection: 'relative p-0 overflow-visible',
            diamondTrigger:
                'w-full min-h-[44px] flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-right transition-colors hover:border-white/[0.14] focus:outline-none focus:border-[#E6C673]/35 touch-manipulation',
            diamondMenu:
                'overflow-y-auto rounded-xl border border-white/[0.10] bg-[#0A0F1C] shadow-[0_8px_20px_rgba(0,0,0,0.32)] p-1 scrollbar-hide',
            diamondOptionActive: `${JUDGMENT_DIAMOND_OPT} bg-[#E6C673]/10 border-[#E6C673]/22 text-[#E6C673] font-semibold`,
            diamondOptionIdle: `${JUDGMENT_DIAMOND_OPT} border-transparent text-white/80 hover:bg-white/[0.05] hover:text-white`,
            accentCheck: 'text-[#E6C673]',
            accentChevron: 'text-white/40',
            waitBox: 'rounded-xl border border-sky-500/16 bg-sky-500/[0.04] p-3 flex flex-col gap-2',
            waitHintText: 'text-sky-100/90',
            waitHintIcon: 'text-sky-200/80',
            btnWait: `${JUDGMENT_BTN} bg-sky-500/10 border-sky-400/22 text-sky-100 hover:bg-sky-500/16`,
        };
    }

    return {
        isPearl: true,
        overlay: `fixed inset-0 ${SMART_FILE_NESTED_MODAL_Z} flex items-start justify-center overflow-y-auto overscroll-contain bg-[#101018]/90 p-3 sm:items-center sm:p-4 font-['Tajawal'] pointer-events-auto`,
        shell: `${JUDGMENT_SHELL} bg-[#16161F] shadow-[0_8px_20px_rgba(0,0,0,0.26)]`,
        header:
            'relative px-4 py-2.5 border-b border-white/[0.10] bg-[#16161F] flex justify-between items-center shrink-0',
        headerIconWrap:
            'flex items-center justify-center w-8 h-8 rounded-lg border border-white/[0.12] bg-white/[0.05] shrink-0',
        headerIcon: 'text-[#C9B89A]',
        headerTitle: 'font-bold flex items-center gap-2 text-[13px] text-[#FFFEF9] truncate',
        body: 'flex-1 overflow-y-auto overflow-x-visible scrollbar-hide p-3 space-y-3',
        field: `w-full min-h-[44px] ${T.field}`,
        label: `${T.label} mb-1.5 flex items-center gap-2`,
        labelIcon: 'text-[#C9B89A]',
        section: 'p-0',
        closeBtn:
            'inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-1.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-[#9894A0] hover:text-[#FFFEF9] hover:bg-white/[0.10] transition-colors shrink-0 touch-manipulation',
        toggle: JUDGMENT_TOGGLE,
        toggleActive: 'bg-white/[0.08] border-[#F0A8B4]/28 text-[#FFFEF9] font-semibold',
        toggleIdle: 'bg-white/[0.04] border-white/[0.12] text-[#9894A0] hover:bg-white/[0.07] hover:text-[#ECE8E2]',
        btnPrimary: `${JUDGMENT_BTN} border-[#F0A8B4]/28 bg-white/[0.08] text-[#FFFEF9] hover:bg-white/[0.12]`,
        btnNeutral: `${JUDGMENT_BTN} border-white/[0.14] bg-white/[0.05] text-[#ECE8E2]/90 hover:bg-white/[0.08] hover:text-[#FFFEF9]`,
        hint: 'rounded-xl border border-white/[0.10] bg-white/[0.03] px-2.5 py-2 text-xs leading-relaxed flex items-start gap-2',
        divider: 'border-t border-white/[0.08] pt-3',
        diamondSection: 'relative p-0 overflow-visible',
        diamondTrigger:
            'w-full min-h-[44px] flex items-center justify-between gap-3 rounded-xl border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-sm text-right transition-colors hover:border-white/[0.18] focus:outline-none focus:border-white/[0.26] touch-manipulation',
        diamondMenu:
            'overflow-y-auto rounded-xl border border-white/[0.12] bg-[#16161F] shadow-[0_8px_20px_rgba(0,0,0,0.28)] p-1 scrollbar-hide',
        diamondOptionActive: `${JUDGMENT_DIAMOND_OPT} bg-white/[0.08] border-[#F0A8B4]/28 text-[#FFFEF9] font-semibold`,
        diamondOptionIdle: `${JUDGMENT_DIAMOND_OPT} border-transparent text-[#ECE8E2]/85 hover:bg-white/[0.06] hover:text-[#FFFEF9]`,
        accentCheck: 'text-[#FFD4DC]',
        accentChevron: 'text-[#9894A0]',
        waitBox: 'rounded-xl border border-white/[0.12] bg-white/[0.04] p-3 flex flex-col gap-2',
        waitHintText: 'text-[#ECE8E2]/90',
        waitHintIcon: 'text-[#F0A8B4]/85',
        btnWait: `${JUDGMENT_BTN} border-white/[0.14] bg-white/[0.05] text-[#ECE8E2] hover:bg-white/[0.08]`,
    };
}
