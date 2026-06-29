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

export function accentBarForCategory(c: NotificationCategory): string {
    switch (c) {
        case 'forum':
            return 'bg-violet-500/70';
        case 'document':
        case 'ai':
            return 'bg-amber-500/70';
        default:
            return 'bg-white/25';
    }
}
