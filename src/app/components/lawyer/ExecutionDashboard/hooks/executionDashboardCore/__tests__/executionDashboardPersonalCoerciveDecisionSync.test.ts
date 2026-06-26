import { describe, expect, it } from 'vitest';
import {
    buildExecutiveDetentionExpiryPatch,
    hasApprovedPersonalCoerciveSubtype,
    isExecutiveDetentionExpired,
    shouldActivateTravelBanFromDecisions,
    shouldSendExecutiveDetentionReminder,
    timelineAlreadyHasForcedBringMemo,
} from '../executionDashboardPersonalCoerciveDecisionSync';

describe('executionDashboardPersonalCoerciveDecisionSync', () => {
    it('detects approved travel ban decision', () => {
        const rows = [
            {
                requestKind: 'personal_coercive',
                personalCoerciveSubtype: 'travel_ban',
                executorOutcome: 'approved',
            },
        ];
        expect(hasApprovedPersonalCoerciveSubtype(rows, 'travel_ban')).toBe(true);
        expect(shouldActivateTravelBanFromDecisions(rows, false)).toBe(true);
        expect(shouldActivateTravelBanFromDecisions(rows, true)).toBe(false);
    });

    it('detects forced bring memo in timeline', () => {
        expect(
            timelineAlreadyHasForcedBringMemo([{ id: '1', title: '📄 مسودة مذكرة إحضار (test)' } as any]),
        ).toBe(true);
    });

    it('expires executive detention after until date', () => {
        const past = '2000-01-01';
        expect(isExecutiveDetentionExpired(past)).toBe(true);
        expect(buildExecutiveDetentionExpiryPatch().debtor_executive_detention_active).toBe(false);
    });

    it('fires detention reminder within two days', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const ymd = tomorrow.toISOString().slice(0, 10);
        expect(shouldSendExecutiveDetentionReminder(ymd, false, false)).toBe(true);
        expect(shouldSendExecutiveDetentionReminder(ymd, true, false)).toBe(false);
    });
});
