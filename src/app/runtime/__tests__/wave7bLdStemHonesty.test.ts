import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('wave7b LD stem honesty', () => {
    it('execution Entry sync + InstantChrome keep-alive في MainView', () => {
        const src = readLawyerDashboardMainViewSurface();
        expect(src).toContain('LawyerDashboardExecutionOverlayEntry');
        expect(src).toContain('LazyExecutionOverlayEntry');
        expect(src).toContain('ExecutionArchiveInstantChrome');
        expect(src).toContain('executionArchiveHostMounted');
        expect(src).not.toContain('ARCHIVE_PORTAL_FALLBACK');
        expect(src).not.toMatch(/import \{ ExecutionArchiveShell \} from/);
        expect(src).toContain('LawyerDashboardExecutionDossierOverlayEntry');
        expect(src).toContain('LazyExecutionDossierOverlayEntry');
    });

    it('quantum بلا SecureStore sync', () => {
        const storage = fs.readFileSync(path.join(root, 'src/app/utils/quantumTasksStorage.ts'), 'utf8');
        expect(storage).not.toContain('getItemSync');
        expect(storage).not.toContain('setItemSync');
        const closePath = path.join(root, '.cursor/wave7b-ld-stem-close.json');
        if (!fs.existsSync(closePath)) return;
        const close = JSON.parse(fs.readFileSync(closePath, 'utf8')) as {
            foundationWorldClassSealed: boolean;
            verified: { LawyerDashboardRawKb: number };
        };
        expect(close.foundationWorldClassSealed).toBe(false);
        expect(close.verified.LawyerDashboardRawKb).toBeLessThanOrEqual(210);
    });

    it('ميزانية LawyerDashboard ≤200 في perf-budget', () => {
        const budget = JSON.parse(
            fs.readFileSync(path.join(root, 'scripts/perf-budget.json'), 'utf8'),
        ) as { namedChunkMaxRawKb: { LawyerDashboard: number } };
        expect(budget.namedChunkMaxRawKb.LawyerDashboard).toBe(200);
    });
});
