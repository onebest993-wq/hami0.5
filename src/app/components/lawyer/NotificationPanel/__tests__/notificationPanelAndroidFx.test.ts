import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('notificationPanel.css android flat FX', () => {
    const css = readFileSync(resolve(__dirname, '../notificationPanel.css'), 'utf8');

    it('strips blur orbs and backdrop on Capacitor Android', () => {
        expect(css).toContain("data-hami-platform='android'");
        expect(css).toContain('.hami-notif-fx-orb');
        expect(css).toContain('backdrop-filter: none');
        expect(css).toContain('.hami-notif-empty-orb');
    });
});
