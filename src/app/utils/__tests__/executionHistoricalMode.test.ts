import { describe, expect, it } from 'vitest';
import { resolveExecutionHistoricalMode } from '../executionHistoricalMode';

describe('resolveExecutionHistoricalMode', () => {
    it('returns true for finished and legacy closed statuses', () => {
        expect(resolveExecutionHistoricalMode('finished')).toBe(true);
        expect(resolveExecutionHistoricalMode('closed')).toBe(true);
        expect(
            resolveExecutionHistoricalMode({ dossierLifecycleStatus: 'finished' }),
        ).toBe(true);
    });

    it('returns false for active, paused, and suspended dossiers', () => {
        expect(resolveExecutionHistoricalMode('active')).toBe(false);
        expect(resolveExecutionHistoricalMode(undefined)).toBe(false);
        expect(resolveExecutionHistoricalMode('paused')).toBe(false);
        expect(resolveExecutionHistoricalMode('paused_creditor_death')).toBe(false);
        expect(resolveExecutionHistoricalMode('suspended')).toBe(false);
    });

    it('returns true when execution is archived or in trash', () => {
        expect(
            resolveExecutionHistoricalMode({
                dossierLifecycleStatus: 'active',
                executionArchivedAt: '2026-02-01T00:00:00.000Z',
            }),
        ).toBe(true);
        expect(
            resolveExecutionHistoricalMode({
                dossierLifecycleStatus: 'active',
                executionTrashDeletedAt: '2026-02-01T00:00:00.000Z',
            }),
        ).toBe(true);
    });
});
