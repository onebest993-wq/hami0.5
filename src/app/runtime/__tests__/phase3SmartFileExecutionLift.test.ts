import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('Phase 3 — SmartFile/Execution lift + Escape ownership (after Phase 4)', () => {
    it('MainView يركّب SmartFile + Execution dossier/create خارج Host', () => {
        const src = readLawyerDashboardMainViewSurface();
        expect(src).toContain('LazySmartFileOverlayEntry');
        expect(src).toContain('LawyerDashboardExecutionDossierOverlayEntry');
        expect(src).toContain('LawyerDashboardExecutionCreateOverlayEntry');
        expect(src).toContain('smartFileLive');
        expect(src).toContain('executionDossierLive');
        expect(src).toContain('executionCreateLive');
        expect(src).toContain('useLawyerExecutionOverlayEscape');
        expect(src).toContain('archiveOpen: executionArchiveOpen');
        expect(src).toContain('executionFileOpen: Boolean(executionDossierLive)');
        expect(src).toContain('executionCreateOpen: executionCreateLive');
    });

    it('CaseOverlays محذوف — لا بقايا SmartFile/Execution', () => {
        expect(() =>
            readFileSync(
                join(
                    root,
                    'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCaseOverlays.tsx',
                ),
                'utf8',
            ),
        ).toThrow();
    });

    it('OverlaysHost محذوف', () => {
        expect(() =>
            readFileSync(
                join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardOverlaysHost.tsx'),
                'utf8',
            ),
        ).toThrow();
    });

    it('ExecutionArchiveInstantChrome لا يسجّل Escape مكرراً ولا يضاعف قفل التمرير', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ExecutionArchiveInstantChrome.tsx'),
            'utf8',
        );
        expect(src).not.toContain("event.key !== 'Escape'");
        expect(src).not.toContain('addEventListener');
        expect(src).not.toContain('useBodyScrollLock');
    });

    it('notesHydrated يبدأ غير مستقر مع backgroundRuntimeEnabled', () => {
        const src = readFileSync(join(root, 'src/app/hooks/useLawyerGlobalNotes.ts'), 'utf8');
        expect(src).toContain('useState(!backgroundRuntimeEnabled)');
        expect(src).toContain('setNotesHydrated(true)');
        expect(src).not.toContain('notesBootSettled');
        expect(src).not.toContain('setNotesBootSettled');
    });
});
