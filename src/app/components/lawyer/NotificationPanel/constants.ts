import {
    AtSign,
    BadgeCheck,
    MessageCircle,
    FileText,
    Sparkles,
    Settings,
    AlertTriangle,
    type LucideIcon,
} from '@/app/components/ui/lucideIcons';
import type { NotificationTab, TimeBucket } from '@/app/components/lawyer/NotificationPanel/types';

export type CategoryThemeKey = 'forum' | 'system' | 'document' | 'ai';

export type CategoryTheme = {
    label: string;
    icon: LucideIcon;
    tone: { text: string; bg: string; ring: string };
};

export const CATEGORY_THEMES: Record<CategoryThemeKey, CategoryTheme> = {
    forum: {
        label: 'المنتدى',
        icon: MessageCircle,
        tone: { text: 'text-violet-300', bg: 'bg-violet-500/10', ring: 'ring-violet-500/30' },
    },
    document: {
        label: 'مستندات',
        icon: FileText,
        tone: { text: 'text-amber-300', bg: 'bg-amber-500/10', ring: 'ring-amber-500/30' },
    },
    ai: {
        label: 'تنبيه',
        icon: Sparkles,
        tone: { text: 'text-amber-300', bg: 'bg-amber-500/10', ring: 'ring-amber-500/30' },
    },
    system: {
        label: 'النظام',
        icon: Settings,
        tone: { text: 'text-white/70', bg: 'bg-white/5', ring: 'ring-white/10' },
    },
};

export const BUCKET_LABELS: Record<TimeBucket, string> = {
    today: 'اليوم',
    yesterday: 'الأمس',
    older: 'أقدم',
};

export const TAB_META: Record<
    NotificationTab,
    { label: string; icon: LucideIcon; emptyMessage: string }
> = {
    forum: {
        label: 'المنتدى',
        icon: MessageCircle,
        emptyMessage: 'لا إشعارات منتدى حالياً',
    },
    system: {
        label: 'النظام',
        icon: Settings,
        emptyMessage: 'لا إشعارات نظام حالياً',
    },
};

export const TYPE_ICON_MAP: Partial<Record<string, LucideIcon>> = {
    forum_mention: AtSign,
    forum_solved: BadgeCheck,
    forum_reply: MessageCircle,
    new_document: FileText,
    ai_insight: Sparkles,
    system_alert: Settings,
    deadline: AlertTriangle,
};
