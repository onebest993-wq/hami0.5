import { describe, expect, it } from 'vitest';
import {
    markThirdPartySeizureFundsReceived,
    parseThirdPartyFundsReceivedPayload,
    shouldHandleThirdPartyFundsReceivedOutcome,
} from '@/app/components/lawyer/ExecutionDashboard/utils/thirdPartyFundsReceivedOutcomeUtils';

describe('thirdPartyFundsReceivedOutcomeUtils', () => {
    it('parses payload from decision row', () => {
        const payload = parseThirdPartyFundsReceivedPayload({
            payloadJson: JSON.stringify({
                thirdPartySeizureId: 'tp-1',
                thirdPartyName: 'بنك',
                transferredAmountIqd: 500000,
            }),
        });
        expect(payload).toEqual({
            seizureId: 'tp-1',
            thirdPartyName: 'بنك',
            amountIqd: 500000,
        });
    });

    it('marks seizure as funds_received once', () => {
        const prev = [
            {
                id: 'tp-1',
                thirdPartyName: 'بنك',
                status: 'replied',
                replyStatus: 'pending',
            },
        ] as any[];
        const next = markThirdPartySeizureFundsReceived(prev, 'tp-1', 250000);
        expect(next?.[0]?.status).toBe('funds_received');
        expect(next?.[0]?.replyStatus).toBe('acknowledged');
        expect(next?.[0]?.transferredAmountIqd).toBe(250000);
        expect(markThirdPartySeizureFundsReceived(next!, 'tp-1', 250000)).toBeNull();
    });

    it('filters outcome events', () => {
        expect(
            shouldHandleThirdPartyFundsReceivedOutcome(
                {
                    executionId: 'ex-1',
                    requestKind: 'third_party_funds_received',
                    outcome: 'approved',
                    decisionId: 'd-1',
                },
                'ex-1',
                'ex-1'
            )
        ).toBe(true);
        expect(
            shouldHandleThirdPartyFundsReceivedOutcome(
                {
                    executionId: 'ex-1',
                    requestKind: 'seizure',
                    outcome: 'approved',
                    decisionId: 'd-1',
                },
                'ex-1',
                'ex-1'
            )
        ).toBe(false);
    });
});
