import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('notificationPanel.css android flat FX', () => {
    const android = readFileSync(
        resolve(__dirname, '../styles/notificationPanel.android.css'),
        'utf8',
    );
    const entry = readFileSync(resolve(__dirname, '../notificationPanel.css'), 'utf8');
    const sheetCards = readFileSync(
        resolve(__dirname, '../styles/notificationPanel.sheet.cards.css'),
        'utf8',
    );

    it('entry يستورد طبقات CSS بالترتيب', () => {
        expect(entry).toContain("notificationPanel.layer.css");
        expect(entry).toContain("notificationPanel.sheet.css");
        expect(entry).toContain("notificationPanel.alerts.css");
        expect(entry).toContain("notificationPanel.android.css");
    });

    it('strips blur and backdrop on Capacitor Android', () => {
        expect(android).toContain("data-hami-platform='android'");
        expect(android).toContain(":not([data-hami-platform='ios'])");
        expect(android).not.toContain('.hami-notif-fx-orb');
        expect(android).toContain('backdrop-filter: none');
        expect(android).toContain('.hami-incoming-notification-popup-card');
        expect(android).toContain('will-change: auto');
        expect(sheetCards).not.toContain('.hami-notif-empty-orb');
        expect(android).not.toContain('.hami-notif-empty-orb');
        expect(android).not.toContain('.hami-notif-header-icon');
    });
});
