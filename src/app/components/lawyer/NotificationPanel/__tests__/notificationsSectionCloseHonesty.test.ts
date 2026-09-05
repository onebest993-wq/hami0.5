import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('notifications section close honesty', () => {
    it('تقرير الإغلاق الحالي موجود ولا يدّعي Playwright أو tsc أو متصفحاً حياً', () => {
        const rel = '.audit/PHASE_NOTIFICATIONS_SECTION_CLOSE.md';
        expect(existsSync(join(root, rel))).toBe(true);
        const report = read(rel);
        expect(report).toContain('لم يُشغَّل');
        expect(report).toContain('Playwright');
        expect(report).not.toContain('مثالي');
    });

    it('انحدار مزامنة المنتدى ومصالحة العضوية مقفولان', () => {
        const store = read('src/app/stores/notificationStore.ts');
        expect(store).toContain('if (!isNotificationStoreOwnerMismatch(get().currentUserId, userId))');
        expect(store).toContain('commitReadReconcileIfMembershipChanged');
        expect(store).toContain('syncShellReadToForum(userId, notificationId)');
        expect(store).not.toMatch(
            /await NotificationRepository\.markAsRead\([\s\S]{0,280}if \(isNotificationStoreOwnerMismatch\(get\(\)\.currentUserId, userId\)\) return;/,
        );

        const persist = read('src/app/stores/notificationStorePersist.ts');
        expect(persist).toContain('export function notificationListMembershipChanged');

        const index = read('src/app/components/lawyer/NotificationPanel/index.tsx');
        expect(index).toContain('isNotificationPanelListLive(isOpen, snap.present)');
        expect(index).toContain('contentArmed={listLive}');
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/NotificationPanel/__tests__/NotificationPanel.keepAliveListLive.test.tsx',
                ),
            ),
        ).toBe(true);
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/NotificationPanel/utils/notificationPanelListLive.ts',
                ),
            ),
        ).toBe(true);
    });
});
