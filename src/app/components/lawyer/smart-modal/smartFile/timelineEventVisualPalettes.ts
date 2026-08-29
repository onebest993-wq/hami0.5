import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import type { TimelineEvent } from '../../LawyerShared';

export type TimelineVisual = {
    Icon: LucideIcon;
    iconWrap: string;
    iconColor: string;
    card: string;
    dot: string;
    title: string;
    detailsBorder: string;
    detailsText: string;
};

export type ExtendedTimelineEvent = TimelineEvent & {
    isPause?: boolean;
    isInterruption?: boolean;
    isFastTrack?: boolean;
    isAttachment?: boolean;
};

export type PaletteSpec = {
    bg: string;
    border: string;
    icon: string;
    card: string;
    dot: string;
    title: string;
    detailsBorder: string;
    detailsText: string;
    dotGlow?: string;
};

export type TimelineVisualTheme = 'civil' | 'personal-pearl';

export const GLASS_CARD_BASE =
    'flex-1 rounded-xl bg-[#0C1220]/88 border px-3 py-2.5 mr-9 transition-colors duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.14)]';
export const PEARL_CARD_BASE =
    'flex-1 rounded-xl bg-[#16161F]/92 border px-3 py-2.5 mr-9 transition-colors duration-200 shadow-[0_4px_14px_rgba(0,0,0,0.18)]';
export const ICON_WRAP_BASE =
    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-white/[0.06] bg-white/[0.03]';
export const PEARL_ICON_WRAP_BASE =
    'w-8 h-8 rounded-md flex items-center justify-center shrink-0 border border-white/[0.14] bg-white/[0.07]';

export let activeTimelineTheme: TimelineVisualTheme = 'civil';

export function setActiveTimelineTheme(theme: TimelineVisualTheme): void {
    activeTimelineTheme = theme;
}

export const PAL_PEARL: PaletteSpec = {
    bg: 'bg-white/[0.08]',
    border: 'border border-white/[0.14]',
    icon: 'text-[#C9B89A]',
    card: 'border-white/[0.12] hover:border-white/[0.22] hover:shadow-[0_6px_20px_rgba(255,255,255,0.06)]',
    dot: 'bg-gradient-to-br from-[#FFD4DC] to-[#E8B4BC]',
    title: 'text-[#FFFEF9]',
    detailsBorder: 'border-white/[0.10]',
    detailsText: 'text-[#9894A0]',
    dotGlow: '',
};

