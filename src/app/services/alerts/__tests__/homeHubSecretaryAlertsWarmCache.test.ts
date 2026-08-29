import { describe, expect, it, beforeEach } from 'vitest';
import {
    peekHomeHubSecretaryAlertsCache,
    resetHomeHubSecretaryAlertsCacheForTests,
    writeHomeHubSecretaryAlertsCache,
} from '@/app/services/alerts/homeHubSecretaryAlertsWarmCache';
import {
    peekDashboardFrame1Snapshot,
    resetDashboardFrame1SnapshotForTests,
} from '@/app/bootstrap/dashboardFrame1Snapshot';

describe('homeHubSecretaryAlertsWarmCache', () => {
    beforeEach(() => {
        resetHomeHubSecretaryAlertsCacheForTests();
        resetDashboardFrame1SnapshotForTests('lawyer-1');
    });

    it('يخزّن ويسترجع تنبيهات المحامي', () => {
        writeHomeHubSecretaryAlertsCache('lawyer-1', [{ id: 'alert-1' } as never]);
        expect(peekHomeHubSecretaryAlertsCache('lawyer-1')).toHaveLength(1);
        expect(peekHomeHubSecretaryAlertsCache('lawyer-2')).toBeNull();
        expect(peekDashboardFrame1Snapshot('lawyer-1')?.secretaryAlertCount).toBe(1);
    });

    it('يمسح عند lawyerId فارغ', () => {
        writeHomeHubSecretaryAlertsCache('lawyer-1', [{ id: 'a' } as never]);
        writeHomeHubSecretaryAlertsCache(null, []);
        expect(peekHomeHubSecretaryAlertsCache('lawyer-1')).toBeNull();
    });
});
