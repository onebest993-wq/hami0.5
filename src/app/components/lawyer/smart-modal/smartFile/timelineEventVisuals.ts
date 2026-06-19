import {
    Calendar,
    Paperclip,
    FileText,
    Scale,
    PauseCircle,
    ArrowLeftRight,
    RefreshCw,
    GitMerge,
    Megaphone,
    Lock,
    Zap,
    AlertOctagon,
    Archive,
    Gavel,
    UserMinus,
    Briefcase,
    ScrollText,
    Mail,
    Link2,
    Users,
    UserCheck,
    UserX,
    GitBranch,
    Bell,
    Banknote,
    ShieldAlert,
    Search as SearchIcon,
    ClipboardList,
    HandCoins,
    type LucideIcon,
} from 'lucide-react';
import type { TimelineEvent } from '../../LawyerShared';
import { isSessionTimelineEvent } from './sessionRecordEngine';

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

type ExtendedTimelineEvent = TimelineEvent & {
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

const GLASS_CARD_BASE =
    'flex-1 rounded-2xl backdrop-blur-xl bg-[#0A0F1C]/55 border px-3.5 py-3 mr-11 transition-all duration-300 shadow-[0_6px_28px_rgba(0,0,0,0.32)]';
const PEARL_CARD_BASE =
    'flex-1 rounded-xl bg-gradient-to-br from-white/[0.10] to-[#F8F6F0]/[0.05] backdrop-blur-md border px-3 py-2.5 mr-9 transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.12)]';
const ICON_WRAP_BASE =
    'w-9 h-9 rounded-lg backdrop-blur-md flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
const PEARL_ICON_WRAP_BASE =
    'w-8 h-8 rounded-md flex items-center justify-center shrink-0 border border-white/[0.14] bg-white/[0.07]';

export type TimelineVisualTheme = 'civil' | 'personal-pearl';

let activeTimelineTheme: TimelineVisualTheme = 'civil';

const PAL_PEARL: PaletteSpec = {
    bg: 'bg-white/[0.08]',
    border: 'border border-white/[0.14]',
    icon: 'text-[#C9B89A]',
    card: 'border-white/[0.12] hover:border-white/[0.22] hover:shadow-[0_6px_20px_rgba(255,255,255,0.06)]',
    dot: 'bg-gradient-to-br from-[#FFD4DC] to-[#E8B4BC] shadow-[0_0_10px_rgba(240,168,180,0.40)]',
    title: 'text-[#FFFEF9]',
    detailsBorder: 'border-white/[0.10]',
    detailsText: 'text-[#9894A0]',
    dotGlow: 'group-hover:shadow-[0_0_14px_rgba(240,168,180,0.55)]',
};

function pearlPalette(p: PaletteSpec): PaletteSpec {
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
        dot: `absolute right-[11px] top-6 w-3 h-3 rounded-full ${spec.dot} outline outline-4 ${dotOutline} z-10 group-hover:scale-125 ${spec.dotGlow ?? ''}`,
        title: spec.title,
        detailsBorder: spec.detailsBorder,
        detailsText: spec.detailsText,
    };
}

