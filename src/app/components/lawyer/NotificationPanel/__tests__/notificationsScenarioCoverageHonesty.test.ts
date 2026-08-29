import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('notifications scenario coverage honesty', () => {
    it('E2E يغطي الفتح والإغلاق والتبويب والوارد والمنبثق والتحكم دون تنفيذ مراسلة', () => {
        const spec = read('e2e/notifications-panel.spec.ts');
        expect(spec).toContain('تفتح اللوحة وتعرض الوارد فقط');
        expect(spec).toContain('Escape يغلق اللوحة');
        expect(spec).toContain('زر الإغلاق يغلق اللوحة');
        expect(spec).toContain('الخلفية تغلق اللوحة بعد تسليح الإغلاق');
        expect(spec).toContain('تحديد الكل كمقروء يُزيل شارة غير المقروء');
        expect(spec).toContain('تحكم التنبيهات يُفتح ويُغلق بالرجوع وEscape لا يغلق اللوحة');
        expect(spec).toContain('notification-alert-controls');
        expect(spec).toContain('notification-card-e2e-system-alert');
        expect(spec).toContain('incoming-notification-popup-dismiss');
        expect(spec).toContain('forum-overlay-host');
        expect(spec).toContain('data-hami-forum-open');
        expect(spec).toContain('data-notification-root');
        expect(spec).not.toContain('wa.me/');
        expect(spec).not.toContain('/api/comms-dispatcher');
        const fixtures = read('e2e/helpers/notificationFixtures.ts');
        expect(fixtures).toContain('notificationsHeaderTrigger');
        expect(fixtures).toContain('waitForNotificationDismissUnlocked');
        expect(fixtures).toContain('header-notifications-trigger');
        expect(fixtures).toContain('__hamiE2eSeedInbox');
        expect(fixtures).toContain('waitForNotificationInboxSeedHook');
        expect(fixtures).toContain("E2E_NOTIFICATION_USER_ID = 'guest-lawyer-1'");
        expect(fixtures).toContain('data-notification-root');
    });

    it('E2E الموبايل يغطي اللمس و44px والمقبض', () => {
        const mobile = read('e2e/notifications-mobile.spec.ts');
        expect(mobile).toContain('toBeGreaterThanOrEqual(44)');
        expect(mobile).toContain('.tap()');
        expect(mobile).toContain('notification-sheet-handle');
        expect(mobile).toContain('notification-panel-close');
        expect(mobile).toContain('notification-tab-forum');
        const runner = read('scripts/run-notifications-e2e.mjs');
        expect(runner).toContain('e2e/notifications-panel.spec.ts');
        expect(runner).toContain('e2e/notifications-mobile.spec.ts');
        const pkg = read('package.json');
        expect(pkg).toContain('test:e2e:notifications');
    });
});
