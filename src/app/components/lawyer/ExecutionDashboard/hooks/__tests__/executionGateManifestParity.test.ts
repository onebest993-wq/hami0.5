import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../../');

describe('execution gate manifest parity', () => {
    it('lists only existing E2E spec files', async () => {
        const { EXECUTION_GATE_E2E_SPECS } = await import(
            '../../../../../../../scripts/execution-gate-manifest.mjs'
        );
        expect(EXECUTION_GATE_E2E_SPECS.length).toBeGreaterThanOrEqual(8);
        for (const spec of EXECUTION_GATE_E2E_SPECS) {
            expect(existsSync(resolve(repoRoot, spec)), `${spec} missing`).toBe(true);
        }
    });

    it('production gate and e2e runner share the manifest (no inline duplicate lists)', () => {
        const gate = readFileSync(resolve(repoRoot, 'scripts/execution-production-gate.mjs'), 'utf8');
        const runner = readFileSync(resolve(repoRoot, 'scripts/run-execution-e2e.mjs'), 'utf8');
        expect(gate).toContain("from './execution-gate-manifest.mjs'");
        expect(runner).toContain("from './execution-gate-manifest.mjs'");
        expect(gate).not.toMatch(/const e2eSpecs = \[/);
    });
});
