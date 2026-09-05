import { MessageCircle } from '@/app/components/ui/icons/MessageCircle';
import { FileText } from '@/app/components/ui/icons/FileText';
import { Sparkles } from '@/app/components/ui/icons/Sparkles';
import { Settings } from '@/app/components/ui/icons/Settings';
import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import type { NotificationTab, TimeBucket } from '@/app/components/lawyer/NotificationPanel/types';

export type CategoryTheme = {
    icon: LucideIcon;
    tone: { text: string; bg: string };
};

type CategoryThemeKey = 'forum' | 'system' | 'document' | 'ai';

export const CATEGORY_THEMES: Record<CategoryThemeKey, CategoryTheme> = {
    forum: {
        icon: MessageCircle,
        tone: { text: 'text-violet-300', bg: 'bg-violet-500/10' },
    },
    document: {
        icon: FileText,
        tone: { text: 'text-amber-300', bg: 'bg-amber-500/10' },
    },
    ai: {
        icon: Sparkles,
        tone: { text: 'text-amber-300', bg: 'bg-amber-500/10' },
    },
    system: {
        icon: Settings,
        tone: { text: 'text-white/70', bg: 'bg-white/5' },
    },
};

export const BUCKET_LABELS: Record<TimeBucket, string> = {
    today: 'اليوم',
    yesterday: 'الأمس',
    older: 'أقدم',
};

export const TAB_META: Record<NotificationTab, { label: string; emptyMessage: string }> = {
    forum: {
        label: 'المنتدى',
        emptyMessage: 'لا إشعارات منتدى حالياً',
    },
    system: {
        label: 'النظام',
        emptyMessage: 'لا إشعارات نظام حالياً',
    },
};