export const PAL = {
    gold: {
        bg: 'bg-[#E6C673]/[0.1]',
        border: 'border border-[#E6C673]/30',
        icon: 'text-[#E6C673]',
        card: 'border-[#E6C673]/25 hover:border-[#E6C673]/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-[#E6C673]',
        title: 'text-[#E6C673]/95',
        detailsBorder: 'border-[#E6C673]/25',
        detailsText: 'text-white/65',
        dotGlow: '',
    },
    orange: {
        bg: 'bg-orange-500/[0.1]',
        border: 'border border-orange-500/30',
        icon: 'text-orange-300',
        card: 'border-orange-500/25 hover:border-orange-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-orange-400',
        title: 'text-orange-100/95',
        detailsBorder: 'border-orange-500/30',
        detailsText: 'text-orange-100/70',
        dotGlow: '',
    },
    amber: {
        bg: 'bg-amber-500/[0.1]',
        border: 'border border-amber-500/30',
        icon: 'text-amber-300',
        card: 'border-amber-500/25 hover:border-amber-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-amber-400',
        title: 'text-amber-100/95',
        detailsBorder: 'border-amber-500/30',
        detailsText: 'text-amber-100/70',
        dotGlow: '',
    },
    red: {
        bg: 'bg-red-500/[0.1]',
        border: 'border border-red-500/30',
        icon: 'text-red-300',
        card: 'border-red-500/25 hover:border-red-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-red-400',
        title: 'text-red-100/95',
        detailsBorder: 'border-red-500/30',
        detailsText: 'text-red-100/70',
        dotGlow: '',
    },
    rose: {
        bg: 'bg-rose-500/[0.1]',
        border: 'border border-rose-500/30',
        icon: 'text-rose-300',
        card: 'border-rose-500/25 hover:border-rose-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-rose-400',
        title: 'text-rose-100/95',
        detailsBorder: 'border-rose-500/30',
        detailsText: 'text-rose-100/70',
        dotGlow: '',
    },
    pink: {
        bg: 'bg-pink-500/[0.1]',
        border: 'border border-pink-500/30',
        icon: 'text-pink-300',
        card: 'border-pink-500/25 hover:border-pink-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-pink-400',
        title: 'text-pink-100/95',
        detailsBorder: 'border-pink-500/30',
        detailsText: 'text-pink-100/70',
        dotGlow: '',
    },
    fuchsia: {
        bg: 'bg-fuchsia-500/[0.1]',
        border: 'border border-fuchsia-500/30',
        icon: 'text-fuchsia-300',
        card: 'border-fuchsia-500/25 hover:border-fuchsia-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-fuchsia-400',
        title: 'text-fuchsia-100/95',
        detailsBorder: 'border-fuchsia-500/30',
        detailsText: 'text-fuchsia-100/70',
        dotGlow: '',
    },
    purple: {
        bg: 'bg-purple-500/[0.1]',
        border: 'border border-purple-500/30',
        icon: 'text-purple-300',
        card: 'border-purple-500/25 hover:border-purple-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-purple-400',
        title: 'text-purple-100/95',
        detailsBorder: 'border-purple-500/30',
        detailsText: 'text-purple-100/70',
        dotGlow: '',
    },
    violet: {
        bg: 'bg-violet-500/[0.1]',
        border: 'border border-violet-500/30',
        icon: 'text-violet-300',
        card: 'border-violet-500/25 hover:border-violet-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-violet-400',
        title: 'text-violet-100/95',
        detailsBorder: 'border-violet-500/30',
        detailsText: 'text-violet-100/70',
        dotGlow: '',
    },
    indigo: {
        bg: 'bg-indigo-500/[0.1]',
        border: 'border border-indigo-500/30',
        icon: 'text-indigo-300',
        card: 'border-indigo-500/25 hover:border-indigo-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-indigo-400',
        title: 'text-indigo-100/95',
        detailsBorder: 'border-indigo-500/30',
        detailsText: 'text-indigo-100/70',
        dotGlow: '',
    },
    blue: {
        bg: 'bg-blue-500/[0.1]',
        border: 'border border-blue-500/30',
        icon: 'text-blue-300',
        card: 'border-blue-500/25 hover:border-blue-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-blue-400',
        title: 'text-blue-100/95',
        detailsBorder: 'border-blue-500/30',
        detailsText: 'text-blue-100/70',
        dotGlow: '',
    },
    sky: {
        bg: 'bg-sky-500/[0.1]',
        border: 'border border-sky-500/30',
        icon: 'text-sky-300',
        card: 'border-sky-500/25 hover:border-sky-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-sky-400',
        title: 'text-sky-100/95',
        detailsBorder: 'border-sky-500/30',
        detailsText: 'text-sky-100/70',
        dotGlow: '',
    },
    cyan: {
        bg: 'bg-cyan-500/[0.1]',
        border: 'border border-cyan-500/30',
        icon: 'text-cyan-300',
        card: 'border-cyan-500/25 hover:border-cyan-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-cyan-400',
        title: 'text-cyan-100/95',
        detailsBorder: 'border-cyan-500/30',
        detailsText: 'text-cyan-100/70',
        dotGlow: '',
    },
    teal: {
        bg: 'bg-teal-500/[0.1]',
        border: 'border border-teal-500/30',
        icon: 'text-teal-300',
        card: 'border-teal-500/25 hover:border-teal-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-teal-400',
        title: 'text-teal-100/95',
        detailsBorder: 'border-teal-500/30',
        detailsText: 'text-teal-100/70',
        dotGlow: '',
    },
    emerald: {
        bg: 'bg-emerald-500/[0.1]',
        border: 'border border-emerald-500/30',
        icon: 'text-emerald-300',
        card: 'border-emerald-500/25 hover:border-emerald-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-emerald-400',
        title: 'text-emerald-100/95',
        detailsBorder: 'border-emerald-500/30',
        detailsText: 'text-emerald-100/70',
        dotGlow: '',
    },
    lime: {
        bg: 'bg-lime-500/[0.1]',
        border: 'border border-lime-500/30',
        icon: 'text-lime-300',
        card: 'border-lime-500/25 hover:border-lime-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-lime-400',
        title: 'text-lime-100/95',
        detailsBorder: 'border-lime-500/30',
        detailsText: 'text-lime-100/70',
        dotGlow: '',
    },
    yellow: {
        bg: 'bg-yellow-500/[0.1]',
        border: 'border border-yellow-500/30',
        icon: 'text-yellow-300',
        card: 'border-yellow-500/25 hover:border-yellow-400/45 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-yellow-400',
        title: 'text-yellow-100/95',
        detailsBorder: 'border-yellow-500/30',
        detailsText: 'text-yellow-100/70',
        dotGlow: '',
    },
    slate: {
        bg: 'bg-slate-500/[0.08]',
        border: 'border border-slate-400/25',
        icon: 'text-slate-300',
        card: 'border-slate-500/20 hover:border-slate-400/35 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
        dot: 'bg-slate-400',
        title: 'text-slate-100/95',
        detailsBorder: 'border-slate-500/25',
        detailsText: 'text-slate-100/65',
        dotGlow: '',
    },
} satisfies Record<string, PaletteSpec>;

export function pearlPalette(p: PaletteSpec): PaletteSpec {
    if (p === PAL.gold) return PAL_PEARL;
    return p;
}

export function paletteVisual(Icon: LucideIcon, p: PaletteSpec): TimelineVisual {
    const isPearl = activeTimelineTheme === 'personal-pearl';
    const spec = isPearl ? pearlPalette(p) : p;
    const cardBase = isPearl ? PEARL_CARD_BASE : GLASS_CARD_BASE;
    const iconWrapBase = isPearl ? PEARL_ICON_WRAP_BASE : ICON_WRAP_BASE;
    const dotOutline = isPearl ? 'outline-[#101018]' : 'outline-[#0F121E]';
    return {
        Icon,
        iconWrap: `${iconWrapBase} ${spec.bg} ${spec.border}`,
        iconColor: spec.icon,
        card: `${cardBase} ${spec.card}`,
        dot: `absolute right-[11px] top-6 w-2.5 h-2.5 rounded-full ${spec.dot} outline outline-2 ${dotOutline} z-10 group-hover:scale-110 ${spec.dotGlow ?? ''}`,
        title: spec.title,
        detailsBorder: spec.detailsBorder,
        detailsText: spec.detailsText,
    };
}
