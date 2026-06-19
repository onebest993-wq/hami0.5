import {
    deriveNotificationCategory,
    type NotificationModel,
} from '@/app/infrastructure/NotificationRepository';
import type { CategoryTheme } from '@/app/components/lawyer/NotificationPanel/constants';
import { CATEGORY_THEMES } from '@/app/components/lawyer/NotificationPanel/constants';
import type { NotificationCategory } from '@/app/infrastructure/NotificationRepository';

export function isForumNotification(n: NotificationModel): boolean {
    return deriveNotificationCategory(n) === 'forum';
}

export function isSystemNotification(n: NotificationModel): boolean {
    const cat = deriveNotificationCategory(n);
    return cat === 'system' || cat === 'ai' || cat === 'document';
}

export function resolveNotificationTheme(n: NotificationModel): CategoryTheme {
    const cat = deriveNotificationCategory(n);
    if (cat === 'forum') return CATEGORY_THEMES.forum;
    if (cat === 'document') return CATEGORY_THEMES.document;
    if (cat === 'ai') return CATEGORY_THEMES.ai;
    return CATEGORY_THEMES.system;
}

export function borderRightForCategory(c: NotificationCategory): string {
    switch (c) {
        case 'civil':
            return 'border-r-sky-500/50';
        case 'criminal':
            return 'border-r-rose-500/50';
        case 'execution':
            return 'border-r-[#E6C673]/50';
        case 'task':
            return 'border-r-emerald-500/50';
        case 'forum':
            return 'border-r-violet-500/50';
        case 'document':
        case 'ai':
            return 'border-r-amber-500/50';
        default:
            return 'border-r-white/15';
    }
}