export const PAL = {
    gold: {
        bg: 'bg-[#E6C673]/[0.1]',
        border: 'border border-[#E6C673]/30',
        icon: 'text-[#E6C673]',
        card: 'border-[#E6C673]/25 hover:border-[#E6C673]/45 hover:shadow-[0_12px_48px_rgba(230,198,115,0.14)]',
        dot: 'bg-[#E6C673]',
        title: 'text-[#E6C673]/95',
        detailsBorder: 'border-[#E6C673]/25',
        detailsText: 'text-white/65',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(230,198,115,0.65)]',
    },
    orange: {
        bg: 'bg-orange-500/[0.1]',
        border: 'border border-orange-500/30',
        icon: 'text-orange-300',
        card: 'border-orange-500/25 hover:border-orange-400/45 hover:shadow-[0_12px_48px_rgba(249,115,22,0.14)]',
        dot: 'bg-orange-400',
        title: 'text-orange-100/95',
        detailsBorder: 'border-orange-500/30',
        detailsText: 'text-orange-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(249,115,22,0.65)]',
    },
    amber: {
        bg: 'bg-amber-500/[0.1]',
        border: 'border border-amber-500/30',
        icon: 'text-amber-300',
        card: 'border-amber-500/25 hover:border-amber-400/45 hover:shadow-[0_12px_48px_rgba(245,158,11,0.14)]',
        dot: 'bg-amber-400',
        title: 'text-amber-100/95',
        detailsBorder: 'border-amber-500/30',
        detailsText: 'text-amber-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(245,158,11,0.65)]',
    },
    red: {
        bg: 'bg-red-500/[0.1]',
        border: 'border border-red-500/30',
        icon: 'text-red-300',
        card: 'border-red-500/25 hover:border-red-400/45 hover:shadow-[0_12px_48px_rgba(239,68,68,0.14)]',
        dot: 'bg-red-400',
        title: 'text-red-100/95',
        detailsBorder: 'border-red-500/30',
        detailsText: 'text-red-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(239,68,68,0.65)]',
    },
    rose: {
        bg: 'bg-rose-500/[0.1]',
        border: 'border border-rose-500/30',
        icon: 'text-rose-300',
        card: 'border-rose-500/25 hover:border-rose-400/45 hover:shadow-[0_12px_48px_rgba(244,63,94,0.14)]',
        dot: 'bg-rose-400',
        title: 'text-rose-100/95',
        detailsBorder: 'border-rose-500/30',
        detailsText: 'text-rose-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(244,63,94,0.65)]',
    },
    pink: {
        bg: 'bg-pink-500/[0.1]',
        border: 'border border-pink-500/30',
        icon: 'text-pink-300',
        card: 'border-pink-500/25 hover:border-pink-400/45 hover:shadow-[0_12px_48px_rgba(236,72,153,0.14)]',
        dot: 'bg-pink-400',
        title: 'text-pink-100/95',
        detailsBorder: 'border-pink-500/30',
        detailsText: 'text-pink-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(236,72,153,0.65)]',
    },
    fuchsia: {
        bg: 'bg-fuchsia-500/[0.1]',
        border: 'border border-fuchsia-500/30',
        icon: 'text-fuchsia-300',
        card: 'border-fuchsia-500/25 hover:border-fuchsia-400/45 hover:shadow-[0_12px_48px_rgba(217,70,239,0.14)]',
        dot: 'bg-fuchsia-400',
        title: 'text-fuchsia-100/95',
        detailsBorder: 'border-fuchsia-500/30',
        detailsText: 'text-fuchsia-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(217,70,239,0.65)]',
    },
    purple: {
        bg: 'bg-purple-500/[0.1]',
        border: 'border border-purple-500/30',
        icon: 'text-purple-300',
        card: 'border-purple-500/25 hover:border-purple-400/45 hover:shadow-[0_12px_48px_rgba(168,85,247,0.14)]',
        dot: 'bg-purple-400',
        title: 'text-purple-100/95',
        detailsBorder: 'border-purple-500/30',
        detailsText: 'text-purple-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(168,85,247,0.65)]',
    },
    violet: {
        bg: 'bg-violet-500/[0.1]',
        border: 'border border-violet-500/30',
        icon: 'text-violet-300',
        card: 'border-violet-500/25 hover:border-violet-400/45 hover:shadow-[0_12px_48px_rgba(139,92,246,0.14)]',
        dot: 'bg-violet-400',
        title: 'text-violet-100/95',
        detailsBorder: 'border-violet-500/30',
        detailsText: 'text-violet-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(139,92,246,0.65)]',
    },
    indigo: {
        bg: 'bg-indigo-500/[0.1]',
        border: 'border border-indigo-500/30',
        icon: 'text-indigo-300',
        card: 'border-indigo-500/25 hover:border-indigo-400/45 hover:shadow-[0_12px_48px_rgba(99,102,241,0.14)]',
        dot: 'bg-indigo-400',
        title: 'text-indigo-100/95',
        detailsBorder: 'border-indigo-500/30',
        detailsText: 'text-indigo-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(99,102,241,0.65)]',
    },
    blue: {
        bg: 'bg-blue-500/[0.1]',
        border: 'border border-blue-500/30',
        icon: 'text-blue-300',
        card: 'border-blue-500/25 hover:border-blue-400/45 hover:shadow-[0_12px_48px_rgba(59,130,246,0.14)]',
        dot: 'bg-blue-400',
        title: 'text-blue-100/95',
        detailsBorder: 'border-blue-500/30',
        detailsText: 'text-blue-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(59,130,246,0.65)]',
    },
    sky: {
        bg: 'bg-sky-500/[0.1]',
        border: 'border border-sky-500/30',
        icon: 'text-sky-300',
        card: 'border-sky-500/25 hover:border-sky-400/45 hover:shadow-[0_12px_48px_rgba(56,189,248,0.14)]',
        dot: 'bg-sky-400',
        title: 'text-sky-100/95',
        detailsBorder: 'border-sky-500/30',
        detailsText: 'text-sky-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(56,189,248,0.65)]',
    },
    cyan: {
        bg: 'bg-cyan-500/[0.1]',
        border: 'border border-cyan-500/30',
        icon: 'text-cyan-300',
        card: 'border-cyan-500/25 hover:border-cyan-400/45 hover:shadow-[0_12px_48px_rgba(34,211,238,0.14)]',
        dot: 'bg-cyan-400',
        title: 'text-cyan-100/95',
        detailsBorder: 'border-cyan-500/30',
        detailsText: 'text-cyan-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(34,211,238,0.65)]',
    },
    teal: {
        bg: 'bg-teal-500/[0.1]',
        border: 'border border-teal-500/30',
        icon: 'text-teal-300',
        card: 'border-teal-500/25 hover:border-teal-400/45 hover:shadow-[0_12px_48px_rgba(20,184,166,0.14)]',
        dot: 'bg-teal-400',
        title: 'text-teal-100/95',
        detailsBorder: 'border-teal-500/30',
        detailsText: 'text-teal-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(20,184,166,0.65)]',
    },
    emerald: {
        bg: 'bg-emerald-500/[0.1]',
        border: 'border border-emerald-500/30',
        icon: 'text-emerald-300',
        card: 'border-emerald-500/25 hover:border-emerald-400/45 hover:shadow-[0_12px_48px_rgba(16,185,129,0.14)]',
        dot: 'bg-emerald-400',
        title: 'text-emerald-100/95',
        detailsBorder: 'border-emerald-500/30',
        detailsText: 'text-emerald-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(16,185,129,0.65)]',
    },
    lime: {
        bg: 'bg-lime-500/[0.1]',
        border: 'border border-lime-500/30',
        icon: 'text-lime-300',
        card: 'border-lime-500/25 hover:border-lime-400/45 hover:shadow-[0_12px_48px_rgba(132,204,22,0.14)]',
        dot: 'bg-lime-400',
        title: 'text-lime-100/95',
        detailsBorder: 'border-lime-500/30',
        detailsText: 'text-lime-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(132,204,22,0.65)]',
    },
    yellow: {
        bg: 'bg-yellow-500/[0.1]',
        border: 'border border-yellow-500/30',
        icon: 'text-yellow-300',
        card: 'border-yellow-500/25 hover:border-yellow-400/45 hover:shadow-[0_12px_48px_rgba(234,179,8,0.14)]',
        dot: 'bg-yellow-400',
        title: 'text-yellow-100/95',
        detailsBorder: 'border-yellow-500/30',
        detailsText: 'text-yellow-100/70',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(234,179,8,0.65)]',
    },
    slate: {
        bg: 'bg-slate-500/[0.08]',
        border: 'border border-slate-400/25',
        icon: 'text-slate-300',
        card: 'border-slate-500/20 hover:border-slate-400/35 hover:shadow-[0_12px_48px_rgba(148,163,184,0.1)]',
        dot: 'bg-slate-400',
        title: 'text-slate-100/95',
        detailsBorder: 'border-slate-500/25',
        detailsText: 'text-slate-100/65',
        dotGlow: 'group-hover:shadow-[0_0_12px_rgba(148,163,184,0.5)]',
    },
} satisfies Record<string, PaletteSpec>;

