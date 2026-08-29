import type { JudgmentModalStyles } from './smartFile/smartModalChrome';
import { APPEAL_TRANSITION_GLASS_CARD } from './appealTransitionModalHelpers';

export function resolveAppealTransitionChrome(s: JudgmentModalStyles) {
    const hintShell = s.isPearl
        ? 'rounded-xl border border-[#F0A8B4]/18 bg-gradient-to-br from-[#F5C6D0]/[0.08] to-white/[0.03] px-3.5 py-2.5 space-y-1'
        : 'rounded-xl border border-[#E6C673]/15 bg-[#E6C673]/[0.05] px-3.5 py-2.5 space-y-1';

    const appellantPickerCard = s.isPearl
        ? `${s.section} border-[#F0A8B4]/22 bg-gradient-to-br from-[#F5C6D0]/[0.08] to-white/[0.03]`
        : `${APPEAL_TRANSITION_GLASS_CARD} border-emerald-500/15 bg-emerald-500/[0.03]`;

    const opponentPickerCard = s.isPearl
        ? `${s.section} border-white/[0.14] bg-white/[0.03]`
        : `${APPEAL_TRANSITION_GLASS_CARD} border-indigo-500/15 bg-indigo-500/[0.03]`;

    const appellantPickerTitle = s.isPearl ? 'text-[#FFD4DC]/95' : 'text-emerald-200/90';
    const opponentPickerTitle = s.isPearl ? 'text-[#ECE8E2]/90' : 'text-indigo-200/90';

    const appellantRowSelected = s.isPearl
        ? 'border-[#F0A8B4]/32 bg-[#F5C6D0]/10 text-[#FFFEF9]'
        : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50';

    const appellantRowIdle = s.isPearl
        ? 'border-white/[0.08] bg-transparent text-[#9894A0] hover:bg-white/[0.04]'
        : 'border-white/[0.06] bg-transparent text-white/45 hover:bg-white/[0.03]';

    const appellantCheckSelected = s.isPearl
        ? 'border-[#F0A8B4]/40 bg-[#F5C6D0]/20 text-[#FFD4DC]'
        : 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100';

    const opponentRowSelected = s.isPearl
        ? 'border-white/[0.22] bg-white/[0.08] text-[#FFFEF9]'
        : 'border-indigo-400/30 bg-indigo-500/10 text-indigo-50';

    const opponentRowIdle = s.isPearl
        ? 'border-white/[0.08] bg-transparent text-[#9894A0] hover:bg-white/[0.04]'
        : 'border-white/[0.06] bg-transparent text-white/45 hover:bg-white/[0.03]';

    const opponentCheckSelected = s.isPearl
        ? 'border-white/[0.28] bg-white/[0.12] text-[#ECE8E2]'
        : 'border-indigo-300/40 bg-indigo-400/20 text-indigo-100';

    return {
        hintShell,
        appellantPickerCard,
        opponentPickerCard,
        appellantPickerTitle,
        opponentPickerTitle,
        appellantRowSelected,
        appellantRowIdle,
        appellantCheckSelected,
        opponentRowSelected,
        opponentRowIdle,
        opponentCheckSelected,
    };
}
