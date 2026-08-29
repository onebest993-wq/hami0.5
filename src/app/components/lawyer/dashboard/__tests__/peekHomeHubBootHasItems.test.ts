import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { peekHomeHubBootHasItems } from '@/app/components/lawyer/dashboard/peekHomeHubBootHasItems';
import {
    patchDashboardFrame1Snapshot,
    resetDashboardFrame1SnapshotForTests,
} from '@/app/bootstrap/dashboardFrame1Snapshot';

describe('peekHomeHubBootHasItems', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        resetDashboardFrame1SnapshotForTests('lawyer-1');
        localStorage.clear();
    });

    it('يرفض دون جلسة أو لقطة', () => {
        expect(peekHomeHubBootHasItems()).toBe(false);
        localStorage.setItem(
            'sb-test-auth-token',
            JSON.stringify({ user: { id: 'lawyer-1' } }),
        );
        expect(peekHomeHubBootHasItems()).toBe(false);
    });

    it('يصدق إن وُجد تنبيه أو تثبيت في لقطة القرص', () => {
        localStorage.setItem(
            'sb-test-auth-token',
            JSON.stringify({ user: { id: 'lawyer-1' } }),
        );
        patchDashboardFrame1Snapshot('lawyer-1', { secretaryAlertCount: 2 });
        expect(peekHomeHubBootHasItems()).toBe(true);
        resetDashboardFrame1SnapshotForTests('lawyer-1');
        patchDashboardFrame1Snapshot('lawyer-1', { pinnedCount: 1 });
        expect(peekHomeHubBootHasItems()).toBe(true);
        resetDashboardFrame1SnapshotForTests('lawyer-1');
        patchDashboardFrame1Snapshot('lawyer-1', { urgentAlertsCount: 1 });
        expect(peekHomeHubBootHasItems()).toBe(true);
    });
});
