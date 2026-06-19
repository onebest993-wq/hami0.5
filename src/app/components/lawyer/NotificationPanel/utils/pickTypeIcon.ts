import type { LucideIcon } from 'lucide-react';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { TYPE_ICON_MAP } from '@/app/components/lawyer/NotificationPanel/constants';

export function pickTypeIcon(n: NotificationModel): LucideIcon | null {
    return TYPE_ICON_MAP[n.type] ?? null;
}
