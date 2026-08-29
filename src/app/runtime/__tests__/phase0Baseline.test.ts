/**
 * Phase-0 / Phase-1 elevation guards — artifact integrity when present.
 */
import { describe, expect, it } from 'vitest';
import { expectJsonOrRetired } from './retiredCursorArtifact';

describe('phase-0 elevation baseline', () => {
    it('exists and tracks FOC monster at green ≤1000 after phase-1 world-class close — or retired', () => {
        expectJsonOrRetired<{
            status: string;
            measurementHonesty: { browserTtfiInstrumented: boolean };
            monsterFiles: Array<{ id: string; lines: number; band: string }>;
        }>('.cursor/phase-0-baseline.json', (data) => {
            expect(data.status).toBe('closed');
            expect(data.measurementHonesty.browserTtfiInstrumented).toBe(true);
            expect(
                (data.measurementHonesty as { deviceTtfiInstrumented?: boolean }).deviceTtfiInstrumented,
            ).toBe(false);
            expect(
                (data.measurementHonesty as { productionPreviewTtfiInstrumented?: boolean })
                    .productionPreviewTtfiInstrumented,
            ).toBe(true);
            const focMonster = data.monsterFiles.find((m) => m.id === 'foc');
            expect(focMonster).toBeTruthy();
            expect(Number(focMonster?.lines)).toBeLessThanOrEqual(1000);
            expect(focMonster?.band).toBe('green');
        });
    });
});

describe('phase-1 structural close artifact', () => {
    it('marks phase-1 closed with all named monsters ≤1000 — or retired', () => {
        expectJsonOrRetired<{
            status: string;
            readyForPhase2: boolean;
            monsters: Array<{ id: string; after: number }>;
        }>('.cursor/phase-1-close.json', (data) => {
            expect(data.status).toBe('closed-at-world-class-structural');
            expect(data.readyForPhase2).toBe(true);
            for (const m of data.monsters) {
                expect(m.after).toBeLessThanOrEqual(1000);
            }
        });
    });
});
