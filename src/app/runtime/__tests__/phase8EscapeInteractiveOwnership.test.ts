import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('phase-8 escape + interactive ownership', () => {
    it('MainView يملك Escape التنفيذ مرة واحدة', () => {
        const main = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('useLawyerExecutionOverlayEscape');
        expect(main).toContain('archiveOpen: executionLive');
        expect(main).toContain('executionFileOpen: Boolean(executionDossierLive)');
        expect(main).toContain('executionCreateOpen: executionCreateLive');
    });

    it('Entry/Portal/Creation لا تسجّل Escape مكرراً', () => {
        const entry = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
            ),
            'utf8',
        );
        const dossier = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ExecutionDashboardPortal.tsx'),
            'utf8',
        );
        const create = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ExecutionCreationPortal.tsx'),
            'utf8',
        );
        const shell = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ExecutionArchiveShell.tsx'),
            'utf8',
        );
        expect(entry).not.toContain('useLawyerExecutionOverlayEscape');
        expect(dossier).not.toContain('useLawyerExecutionOverlayEscape');
        expect(create).not.toContain('useLawyerExecutionOverlayEscape');
        expect(shell).not.toContain("event.key !== 'Escape'");
    });

    it('مساحة الدعاوى تعطّل Escape تحت الجزائي عبر escapeEnabled', () => {
        const entry = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardLawsuitsOverlayEntry.tsx',
            ),
            'utf8',
        );
        const host = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawsuitsWorkspaceHost.tsx'),
            'utf8',
        );
        const shell = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawsuitsWorkspaceShell.tsx'),
            'utf8',
        );
        expect(entry).toContain('escapeEnabled={visible && !overlays.criminalDashboardCaseId}');
        expect(host).toContain('escapeEnabled={escapeEnabled && active}');
        expect(shell).toContain('escapeEnabled');
        expect(shell).toContain('stopImmediatePropagation');
    });

    it('HomeTab يعلّم first-tab-open فقط؛ MainView يملك interactive', () => {
        const home = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        const main = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(home).not.toContain('markDashboardInteractiveOnce');
        expect(home).toContain("markBootPhase('first-tab-open')");
        expect(main).toContain('markDashboardInteractiveOnce');
    });

    it('ExecutionArchiveOverlayHost و CaseOverlays و OverlaysHost محذوفة', () => {
        expect(() =>
            readFileSync(
                join(root, 'src/app/components/lawyer/dashboard/ExecutionArchiveOverlayHost.tsx'),
                'utf8',
            ),
        ).toThrow();
        expect(() =>
            readFileSync(
                join(
                    root,
                    'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCaseOverlays.tsx',
                ),
                'utf8',
            ),
        ).toThrow();
        expect(() =>
            readFileSync(
                join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardOverlaysHost.tsx'),
                'utf8',
            ),
        ).toThrow();
    });

    it('مسبار DEV للجدول الزمني موجود دون ادعاء قياس جهاز', () => {
        const metrics = readFileSync(join(root, 'src/app/bootstrap/bootMetrics.ts'), 'utf8');
        expect(metrics).toContain('__hamiBootTimeline');
        expect(metrics).toContain('getDashboardInteractiveMs');
        expect(metrics).toContain('getFirstTabOpenMs');
    });
});
