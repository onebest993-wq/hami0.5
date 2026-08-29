import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readHomeTabImplSource } from './readHomeTabImplSource';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('boot quiet instant open — quiet shared cold path', () => {
    it('MainView لا يسخّن ArchivePortal على onDashboardInteractive', () => {
        const src = readLawyerDashboardMainViewSurface();
        expect(src).not.toContain('prefetchArchivePortalShell');
        expect(src).not.toContain('loadArchivePortalModule');
        expect(src).not.toMatch(
            /onDashboardInteractive\([\s\S]{0,400}loadArchivePortalModule/,
        );
        expect(src).toContain('scheduleBootContentReadyAfterStyles');
    });

    it('HomeTab لا يستدعي notifyBootContentReady', () => {
        const src = readHomeTabImplSource(root);
        const grid = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/HomeMainGrid.tsx'),
            'utf8',
        );
        expect(src).not.toContain('notifyBootContentReady');
        expect(src).not.toContain('markLawyerDashboardFirstTabOpenOnce');
        expect(grid).not.toContain('notifyBootContentReady');
        expect(grid).toContain('scheduleHomeMainGridPainted');
    });

    it('intent prefetch للدعاوى يستخدم includeSecondary: false', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch.ts'),
            'utf8',
        );
        expect(src).toMatch(
            /case 'lawsuit':[\s\S]{0,200}warmLawsuitWorkspace\(\{\s*includeSecondary:\s*false/,
        );
        expect(src).toMatch(
            /warmExecutionWorkspace\(\{[\s\S]{0,80}includeSecondary:\s*false/,
        );
    });

    it('useBootReveal: flushSync في finishExit فقط؛ layout بلا flush؛ لا قصّ قسري للغطاء', () => {
        const src = readFileSync(join(root, 'src/app/bootstrap/useBootReveal.ts'), 'utf8');
        expect(src).toContain("from 'react-dom'");
        expect(src).toContain('flushSync');
        expect(src).toContain('applyExitGone');
        expect(src).toMatch(/applyExitGone\(\{\s*flush:\s*true\s*\}\)/);
        expect(src).toMatch(/applyExitGone\(\{\s*flush:\s*false\s*\}\)/);
        expect(src).not.toContain('scheduleShellFallbackAfterContentReady');
        expect(src).not.toContain(', 320)');
        expect(src).not.toContain('removeStaticBootShell');
        expect(src).not.toContain('HOME_MAIN_GRID_PAINTED_EVENT');
    });

    it('hydrators تُربط بعد BOOT_REVEAL_DONE لا interactive وحده', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRuntimeEffects.ts'),
            'utf8',
        );
        expect(src).toContain('BOOT_REVEAL_DONE_EVENT');
        expect(src).toContain('isBootRevealDone');
        expect(src).toContain('bindExecutionBootHydrator');
        expect(src).not.toMatch(
            /onDashboardInteractive\([\s\S]{0,300}bindExecutionBootHydrator/,
        );
        const main = readLawyerDashboardMainViewSurface();
        expect(main).toContain('prefetchHubArchivesAfterHomePaint');
        expect(main).not.toContain('loadArchivePortalModule');
        expect(main).not.toMatch(
            /onDashboardInteractive\([\s\S]{0,400}prefetchHubArchivesAfterHomePaint/,
        );
    });
});
