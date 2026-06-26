import { describe, expect, it } from 'vitest';
import {
    buildThirdPartyReceiveTimelineDescription,
    mapThirdPartyAssetToReceived,
    validateThirdPartyReceiveAmount,
} from '../executionDashboardThirdPartyReceive';

describe('executionDashboardThirdPartyReceive', () => {
    it('rejects empty receive amount', () => {
        expect(validateThirdPartyReceiveAmount('')).toEqual({
            ok: false,
            message: 'أدخل المبلغ الفعلي المستلم',
        });
    });

    it('accepts valid formatted amount', () => {
        const result = validateThirdPartyReceiveAmount('1,500,000');
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.amountIqd).toBe(1500000);
    });

    it('maps asset to received locked row', () => {
        const next = mapThirdPartyAssetToReceived(
            {
                id: 'tp-1',
                thirdPartyName: 'البنك',
                status: 'pending',
                record_locked: false,
                awaiting_receive: true,
                receive_amount_draft: '1000',
            } as any,
            1000,
            '2026-06-26',
            '2026-06-26T12:00:00.000Z',
        );
        expect(next.status).toBe('received');
        expect(next.record_locked).toBe(true);
        expect(next.actualReceivedAmountIqd).toBe(1000);
        expect(next.awaiting_receive).toBe(false);
    });

    it('builds timeline description with trust credit line', () => {
        const text = buildThirdPartyReceiveTimelineDescription('البنك', 500000, true);
        expect(text).toContain('البنك');
        expect(text).toContain('الأمانات');
    });
});
