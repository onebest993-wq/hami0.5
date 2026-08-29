/**
 * Phase-3 guards: probes gone, named chunk budget config, domain drain paths.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { expectJsonOrRetired } from './retiredCursorArtifact';

const root = process.cwd();
const probesDir = path.join(root, '.cursor');
const budgetPath = path.join(root, 'scripts/perf-budget.json');

describe('phase-3 probe cleanup', () => {
    it('no tracked-style probe leftovers outside gitignore patterns', () => {
        if (!fs.existsSync(probesDir)) return;
        const probes = fs.readdirSync(probesDir).filter((f) => f.startsWith('probe-'));
        for (const name of probes) {
            expect(
                /\.(mjs|json|png)$/.test(name),
                `probe ${name} is not a gitignored local artifact`,
            ).toBe(true);
        }
    });
});

describe('phase-3 named chunk budget', () => {
    it('perf-budget.json defines namedChunkMaxRawKb for critical app stems', () => {
        const budget = JSON.parse(fs.readFileSync(budgetPath, 'utf8')) as {
            namedChunkMaxRawKb: Record<string, number>;
            chunkRegression: { watchPrefixes: string[] };
        };
        expect(budget.namedChunkMaxRawKb.ExecutionDashboard).toBeLessThanOrEqual(420);
        expect(budget.namedChunkMaxRawKb['criminal-runtime']).toBeLessThanOrEqual(300);
        expect(budget.namedChunkMaxRawKb.LawyerDashboard).toBeLessThanOrEqual(200);
        expect(budget.chunkRegression.watchPrefixes).toEqual(
            expect.arrayContaining(['criminal-runtime', 'boot-ui-primitives']),
        );
        // ExecutionDashboard يُراقَب عبر namedChunkMaxRawKb لا عبر includes() لتجنّب micro-chunks
        expect(budget.chunkRegression.watchPrefixes).not.toContain('ExecutionDashboard');
    });

    it('named chunk evaluator passes against current dist when present', async () => {
        const assetsDir = path.join(root, 'dist/assets');
        if (!fs.existsSync(assetsDir)) return;
        if (process.env.HAMI_CHECK_NAMED_CHUNKS !== '1') {
            /* dist محلي قديم لا يُسقط العقد — القياس الحي في CI عبر verify:production-build */
            return;
        }
        const { evaluateNamedChunkBudget } = await import('../../../../scripts/check-named-chunk-budget.mjs');
        const result = evaluateNamedChunkBudget();
        expect(result.ok).toBe(true);
    });
});

describe('phase-3 utils→domain drain', () => {
    it('engines live under domain/execution with utils re-export shims', () => {
        expect(
            fs.existsSync(
                path.join(root, 'src/app/domain/execution/imprisonment/imprisonmentEngine.ts'),
            ),
        ).toBe(true);
        expect(
            fs.existsSync(path.join(root, 'src/app/domain/execution/summons/summoningImmunityEngine.ts')),
        ).toBe(true);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/domain/execution/visitation/visitationScheduleEngine.ts'),
            ),
        ).toBe(true);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/domain/execution/otherParty/otherPartyEffectiveRequestsUtils.ts'),
            ),
        ).toBe(true);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/domain/execution/otherParty/creditorOtherPartyMirrorVisibility.ts'),
            ),
        ).toBe(true);
        for (const shim of [
            'imprisonmentEngine.ts',
            'summoningImmunityEngine.ts',
            'visitationScheduleEngine.ts',
            'otherPartyEffectiveRequestsUtils.ts',
            'creditorOtherPartyMirrorVisibility.ts',
        ]) {
            const src = fs.readFileSync(path.join(root, 'src/app/utils', shim), 'utf8');
            expect(src).toContain('export * from');
            expect(src).toContain('@/app/domain/execution/');
        }
    });
});

describe('phase-3 progress artifact', () => {
    it('exists — or tracker retired', () => {
        expectJsonOrRetired<{ phase: number; status: string }>('.cursor/phase-3-progress.json', (data) => {
            expect(data.phase).toBe(3);
            expect(['in-progress', 'closed']).toContain(data.status);
        });
    });

    it('when close artifact exists, status is closed', () => {
        expectJsonOrRetired<{ status: string }>('.cursor/phase-3-close.json', (close) => {
            expect(close.status).toMatch(/closed/);
        });
    });
});
