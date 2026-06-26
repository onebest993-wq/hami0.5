import { describe, expect, it, vi, beforeEach } from 'vitest';
import { persistExecutionDashboardSnapshot } from '../persistExecutionDashboardSnapshot';

const setMock = vi.fn();

vi.mock('@/app/utils/storageCache', () => ({
    storageCache: { set: (...args: unknown[]) => setMock(...args) },
}));

vi.mock('@/app/utils/executionStorageKeys', () => ({
    executionStorageKey: (id: string) => `exec:${id}`,
}));

vi.mock('@/app/utils/debug', () => ({
    debug: { error: vi.fn() },
}));

describe('persistExecutionDashboardSnapshot', () => {
    beforeEach(() => {
        setMock.mockClear();
    });

    it('skips when persist key is missing', () => {
        persistExecutionDashboardSnapshot({
            executionId: undefined,
            executionData: null,
        } as never);
        expect(setMock).not.toHaveBeenCalled();
    });

    it('writes merged snapshot to storage cache', () => {
        persistExecutionDashboardSnapshot({
            executionId: 'd1',
            executionData: {
                id: 'd1',
                timelineEvents: [],
                gracePeriodActive: true,
                gracePeriodEnded: false,
            },
            debtorNotificationDate: '2026-01-01',
            lastActionDate: '2026-01-02',
            executionFeeInjected: false,
            timelineEvents: [{ id: 't1' }],
            caseNotesLog: [],
            caseTasksPending: [],
            financialLedger: [],
            gracePeriodActive: true,
            gracePeriodEnded: false,
            seizedAssets: [],
            seizureDraftsByDecisionId: {},
            realEstateSeizureAssets: [],
            activeCoerciveActions: [],
            notificationCount: 0,
            forcedAttendanceIssued: false,
            debtorEvaded: false,
            arrestWarrantUnlocked: false,
            creditorAttended: false,
            executionPaused: false,
            activeNoticeState: null,
            debtorAttendedVoluntarily: false,
            debtorForcedToAttend: false,
            debtorArrested: false,
            nonInterferenceIssued: false,
            paidDebt: 0,
            paidCourtFees: 0,
            paidDirectorateFees: 0,
            paidClientFees: 0,
            summoningRound: 0,
            voluntaryAttendanceCount: 0,
            investigationCourtRequested: false,
            investigationMemoIssued: false,
            investigationPathDebtorPresent: false,
            forcedPathAttendanceSecured: false,
            evictionVacateDeadlineLocal: null,
            evictionResidentialGracePeriodStart: null,
            evictionExecutorVacateGrantApproved: null,
            evictionResidentialGraceManuallyEndedAt: null,
            evictionAssetsTabUnlocked: false,
            evictionCaseExpenses: [],
            encroachmentCaseExpenses: [],
            specificDeliveryCaseExpenses: [],
            earnerFeeCollectionSm: null,
            debtorSummonsMarkerLocal: null,
        });

        expect(setMock).toHaveBeenCalledTimes(1);
        const [key, payload] = setMock.mock.calls[0] as [string, Record<string, unknown>];
        expect(key).toBe('exec:d1');
        expect(payload.debtorNotificationDate).toBe('2026-01-01');
        expect(payload.timelineEvents).toEqual([{ id: 't1' }]);
        expect(payload.gracePeriodActive).toBe(true);
    });
});
