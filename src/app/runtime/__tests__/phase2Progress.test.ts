/**
 * Phase-2 Instant parity progress guard.
 */
import { describe, expect, it } from 'vitest';
import { expectJsonOrRetired } from './retiredCursorArtifact';

type Phase2Progress = {
    phase: number;
    title: string;
    status: string;
    policy: { chromeOnlyBootWarm: boolean; keepAliveDossiers: boolean };
    surfaces: Record<
        string,
        {
            bootHydrator?: boolean;
            emptySeedGuard?: boolean;
            nestedChrome?: boolean;
        }
    >;
};

describe('phase-2 instant-parity progress artifact', () => {
    it('exists and tracks the four Instant surfaces — or tracker retired', () => {
        expectJsonOrRetired<Phase2Progress>('.cursor/phase-2-progress.json', (data) => {
            expect(data.phase).toBe(2);
            expect(data.title).toBe('instant-parity');
            expect(['in-progress', 'closed']).toContain(data.status);
            expect(data.policy.chromeOnlyBootWarm).toBe(true);
            expect(data.policy.keepAliveDossiers).toBe(false);
            expect(data.surfaces.execution).toBeTruthy();
            expect(data.surfaces.criminal).toBeTruthy();
            expect(data.surfaces['financial-foc']).toBeTruthy();
            expect(data.surfaces['smart-modal']).toBeTruthy();
        });
    });

    it('when closed, hydrators and FOC empty-seed guard are true — or retired', () => {
        expectJsonOrRetired<{
            status: string;
            surfaces: {
                execution: { bootHydrator: boolean };
                criminal: { bootHydrator: boolean; nestedChrome: boolean };
                'financial-foc': { emptySeedGuard: boolean };
                'smart-modal': { bootHydrator: boolean };
            };
        }>('.cursor/phase-2-progress.json', (data) => {
            if (data.status !== 'closed') return;
            expect(data.surfaces.execution.bootHydrator).toBe(true);
            expect(data.surfaces.criminal.bootHydrator).toBe(true);
            expect(data.surfaces.criminal.nestedChrome).toBe(false);
            expect(data.surfaces['financial-foc'].emptySeedGuard).toBe(true);
            expect(data.surfaces['smart-modal'].bootHydrator).toBe(true);
        });
    });
});
