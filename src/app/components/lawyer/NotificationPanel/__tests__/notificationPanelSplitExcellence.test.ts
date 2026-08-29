import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const panelRoot = path.join(root, 'src/app/components/lawyer/NotificationPanel');
const servicesRoot = path.join(root, 'src/app/services/notifications');

function lineCount(abs: string): number {
    return fs.readFileSync(abs, 'utf8').split(/\r?\n/).length;
}

function panelLineCount(rel: string): number {
    return lineCount(path.join(panelRoot, rel));
}

describe('notification panel split excellence', () => {
    it('index منسّق رفيع ≤180 سطراً', () => {
        expect(panelLineCount('index.tsx')).toBeLessThanOrEqual(180);
        expect(panelLineCount('index.tsx')).toBeGreaterThan(40);
    });

    it('AlertControls عرضي بعد استخراج الـ hook', () => {
        expect(panelLineCount('components/NotificationAlertControls.tsx')).toBeLessThanOrEqual(160);
        expect(
            fs
                .readFileSync(
                    path.join(panelRoot, 'components/NotificationAlertControls.tsx'),
                    'utf8',
                )
                .includes('useNotificationAlertControls'),
        ).toBe(true);
    });

    it('hooks مفصولة بمسؤولية واحدة: focus / DND / escape', () => {
        for (const f of [
            'hooks/useNotificationPanelFocus.ts',
            'hooks/useNotificationDndControls.ts',
            'hooks/useNotificationLayeredEscape.ts',
            'hooks/useNotificationListWindow.ts',
        ]) {
            expect(fs.existsSync(path.join(panelRoot, f))).toBe(true);
            expect(panelLineCount(f)).toBeLessThanOrEqual(160);
        }
        expect(panelLineCount('hooks/useNotificationPanel.ts')).toBeLessThanOrEqual(140);
        expect(panelLineCount('hooks/useNotificationActions.ts')).toBeLessThanOrEqual(100);
        expect(panelLineCount('hooks/useNotificationAlertControls.ts')).toBeLessThanOrEqual(80);
        expect(panelLineCount('hooks/useNotificationPanelKeyboardInsetScroll.ts')).toBeLessThanOrEqual(30);
        expect(fs.existsSync(path.join(panelRoot, 'utils/selectNotificationTabView.ts'))).toBe(true);
        expect(panelLineCount('utils/selectNotificationTabView.ts')).toBeLessThanOrEqual(40);
        expect(panelLineCount('utils/notificationListWindow.ts')).toBeLessThanOrEqual(70);
        expect(lineCount(path.join(servicesRoot, 'notificationHostKeepAlive.ts'))).toBeLessThanOrEqual(20);
    });

    it('الطبقات: Root / Sheet / ScrollRegion / InboxBody / CSS styles موجودة', () => {
        for (const f of [
            'components/NotificationPanelRoot.tsx',
            'components/NotificationPanelSheet.tsx',
            'components/NotificationPanelScrollRegion.tsx',
            'components/NotificationInboxRouteBody.tsx',
            'components/NotificationHeaderInbox.tsx',
            'components/NotificationHeaderAlertControls.tsx',
            'components/NotificationAlertDndSegments.tsx',
            'components/NotificationAlertQuietHoursFields.tsx',
            'components/NotificationAlertOnceMuteFields.tsx',
            'hooks/useNotificationPanelRoute.ts',
            'hooks/useNotificationPanelViewState.ts',
            'hooks/useNotificationAlertControls.ts',
            'utils/partitionCaseShareForPanel.ts',
            'notificationPanelLayout.ts',
            'styles/notificationPanel.layer.css',
            'styles/notificationPanel.sheet.css',
            'styles/notificationPanel.sheet.chrome.css',
            'styles/notificationPanel.sheet.cards.css',
            'styles/notificationPanel.sheet.breakpoints.css',
            'styles/notificationPanel.alerts.css',
            'styles/notificationPanel.android.css',
        ]) {
            expect(fs.existsSync(path.join(panelRoot, f))).toBe(true);
        }
        const sheetAgg = fs.readFileSync(
            path.join(panelRoot, 'styles/notificationPanel.sheet.css'),
            'utf8',
        );
        expect(sheetAgg).toContain('notificationPanel.sheet.chrome.css');
        expect(sheetAgg).toContain('notificationPanel.sheet.cards.css');
        expect(sheetAgg).toContain('notificationPanel.sheet.breakpoints.css');
    });

    it('خدمات osTap / inbox / bridge مفصولة مع واجهات عامة رفيعة', () => {
        for (const f of [
            'osTap/notificationOsTapExtract.ts',
            'osTap/notificationOsTapIntent.ts',
            'osTap/notificationOsTapPending.ts',
            'inbox/notificationServerKvIo.ts',
            'inbox/notificationServerDualStore.ts',
            'inbox/notificationServerInboxOps.ts',
            'inbox/notificationServerInboxQuery.ts',
            'bridge/hamiBridgeNativePlugin.ts',
            'bridge/hamiBridgeSchedule.ts',
            'bridge/hamiBridgePresent.ts',
            'native/nativeChannelLockscreenMigrate.ts',
            'notificationHostKeepAlive.ts',
        ]) {
            expect(fs.existsSync(path.join(servicesRoot, f))).toBe(true);
            expect(lineCount(path.join(servicesRoot, f))).toBeLessThanOrEqual(220);
        }
        expect(lineCount(path.join(servicesRoot, 'notificationOsTapRouting.ts'))).toBeLessThanOrEqual(
            50,
        );
        expect(lineCount(path.join(servicesRoot, 'notificationServerBlob.ts'))).toBeLessThanOrEqual(40);
        expect(lineCount(path.join(servicesRoot, 'HamiNotificationBridge.ts'))).toBeLessThanOrEqual(40);
    });
});
