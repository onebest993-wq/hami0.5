import { describe, expect, it, beforeEach } from 'vitest';
import {
    peekHomeHubSecretaryAlertsCache,
    resetHomeHubSecretaryAlertsCacheForTests,
    writeHomeHubSecretaryAlertsCache,
} from '@/app/services/alerts/homeHubSecretaryAlertsWarmCache';

describe('homeHubSecretaryAlertsWarmCache', () => {
    beforeEach(() => {
        resetHomeHubSecretaryAlertsCacheForTests();
    });

    it('يخزّن ويسترجع تنبيهات المحامي', () => {
        writeHomeHubSecretaryAlertsCache('lawyer-1', [{ id: 'alert-1' } as never]);
        expect(peekHomeHubSecretaryAlertsCache('lawyer-1')).toHaveLength(1);
        expect(peekHomeHubSecretaryAlertsCache('lawyer-2')).toBeNull();
    });

    it('يمسح عند lawyerId فارغ', () => {
        writeHomeHubSecretaryAlertsCache('lawyer-1', [{ id: 'a' } as never]);
        writeHomeHubSecretaryAlertsCache(null, []);
        expect(peekHomeHubSecretaryAlertsCache('lawyer-1')).toBeNull();
    });
});
