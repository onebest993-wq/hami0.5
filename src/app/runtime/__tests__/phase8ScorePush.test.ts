import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('phase-8 score push — stem cuts + open contracts', () => {
    it('Escape التنفيذ لا يسحب executionDashboardStore sync', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerExecutionOverlayEscape.ts'),
            'utf8',
        );
        expect(src.includes("from '@/app/stores/executionDashboardStore'")).toBe(false);
        expect(src).toContain("import('@/app/stores/executionDashboardStore')");
    });

    it('orchestration يستخدم CalendarClusterLite بدون incremental sync', () => {
        const orch = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
            'utf8',
        );
        expect(orch).toContain('useLawyerDashboardCalendarClusterLite');
        expect(orch).not.toContain('useLawyerDashboardCalendarCluster(');
        expect(orch).not.toContain('useLawyerDashboardRuntimeEffects');
    });

    it('Header لا يستورد motion', () => {
        const header = readFileSync(
            join(root, 'src/app/components/lawyer/LawyerDashboardParts/components/Header.tsx'),
            'utf8',
        );
        expect(header).not.toContain("from 'motion/react'");
        expect(header).toContain('<header');
    });

    it('فتح الجدول/البحث/التنقّل يمر عبر عقود + pool', () => {
        const tab = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts'),
            'utf8',
        );
        const search = readFileSync(
            join(root, 'src/app/hooks/useLawyerDashboardGlobalSearchNav.ts'),
            'utf8',
        );
        const nav = readFileSync(
            join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(tab).toContain('openExecutionDossierWithContract');
        expect(tab).toContain('openLawsuitDossierWithContract');
        expect(tab).toContain('resolveOpenableFileData');
        expect(search).toContain('openExecutionDossierWithContract');
        expect(search).toContain('openLawsuitDossierWithContract');
        expect(nav).toContain('openExecutionDossierWithContract');
        expect(nav).toContain('openLawsuitDossierWithContract');
    });

    it('NonExec يمرّر id فقط للتنفيذ', () => {
        const entry = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardNonExecArchiveOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain("type: 'execution'");
        expect(entry).toContain('id: f.id');
    });
});
