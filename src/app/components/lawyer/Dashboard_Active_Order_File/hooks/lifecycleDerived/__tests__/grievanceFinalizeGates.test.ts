import { describe, expect, it } from 'vitest';
import { computeGrievancePhase2FinalizeReady } from '../grievanceFinalizeGates';

const base = {
    isFinalized: false,
    grievanceOutcome: 'filed' as const,
    grievanceExpiredCanClose: true,
    grievanceExpiredConfirmed: true,
    grievanceFinalSaveReady: true,
};

describe('computeGrievancePhase2FinalizeReady', () => {
    it('returns false when the file is finalized', () => {
        expect(
            computeGrievancePhase2FinalizeReady({
                ...base,
                isFinalized: true,
            }),
        ).toBe(false);
    });

    it('returns false for filed outcome when final save is not ready', () => {
        expect(
            computeGrievancePhase2FinalizeReady({
                ...base,
                grievanceOutcome: 'filed',
                grievanceFinalSaveReady: false,
            }),
        ).toBe(false);
    });

    it('returns true for filed outcome when final save is ready', () => {
        expect(
            computeGrievancePhase2FinalizeReady({
                ...base,
                grievanceOutcome: 'filed',
                grievanceFinalSaveReady: true,
            }),
        ).toBe(true);
    });

    it('returns false for expired outcome when legal period has not elapsed', () => {
        expect(
            computeGrievancePhase2FinalizeReady({
                ...base,
                grievanceOutcome: 'expired',
                grievanceExpiredCanClose: false,
                grievanceExpiredConfirmed: true,
            }),
        ).toBe(false);
    });

    it('returns false for expired outcome when expiry is not confirmed', () => {
        expect(
            computeGrievancePhase2FinalizeReady({
                ...base,
                grievanceOutcome: 'expired',
                grievanceExpiredCanClose: true,
                grievanceExpiredConfirmed: false,
            }),
        ).toBe(false);
    });

    it('returns true for expired outcome when close is allowed and confirmed', () => {
        expect(
            computeGrievancePhase2FinalizeReady({
                ...base,
                grievanceOutcome: 'expired',
                grievanceExpiredCanClose: true,
                grievanceExpiredConfirmed: true,
            }),
        ).toBe(true);
    });
});
