import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('notifications remaining completion honesty', () => {
    it('القائمة تُسلَّح مع حضور الستارة دون شجرة دافئة وهي مغلقة بالكامل', () => {
        const index = read('src/app/components/lawyer/NotificationPanel/index.tsx');
        expect(index).toContain('isNotificationPanelListLive(isOpen, snap.present)');
        expect(index).toContain('useNotificationPanel(isOpen, userId, onClose, onNavigate, listLive)');
        expect(index).toContain('contentArmed={listLive}');
        expect(index).not.toContain('contentArmed={isOpen}');

        const hook = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanel.ts',
        );
        expect(hook).toContain('listLive = isOpen');
        expect(hook).toContain('listLive ? groupNotificationsByTime');
        expect(hook).toContain('useIncomingCaseShares(userId, isOpen)');
        expect(hook).toContain('useNotificationPolling(isOpen, userId)');
    });

    it('المتجر يصالح القراءة بعد الحفظ ولا يكتب قرص مستخدم بعد التبديل', () => {
        const store = read('src/app/stores/notificationStore.ts');
        expect(store).toContain('commitReadReconcileIfMembershipChanged');
        expect(store).toContain('persistLiveListIfSameUser');
        expect(store).toContain('isNotificationStoreOwnerMismatch');
        expect(store).toContain('applyKeptReadFlags');
        expect(store).toContain('if (!isNotificationStoreOwnerMismatch(get().currentUserId, userId))');
        expect(store).toContain('syncShellReadToForum(userId, notificationId)');

        const persist = read('src/app/stores/notificationStorePersist.ts');
        expect(persist).toContain('if (state.currentUserId !== userId) return');
        expect(persist).toContain('notificationListMembershipChanged');

        const list = read('src/app/stores/notificationStoreList.ts');
        expect(list).toContain('export function applyKeptReadFlags');
    });

    it('لوحة الإشعارات تتجاهل مهلة منتقي المهام، والقشرة الفورية من ثوابت مشتركة', () => {
        const chrome = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelChrome.ts',
        );
        expect(chrome).toContain('ignoreTasksDatePickerGrace: true');

        const keyboard = read('src/app/hooks/useMobileKeyboardInset.ts');
        expect(keyboard).toContain('ignoreTasksDatePickerGrace');
        expect(keyboard).toContain(
            'if (!ignoreTasksDatePickerGrace && isTasksDatePickerGraceActive()) return',
        );

        const constants = read('src/app/runtime/notificationInstantPaintConstants.ts');
        expect(constants).toContain("NOTIFICATION_INSTANT_SHEET_RADIUS = '0.75rem 0.75rem 0 0'");
        expect(constants).toContain("NOTIFICATION_INSTANT_SHEET_BG = '#0b1021'");
        const bridge = read('src/app/runtime/notificationInstantPaintBridge.ts');
        expect(bridge).toContain('NOTIFICATION_INSTANT_SHEET_RADIUS');
        expect(bridge).toContain('NOTIFICATION_INSTANT_SHEET_BG');

        expect(
            existsSync(
                join(root, '.audit/PHASE_NOTIFICATIONS_REMAINING_COMPLETION_CLOSURE.md'),
            ),
        ).toBe(true);
    });
});
