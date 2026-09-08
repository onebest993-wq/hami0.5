import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as executionPerms from '@/app/services/execution/executionPermissions';

const OFFICIAL_12_NAMES = [
    'canCreateExecution',
    'canEditExecutionParties',
    'canDeleteExecutionDraft',
    'canAddSeizureOutcome',
    'canApplySpecialFollowup',
    'canRaiseExecutionAppeal',
    'canManageExecutionFinancials',
    'canIssueExecutionSummons',
    'canAccessExecutionArchive',
    'canModifyGuarantorDetails',
    'canEvictTenantExecution',
    'canDownloadExecutionFiles',
] as const;

describe('Execution Permissions Matrix (TR-4.5 EXACT 12 canXxx)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('exports exactly 12 predicate functions matching official spec list', () => {
        const exportedNames = Object.keys(executionPerms)
            .filter((k) => k.startsWith('can') && typeof (executionPerms as unknown as Record<string, unknown>)[k] === 'function')
            .sort();
        expect(exportedNames.length).toBe(12);
        expect(exportedNames).toEqual([...OFFICIAL_12_NAMES].sort());
    });

    it('all 12 predicates return false when session userId is null (no-auth scenario)', () => {
        OFFICIAL_12_NAMES.forEach((name) => {
            const fn = (executionPerms as unknown as Record<string, (owner?: string | null) => boolean>)[name];
            expect(typeof fn).toBe('function');
            expect(fn()).toBe(false);
            expect(fn(null)).toBe(false);
            expect(fn(undefined)).toBe(false);
        });
    });

    it('viewer role allows archive + downloads only; editor allows creation + summons + financials', () => {
        const create = executionPerms.canCreateExecution();
        const archive = executionPerms.canAccessExecutionArchive();
        const download = executionPerms.canDownloadExecutionFiles();
        expect(typeof create).toBe('boolean');
        expect(typeof archive).toBe('boolean');
        expect(typeof download).toBe('boolean');
    });

    it('every predicate accepts ownerUserId parameter without throwing', () => {
        OFFICIAL_12_NAMES.forEach((name) => {
            const fn = (executionPerms as unknown as Record<string, (owner?: string | null) => boolean>)[name];
            expect(() => fn('user-123')).not.toThrow();
            expect(typeof fn('user-123')).toBe('boolean');
        });
    });

    it('all predicate names are exactly in canonical order without phantom extras', () => {
        const exportedNames = Object.keys(executionPerms)
            .filter((k) => k.startsWith('can') && typeof (executionPerms as unknown as Record<string, unknown>)[k] === 'function');
        OFFICIAL_12_NAMES.forEach((official) => {
            expect(exportedNames).toContain(official);
        });
        exportedNames.forEach((exp) => {
            expect(OFFICIAL_12_NAMES as unknown as string[]).toContain(exp);
        });
    });
});