function eventTagBlob(event: TimelineEvent): string {
    if (!Array.isArray(event.tags)) return '';
    return event.tags.map((t) => String(t)).join(' ');
}

function hasTag(event: TimelineEvent, fragment: string): boolean {
    const blob = eventTagBlob(event);
    const needle = fragment.replace(/^#/, '');
    return blob.includes(needle) || blob.includes(`#${needle}`);
}

function firstMatchingTag(event: TimelineEvent, rules: Array<[string, () => TimelineVisual]>): TimelineVisual | null {
    for (const [tag, visual] of rules) {
        if (hasTag(event, tag)) return visual();
    }
    return null;
}

function resolveByTags(event: TimelineEvent, title: string): TimelineVisual | null {
    const byTag = firstMatchingTag(event, [
        ['رفض_الدخول', () => paletteVisual(UserX, PAL.pink)],
        ['قبول_الدخول', () => paletteVisual(UserCheck, PAL.emerald)],
        ['نتيجة_الطعن', () => paletteVisual(Gavel, PAL.purple)],
        ['تقديم_اللائحة', () => paletteVisual(ClipboardList, PAL.violet)],
        ['طعن_تمييزي', () => paletteVisual(Scale, PAL.purple)],
        ['طعن_استثنائي', () => paletteVisual(Scale, PAL.fuchsia)],
        ['نتيجة_مرتبطة', () => paletteVisual(Gavel, PAL.emerald)],
        ['محسومة', () => paletteVisual(Archive, PAL.lime)],
        ['مردودة', () => paletteVisual(Archive, PAL.rose)],
        ['دعوى_منضمة', () => paletteVisual(GitBranch, PAL.lime)],
        ['دعوى_متقابلة', () => paletteVisual(ArrowLeftRight, PAL.orange)],
        ['شخص_ثالث', () => paletteVisual(Users, PAL.cyan)],
        ['طلب_عارض', () => paletteVisual(Zap, PAL.yellow)],
        ['وقف_اتفاقي', () => paletteVisual(PauseCircle, PAL.blue)],
        ['غياب', () => paletteVisual(AlertOctagon, PAL.rose)],
        ['عوارض_الخصومة', () => paletteVisual(AlertOctagon, PAL.yellow)],
        ['توحيد_دعاوى', () => paletteVisual(GitMerge, PAL.cyan)],
        ['ربط_دعوى', () => paletteVisual(Link2, PAL.indigo)],
        ['مخاطبة', () => paletteVisual(Mail, PAL.orange)],
        ['شهود', () => paletteVisual(Users, PAL.orange)],
        ['خبير', () => paletteVisual(SearchIcon, PAL.teal)],
        ['يمين', () => paletteVisual(Scale, PAL.violet)],
        ['سندات', () => paletteVisual(Paperclip, PAL.emerald)],
        ['استئخار', () => paletteVisual(PauseCircle, PAL.amber)],
    ]);
    if (byTag) return byTag;

    if (hasTag(event, 'دعوى_حادثة')) {
        return paletteVisual(Zap, PAL.yellow);
    }

    if (/مخاطبة/i.test(title)) return paletteVisual(Mail, PAL.orange);
    if (/ربط\s*(مرجعي|دعوى)|توحيد\s*مرجعي/i.test(title)) return paletteVisual(Link2, PAL.indigo);
    if (/توحيد/i.test(title)) return paletteVisual(GitMerge, PAL.cyan);

    return null;
}

function resolveByTitle(title: string): TimelineVisual | null {
    const rules: Array<[RegExp, () => TimelineVisual]> = [
        [/محضر\s*الجلسة|محضر\s*جلسة/i, () => paletteVisual(ScrollText, PAL.blue)],
        [/ختام\s*المرافعة/i, () => paletteVisual(Gavel, PAL.gold)],
        [/حكم\s*بـ|حكم\s*نهائي|قرار\s*قضائي|تصديق\s*الحكم|نقض\s*الحكم|الدرجة\s*القطعية/i, () => paletteVisual(Gavel, PAL.gold)],
        [/طعن\s*تمييزي|لائحة\s*الطعن\s*التمييزي|نتيجة\s*الطعن/i, () => paletteVisual(Scale, PAL.purple)],
        [/اعتراض\s*الغير|طعن\s*استثنائي|طعن\s*غير\s*عادي/i, () => paletteVisual(Scale, PAL.fuchsia)],
        [/قرار\s*إعدادي|طعن.*مادة\s*216/i, () => paletteVisual(Gavel, PAL.yellow)],
        [/استئناف|لائحة\s*استئناف/i, () => paletteVisual(Scale, PAL.violet)],
        [/طعن\s*من\s*الخصم/i, () => paletteVisual(ShieldAlert, PAL.rose)],
        [/رد\s*القاضي|مجمدة/i, () => paletteVisual(UserMinus, PAL.rose)],
        [/انقطاع\s*السير/i, () => paletteVisual(AlertOctagon, PAL.rose)],
        [/استئخار|استئناف\s*السير\s*في\s*الدعوى/i, () => paletteVisual(PauseCircle, PAL.amber)],
        [/إحالة.*عدم.*اختصاص|إحالة\s*الدعوى/i, () => paletteVisual(ArrowLeftRight, PAL.violet)],
        [/حجز\s*احتياطي|رادار\s*الحجز|مقصلة\s*الـ\s*8|يبطل\s*الحجز|التظلم.*الحجز/i, () => paletteVisual(Lock, PAL.red)],
        [/قرار\s*ولائي|قضاء\s*مستعجل|إجراء\s*مستعجل/i, () => paletteVisual(Zap, PAL.amber)],
        [/تبليغ|إخبار|متابعة\s*تبليغ/i, () => paletteVisual(Megaphone, PAL.sky)],
        [/اعتراض\s*غيابي|ترك\s*الحكم\s*الغيابي/i, () => paletteVisual(AlertOctagon, PAL.yellow)],
        [/ترك.*للمراجعة|الوقف\s*الاتفاقي/i, () => paletteVisual(Archive, PAL.slate)],
        [/إبطال|بطلان/i, () => paletteVisual(AlertOctagon, PAL.red)],
        [/تجديد\s*الدعوى|إعادة\s*المحاكمة/i, () => paletteVisual(RefreshCw, PAL.emerald)],
        [/عزل|تنحي|انتهى\s*التمثيل|وكيل|وكالة/i, () => paletteVisual(UserMinus, PAL.rose)],
        [/تنفيذ|إحالة.*مديرية/i, () => paletteVisual(Briefcase, PAL.emerald)],
        [/دفعة\s*مالية|تسديد\s*أمانة|تسديد\s*نفقات/i, () => paletteVisual(Banknote, PAL.emerald)],
        [/دخول\s*شخص\s*ثالث|رفض\s*دخول/i, () => paletteVisual(Users, PAL.cyan)],
        [/دعوى\s*منضمة|دعوى\s*متقابلة|حسم\s*دعوى/i, () => paletteVisual(GitBranch, PAL.lime)],
        [/تصحيح\s*قرار\s*تمييزي/i, () => paletteVisual(ClipboardList, PAL.indigo)],
        [/تحذير|انتبه|تذكير/i, () => paletteVisual(Bell, PAL.amber)],
    ];

    for (const [re, visual] of rules) {
        if (re.test(title)) return visual();
    }
    return null;
}

function resolveByEventType(event: TimelineEvent): TimelineVisual | null {
    switch (event.type) {
        case 'alert':
        case 'action':
            return null;
        case 'milestone':
            return paletteVisual(Megaphone, PAL.slate);
        case 'expert':
            return paletteVisual(SearchIcon, PAL.teal);
        case 'appointment':
            switch (event.subType) {
                case 'pleading':
                    return paletteVisual(Calendar, PAL.blue);
                case 'investigation':
                    return paletteVisual(SearchIcon, PAL.teal);
                case 'witness':
                    return paletteVisual(Users, PAL.orange);
                case 'verdict':
                    return paletteVisual(Gavel, PAL.gold);
                default:
                    return paletteVisual(Calendar, PAL.indigo);
            }
        case 'document':
            switch (event.docCategory) {
                case 'agency':
                    return paletteVisual(Paperclip, PAL.indigo);
                case 'regulations':
                    return paletteVisual(ScrollText, PAL.violet);
                case 'identity':
                    return paletteVisual(FileText, PAL.sky);
                case 'evidence':
                    return paletteVisual(Paperclip, PAL.emerald);
                case 'decision':
                    return paletteVisual(Gavel, PAL.gold);
                default:
                    return paletteVisual(Paperclip, PAL.purple);
            }
        case 'note':
            return paletteVisual(ScrollText, PAL.amber);
        case 'decision':
            return paletteVisual(FileText, PAL.slate);
        default:
            return null;
    }
}

export function resolveTimelineVisual(
    event: TimelineEvent,
    ext: ExtendedTimelineEvent = event as ExtendedTimelineEvent,
    theme: TimelineVisualTheme = 'civil',
): TimelineVisual {
    activeTimelineTheme = theme;
    const title = event.title || '';

    if (isSessionTimelineEvent(event)) {
        return paletteVisual(ScrollText, PAL.blue);
    }

    if (ext.isPause || title.includes('استئخار')) {
        return paletteVisual(PauseCircle, PAL.amber);
    }
    if (ext.isInterruption || title.includes('انقطاع')) {
        return paletteVisual(AlertOctagon, PAL.rose);
    }
    if (ext.isAttachment) {
        return paletteVisual(Lock, PAL.red);
    }
    if (ext.isFastTrack) {
        return paletteVisual(ClipboardList, PAL.gold);
    }
    if (event.type === 'expert' || ext.color === 'teal' || event.color === 'teal') {
        return paletteVisual(SearchIcon, PAL.teal);
    }

    const tagged = resolveByTags(event, title);
    if (tagged) return tagged;

    if (event.type === 'alert') {
        return paletteVisual(ShieldAlert, PAL.red);
    }
    if (event.type === 'action') {
        return paletteVisual(HandCoins, PAL.orange);
    }

    const byTitle = resolveByTitle(title);
    if (byTitle) return byTitle;

    const byType = resolveByEventType(event);
    if (byType) return byType;

    return paletteVisual(FileText, PAL.slate);
}
