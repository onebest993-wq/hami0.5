import { afterEach, describe, expect, it } from 'vitest';
import {
    patchDashboardFrame1Snapshot,
    peekDashboardFrame1Snapshot,
    resetDashboardFrame1SnapshotForTests,
} from '@/app/bootstrap/dashboardFrame1Snapshot';

describe('dashboardFrame1Snapshot', () => {
    afterEach(() => {
        resetDashboardFrame1SnapshotForTests('lawyer-1');
    });

    it('يدمج الحقول دون مسح البقية', () => {
        patchDashboardFrame1Snapshot('lawyer-1', { forumUnreadCount: 4 });
        patchDashboardFrame1Snapshot('lawyer-1', { pendingFieldTasksCount: 2 });
        const snap = peekDashboardFrame1Snapshot('lawyer-1');
        expect(snap?.forumUnreadCount).toBe(4);
        expect(snap?.pendingFieldTasksCount).toBe(2);
        expect(snap?.unreadCount).toBe(0);
        patchDashboardFrame1Snapshot('lawyer-1', { pinnedCount: 3, urgentAlertsCount: 1 });
        expect(peekDashboardFrame1Snapshot('lawyer-1')?.pinnedCount).toBe(3);
        expect(peekDashboardFrame1Snapshot('lawyer-1')?.urgentAlertsCount).toBe(1);
        expect(peekDashboardFrame1Snapshot('lawyer-1')?.forumUnreadCount).toBe(4);
    });

    it('يرفض قيماً غير رقمية ويحدّ السقف', () => {
        patchDashboardFrame1Snapshot('lawyer-1', {
            forumUnreadCount: Number.POSITIVE_INFINITY,
            secretaryAlertCount: 50_000,
        });
        const snap = peekDashboardFrame1Snapshot('lawyer-1');
        expect(snap?.forumUnreadCount).toBe(0);
        expect(snap?.secretaryAlertCount).toBe(9_999);
    });
});
