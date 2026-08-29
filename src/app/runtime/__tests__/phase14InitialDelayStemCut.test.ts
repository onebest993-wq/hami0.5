import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('phase-14 initial-delay stem cuts', () => {
    it('CalendarClusterLite لا يستورد useClusterScanSources', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCalendarClusterLite.ts'),
            'utf8',
        );
        expect(src).toContain("from '@/app/services/calendar/bridge/lite'");
        expect(src).toContain('createEmptyClusterScanSources');
        expect(src).not.toMatch(/import\s*\{[^}]*useClusterScanSources/);
        expect(src).not.toContain('UrgentActionsDB');
        expect(src).not.toContain("from '@/app/workspace/useClusterScanSources'");
    });

    it('orch لا يستورد hooks الميزات الثقيلة المؤجّلة بشكل ثابت (الإعدادات حيّة؛ pre-dock كسول)', () => {
        const src = [
            readFileSync(
                join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts'),
                'utf8',
            ),
            readFileSync(
                join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
                'utf8',
            ),
        ].join('\n');
        expect(src).toContain('createDeferredFeatureStubs');
        expect(src).toContain('createPreDockFeatureStubs');
        expect(src).toContain('createBootChromeFeatureStubs');
        expect(src).toContain('deferredFeatureSurfacesProps');
        expect(src).toContain('preDockFeatureSurfacesProps');
        expect(src).toContain('createNavigationStubs');
        expect(src).toContain('navigationSurfacesProps');
        expect(src).not.toMatch(/import \{[^}]*useLawyerDashboardNavigation[^}]*\} from/);
        expect(src).not.toMatch(/import \{ useLawyerDashboardSettings \} from/);
        expect(src).not.toMatch(/import \{ useLawyerDashboardProfileTab \} from/);
        expect(src).toContain('profileFeature');
        expect(src).toContain('communityFeature');
        expect(src).toContain('scheduleFeature');
        expect(src).toContain('repositoryFeature');
        expect(src).not.toMatch(/import \{[^}]*useLawyerDashboardCommunity[^}]*\} from/);
        expect(src).not.toMatch(/import \{[^}]*useLawyerDashboardScheduleTab[^}]*\} from/);
        expect(src).not.toMatch(/import \{[^}]*useLawyerDashboardRepository[^}]*\} from/);
        expect(src).not.toMatch(
            /import \{[^}]*useLawyerDashboardTransactions[^}]*\} from/,
        );
        expect(src).not.toMatch(
            /import \{[^}]*useLawyerDashboardFieldTasks[^}]*\} from/,
        );
        expect(src).not.toMatch(
            /import \{[^}]*useLawyerDashboardGlobalSearch[^}]*\} from/,
        );
    });

    it('MainView يركّب DeferredFeatureSurfaces و PreDockFeatureSurfaces كسولًا', () => {
        const src = readLawyerDashboardMainViewSurface();
        expect(src).toContain('LazyLawyerDashboardDeferredFeatureSurfaces');
        expect(src).toContain(
            "import('@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces')",
        );
        expect(src).toContain('LazyLawyerDashboardPreDockFeatureSurfaces');
        expect(src).toContain(
            "import('@/app/components/lawyer/dashboard/LawyerDashboardPreDockFeatureSurfaces')",
        );
        expect(src).toContain('LazyLawyerDashboardNavigationIsland');
        expect(src).toContain('onLawyerDashboardFirstTabOpen');
    });

    it('cluster enrichment hooks تُؤجَّل حتى first-tab-open', () => {
        const src = [
            readFileSync(
                join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts'),
                'utf8',
            ),
            readFileSync(
                join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
                'utf8',
            ),
        ].join('\n');
        expect(src).toContain('useAfterFirstTabOpen');
        expect(src).toContain('afterFirstTabOpen');
        expect(src).toMatch(
            /useVaultDocsForClusterScan\([\s\S]*?backgroundRuntimeEnabled && afterFirstTabOpen/,
        );
        expect(src).toMatch(
            /useCalendarEventsForClusterScan\([\s\S]*?backgroundRuntimeEnabled && afterFirstTabOpen/,
        );
    });

    it('Inner home-first — orchestration كسول بعد first-tab-open', () => {
        const inner = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        expect(inner).toContain('LawyerSettingsBootProvider');
        expect(inner).toContain('beginLawyerDashboardBootCycle');
        expect(inner).not.toContain('loadLawyerDashboardMinimalBoot');
        expect(inner).not.toContain('LawyerSettingsProvider');
        expect(inner).toContain('LawyerDashboardFullBootPath');
        expect(inner).not.toContain('LazyLawyerDashboardFullBootPath');
        expect(inner).not.toContain('useAfterFirstTabOpen');
        expect(inner).not.toMatch(/useLawyerDashboardPreWorkspaceOrchestration\s*\(/);
    });
});
