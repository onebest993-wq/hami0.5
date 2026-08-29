import { Calendar } from '@/app/components/ui/icons/Calendar';
import { Paperclip } from '@/app/components/ui/icons/Paperclip';
import { FileText } from '@/app/components/ui/icons/FileText';
import { Scale } from '@/app/components/ui/icons/Scale';
import { PauseCircle } from '@/app/components/ui/icons/PauseCircle';
import { ArrowLeftRight } from '@/app/components/ui/icons/ArrowLeftRight';
import { RefreshCw } from '@/app/components/ui/icons/RefreshCw';
import { GitMerge } from '@/app/components/ui/icons/GitMerge';
import { Megaphone } from '@/app/components/ui/icons/Megaphone';
import { Lock } from '@/app/components/ui/icons/Lock';
import { Zap } from '@/app/components/ui/icons/Zap';
import { AlertOctagon } from '@/app/components/ui/icons/AlertOctagon';
import { Archive } from '@/app/components/ui/icons/Archive';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { UserMinus } from '@/app/components/ui/icons/UserMinus';
import { Briefcase } from '@/app/components/ui/icons/Briefcase';
import { ScrollText } from '@/app/components/ui/icons/ScrollText';
import { Mail } from '@/app/components/ui/icons/Mail';
import { Link2 } from '@/app/components/ui/icons/Link2';
import { Users } from '@/app/components/ui/icons/Users';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { UserX } from '@/app/components/ui/icons/UserX';
import { GitBranch } from '@/app/components/ui/icons/GitBranch';
import { Bell } from '@/app/components/ui/icons/Bell';
import { Banknote } from '@/app/components/ui/icons/Banknote';
import { ShieldAlert } from '@/app/components/ui/icons/ShieldAlert';
import { Search as SearchIcon } from '@/app/components/ui/icons/Search';
import { ClipboardList } from '@/app/components/ui/icons/ClipboardList';
import type { TimelineEvent } from '../../LawyerShared';
import {
    PAL,
    paletteVisual,
    type TimelineVisual,
} from './timelineEventVisualPalettes';

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

export function resolveByTags(event: TimelineEvent, title: string): TimelineVisual | null {
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

export function resolveByTitle(title: string): TimelineVisual | null {
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

export function resolveByEventType(event: TimelineEvent): TimelineVisual | null {
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
