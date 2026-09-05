import { describe, expect, it, vi } from 'vitest';
import {
    highlightNotificationCard,
    NOTIFICATION_FOCUS_RETRY_MS,
} from '@/app/services/notifications/notificationPanelFocus';

describe('notificationPanelFocus highlight', () => {
    it('لا يُسقط التركيز قبل مهلة إعادة المحاولة', () => {
        expect(NOTIFICATION_FOCUS_RETRY_MS).toBeGreaterThanOrEqual(2_000);
    });

    it('يمرّر البطاقة الموجودة ولا يفعل شيئاً إن غابت', () => {
        const missing = highlightNotificationCard('no-such-card');
        expect(missing).toBe(false);

        const card = document.createElement('button');
        card.setAttribute('data-testid', 'notification-card-n-1');
        const scrollIntoView = vi.fn();
        card.scrollIntoView = scrollIntoView;
        document.body.appendChild(card);

        expect(highlightNotificationCard('n-1')).toBe(true);
        expect(scrollIntoView).toHaveBeenCalled();
        expect(card.getAttribute('data-hami-notif-focus')).toBe('true');
        card.remove();
    });
});
