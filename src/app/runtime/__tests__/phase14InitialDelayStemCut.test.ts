import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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

    it('orch لا يستورد hooks الميزات الثقيلة المؤجّلة بشكل ثابت (المنتدى/الإعدادات حيّان)', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
            'utf8',
        );
        expect(src).toContain('createDeferredFeatureStubs');
        expect(src).toContain('deferredFeatureSurfacesProps');
        expect(src).toContain('useLawyerDashboardSettings');
        expect(src).toContain('useLawyerDashboardCommunity');
        expect(src).toContain('communityFeature');
        expect(src).toContain('useLawyerDashboardScheduleTab');
        expect(src).toContain('scheduleFeature');
        expect(src).toContain('useLawyerDashboardRepository');
        expect(src).toContain('repositoryFeature');
        expect(src).not.toMatch(
            /import \{[^}]*useLawyerDashboardTransactions[^}]*\} from/,
        );
        expect(src).not.toMatch(
            /import \{[^}]*useLawyerDashboardProfileTab[^}]*\} from/,
        );
        expect(src).not.toMatch(
            /import \{[^}]*useLawyerDashboardFieldTasks[^}]*\} from/,
        );
        expect(src).not.toMatch(
            /import \{[^}]*useLawyerDashboardGlobalSearch[^}]*\} from/,
        );
    });

    it('MainView يركّب DeferredFeatureSurfaces كسولًا', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(src).toContain('LazyLawyerDashboardDeferredFeatureSurfaces');
        expect(src).toContain(
            "import('@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces')",
        );
    });
});
