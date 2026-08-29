import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';
import { TAB_META } from '@/app/components/lawyer/NotificationPanel/constants';

export type NotificationPanelBodyView = 'loading' | 'empty' | 'list';

/** مصدر حقيقة واحد لحالة جسم التبويب — يمنع تراكب empty/loading/list. */
export function resolveNotificationPanelBodyView(params: {
    displayListLoading: boolean;
    visibleCount: number;
}): NotificationPanelBodyView {
    if (params.displayListLoading) return 'loading';
    if (params.visibleCount === 0) return 'empty';
    return 'list';
}

/** رسالة الفراغ من TAB_META فقط — لا سلسلة مكرّرة هنا. */
export function notificationPanelEmptyMessage(tab: NotificationTab): string {
    return TAB_META[tab].emptyMessage;
}
