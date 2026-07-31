import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src/app/components/lawyer/criminal-system');

function read(name: string): string {
    return readFileSync(join(ROOT, name), 'utf8');
}

describe('criminal dashboard resolved runtime structure', () => {
    it('Runtime delegates render shell to CriminalDashboardResolvedRuntimeShell', () => {
        const runtime = read('CriminalDashboardResolvedRuntime.tsx');
        expect(runtime).toContain('CriminalDashboardResolvedRuntimeShell');
        expect(runtime).toContain('useCriminalDashboardResolvedOrchestration');
        expect(runtime).not.toContain('ColleagueConsultationProvider');
    });

    it('missing-case recovery lives in useCriminalMissingCaseRecovery', () => {
        const hook = read('useCriminalMissingCaseRecovery.ts');
        expect(hook).toContain('tryInjectRecord');
        expect(hook).toContain('loadCriminalCaseRecordByIdAsync');
        const orchestration = read('useCriminalDashboardResolvedOrchestration.ts');
        expect(orchestration).toContain('useCriminalMissingCaseRecovery');
        expect(orchestration).not.toContain('tryInjectRecord');
        const runtime = read('CriminalDashboardResolvedRuntime.tsx');
        expect(runtime).not.toContain('tryInjectRecord');
    });

    it('shell prefetch hook owns modalsHostMounted', () => {
        const prefetch = read('useCriminalDashboardShellPrefetch.ts');
        expect(prefetch).toContain('modalsHostMounted');
        expect(prefetch).toContain('preloadCriminalDashboardShellSurfaces');
    });

    it('force modals host predicate is centralized', () => {
        const fn = read('computeCriminalDashboardForceModalsHost.ts');
        expect(fn).toContain('computeCriminalDashboardForceModalsHost');
        expect(fn).toContain('verdictCassationFilingCard');
    });
});
