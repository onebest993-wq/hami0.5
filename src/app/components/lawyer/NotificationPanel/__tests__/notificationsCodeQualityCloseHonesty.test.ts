import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

function lineCount(rel: string): number {
    return read(rel).split(/\n/).length;
}

function noBarrelImport(rel: string): void {
    const src = read(rel);
    expect(src).not.toContain("from './notificationInstantPaint'");
    expect(src).not.toContain("from '@/app/runtime/notificationInstantPaint'");
}

describe('notifications code quality close honesty', () => {
    it('اللوحة رفيعة والمسار والهروب hooks مستقلة', () => {
        expect(lineCount('src/app/components/lawyer/NotificationPanel/index.tsx')).toBeLessThanOrEqual(
            180,
        );
        expect(
            existsSync(
                join(root, 'src/app/components/lawyer/NotificationPanel/hooks/useNotificationLayeredEscape.ts'),
            ),
        ).toBe(true);
        expect(
            existsSync(
                join(root, 'src/app/components/lawyer/NotificationPanel/notificationEscapeStack.ts'),
            ),
        ).toBe(true);
        const panel = read('src/app/components/lawyer/NotificationPanel/index.tsx');
        expect(panel).not.toContain('isSmartDialogOpen');
        expect(panel).toContain('useNotificationLayeredEscape');
        expect(panel).toContain('useNotificationPanelKeyboardInsetScroll');
        const hook = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanel.ts',
        );
        expect(hook).toContain('shares: caseShareAll');
        expect(hook).not.toMatch(/incoming:\s*caseShareIncoming/);
        expect(hook).toContain('selectNotificationTabView');
        const escapeHook = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationLayeredEscape.ts',
        );
        expect(escapeHook).toContain('isAlertControlsRouteInDom');
    });

    it('طبقة الطلاء مقسومة دون دورة على البرميل', () => {
        expect(lineCount('src/app/runtime/notificationInstantPaint.ts')).toBeLessThan(120);
        expect(existsSync(join(root, 'src/app/runtime/notificationInstantPaintConstants.ts'))).toBe(true);
        expect(existsSync(join(root, 'src/app/runtime/notificationInstantPaintState.ts'))).toBe(true);
        expect(existsSync(join(root, 'src/app/runtime/notificationInstantPaintDom.ts'))).toBe(true);
        expect(existsSync(join(root, 'src/app/runtime/notificationInstantPaintInteract.ts'))).toBe(true);
        expect(existsSync(join(root, 'src/app/runtime/notificationInstantPaintBridge.ts'))).toBe(true);
        noBarrelImport('src/app/runtime/notificationInstantPaintDom.ts');
        noBarrelImport('src/app/runtime/notificationInstantPaintInteract.ts');
        noBarrelImport('src/app/runtime/notificationInstantPaintBridge.ts');
        noBarrelImport('src/app/runtime/notificationInstantPaintState.ts');
        noBarrelImport('src/app/runtime/notificationInstantPaintConstants.ts');
        const paint = read('src/app/runtime/notificationInstantPaint.ts');
        expect(paint).toContain('paintNotificationInstantChrome');
        expect(paint).toContain('armNotificationOverlayInteraction');
        expect(paint).not.toContain('scheduleNotificationOverlayInteractionArm');
        const interact = read('src/app/runtime/notificationInstantPaintInteract.ts');
        expect(interact).toContain('armNotificationOverlayInteraction');
        expect(interact).not.toContain('from \'./notificationInstantPaint\'');
        const hide = read('src/app/runtime/notificationInstantPaintDom.ts');
        expect(hide).not.toContain('clearNotificationDismissLock');
        expect(hide).not.toContain('beginNotificationDismissLock');
    });

    it('المتجر: قائمة نقية وبذرة E2E مفصولة عن zustand', () => {
        expect(existsSync(join(root, 'src/app/stores/notificationStoreList.ts'))).toBe(true);
        expect(existsSync(join(root, 'src/app/stores/notificationStoreE2e.ts'))).toBe(true);
        expect(lineCount('src/app/stores/notificationStore.ts')).toBeLessThan(340);
        expect(lineCount('src/app/stores/notificationStoreList.ts')).toBeLessThan(90);
        const store = read('src/app/stores/notificationStore.ts');
        expect(store).toContain('applyUpsertsToList');
        expect(store).toContain('applyE2eInboxSeed');
        expect(store).not.toContain('__hamiE2eSeedInbox');
        const storeE2e = read('src/app/stores/notificationStoreE2e.ts');
        expect(storeE2e).toContain('__hamiE2eSeedInbox');
        expect(storeE2e).toContain('applyE2eInboxSeedToStore');
        expect(storeE2e).not.toContain("from './notificationStore'");
        expect(storeE2e).not.toContain("from '@/app/stores/notificationStore'");
        const list = read('src/app/stores/notificationStoreList.ts');
        expect(list).toContain('export function applyUpsertsToList');
        expect(list).not.toContain('create(');
    });

    it('خطاف الشِل: فتح أصلي وOS وE2E خارج الأوركسترا', () => {
        expect(lineCount('src/app/hooks/lawyerDashboard/useLawyerDashboardNotifications.ts')).toBeLessThan(
            220,
        );
        expect(
            existsSync(
                join(root, 'src/app/hooks/lawyerDashboard/notifications/useNotificationOsPanelOpen.ts'),
            ),
        ).toBe(true);
        expect(
            existsSync(
                join(root, 'src/app/hooks/lawyerDashboard/notifications/useNotificationE2eWindow.ts'),
            ),
        ).toBe(true);
        const hook = read('src/app/hooks/lawyerDashboard/useLawyerDashboardNotifications.ts');
        expect(hook).toContain('beginNotificationShellOpen');
        expect(hook).toContain('useNotificationOsPanelOpen');
        expect(hook).toContain('useNotificationE2eWindow');
        expect(hook).not.toContain('VITE_NATIVE_NOTIFICATION_SHEET');
        expect(hook).not.toContain('isViteE2eHooksEnabled');
        expect(hook).not.toContain('HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT');
        const openFlow = read(
            'src/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow.ts',
        );
        expect(openFlow).toContain('VITE_NATIVE_NOTIFICATION_SHEET');
        expect(openFlow).toContain('export function beginNotificationShellOpen');
        const e2e = read('src/app/hooks/lawyerDashboard/notifications/useNotificationE2eWindow.ts');
        expect(e2e).toContain('isViteE2eHooksEnabled');
        expect(e2e).toContain('__hamiE2eForceOpenNotifications');
    });

    it('DND والمنبث مكوّنات/نماذج مستقلة عن الحاوية', () => {
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/NotificationPanel/components/NotificationAlertDndSegments.tsx',
                ),
            ),
        ).toBe(true);
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/NotificationPanel/components/NotificationAlertQuietHoursFields.tsx',
                ),
            ),
        ).toBe(true);
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/NotificationPanel/components/NotificationAlertOnceMuteFields.tsx',
                ),
            ),
        ).toBe(true);
        expect(existsSync(join(root, 'src/app/hooks/lawyerDashboard/incomingNotificationPopupModel.ts'))).toBe(
            true,
        );
        const dnd = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationAlertDndPanel.tsx',
        );
        expect(dnd).toContain('NotificationAlertDndSegments');
        expect(dnd).toContain('NotificationAlertQuietHoursFields');
        expect(dnd).toContain('NotificationAlertOnceMuteFields');
        expect(dnd).not.toContain('notification-quiet-hours-start');
        expect(lineCount('src/app/components/lawyer/NotificationPanel/components/NotificationAlertDndPanel.tsx')).toBeLessThan(
            90,
        );
        const mute = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationAlertOnceMuteFields.tsx',
        );
        expect(mute).toContain('px-3 py-2');
        expect(mute).toContain('notification-mute-until');
        const popups = read('src/app/hooks/lawyerDashboard/useIncomingNotificationPopups.ts');
        expect(popups).toContain('announceIncomingNotificationArrival');
        expect(popups).toContain('mergeIncomingPopupQueue');
        expect(popups).not.toContain('playNotificationArrivalCue');
        expect(popups).not.toContain('function toPopup');
        expect(popups).not.toContain('function isEligibleInAppPopup');
        expect(
            existsSync(join(root, 'src/app/hooks/lawyerDashboard/incomingNotificationPopupArrival.ts')),
        ).toBe(true);
    });
});
