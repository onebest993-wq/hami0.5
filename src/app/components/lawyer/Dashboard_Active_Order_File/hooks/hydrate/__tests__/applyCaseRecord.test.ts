import { describe, expect, it, vi } from 'vitest';
import { applyCaseRecord } from '../applyCaseRecord';
import type { OrderFileHydrateSetters } from '../types';

function createSetters(): OrderFileHydrateSetters & {
    grievanceDataUpdates: unknown[];
} {
    const grievanceDataUpdates: unknown[] = [];
    const noop = vi.fn();
    return {
        grievanceDataUpdates,
        setCaseData: noop,
        setHasIntervention: noop,
        setFileStatus: noop,
        setIsSecretMode: noop,
        setActiveLifecycleStep: noop,
        setJudgeDecision: noop,
        setExecutionData: noop,
        setGrievanceData: (updater) => {
            const prev = { rejectionNotificationDate: '', outcome: '' as const, filingDate: '' };
            grievanceDataUpdates.push(typeof updater === 'function' ? updater(prev) : updater);
        },
        setGrievanceLegalEndDate: noop,
        setGrievanceDecisionNotificationConfirmed: vi.fn(),
        setGrievancePetitionNotificationDate: noop,
        setGrievancePetitionNotificationConfirmed: noop,
        setGrievanceTimingConfirmed: noop,
        setGrievanceDetailsConfirmed: noop,
        setPhase2FirstHearingDate: noop,
        setGrievanceDecision: noop,
        setCassationData: noop,
        setCassationDecision: noop,
        setGuaranteeSubmitted: noop,
        setGuaranteeDetails: noop,
        setHearings: noop,
        setExpertModule: noop,
        setPreDecisionClosed: noop,
        setExpectedDecisionDate: noop,
        setRegistrationData: noop,
        setCaseEvents: noop,
        setCaseNotes: noop,
        setCaseAttachments: noop,
        setCaseFollowups: noop,
    };
}

describe('applyCaseRecord', () => {
    it('maps notificationDate into grievanceData.rejectionNotificationDate', () => {
        const setters = createSetters();
        const confirmed = setters.setGrievanceDecisionNotificationConfirmed as ReturnType<typeof vi.fn>;

        applyCaseRecord(
            {
                notificationDate: '2026-05-10',
                judgeDecision: 'rejected',
                legalState: 'Awaiting_Grievance',
            },
            null,
            setters,
        );

        expect(setters.grievanceDataUpdates.some((u) => (u as { rejectionNotificationDate?: string }).rejectionNotificationDate === '2026-05-10')).toBe(
            true,
        );
        expect(confirmed).toHaveBeenCalledWith(true);
    });
});
