import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Phase 3 — SmartFile/Execution lift + Escape ownership (after Phase 4)', () => {
    it('MainView يركّب SmartFile + Execution dossier/create خارج Host', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(src).toContain('LawyerDashboardSmartFileOverlayEntry');
        expect(src).toContain('LawyerDashboardExecutionDossierOverlayEntry');
        expect(src).toContain('LawyerDashboardExecutionCreateOverlayEntry');
        expect(src).toContain('smartFileLive');
        expect(src).toContain('executionDossierLive');
        expect(src).toContain('executionCreateLive');
        expect(src).toContain('useLawyerExecutionOverlayEscape');
        expect(src).toContain('archiveOpen: executionLive');
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

    it('ExecutionArchiveShell لا يسجّل Escape مكرراً ولا يضاعف قفل التمرير', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ExecutionArchiveShell.tsx'),
            'utf8',
        );
        expect(src).not.toContain("event.key !== 'Escape'");
        expect(src).not.toContain('addEventListener');
        expect(src).not.toContain('useBodyScrollLock');
    });

    it('notesBootSettled يبدأ غير مستقر مع backgroundRuntimeEnabled', () => {
        const src = readFileSync(join(root, 'src/app/hooks/useLawyerGlobalNotes.ts'), 'utf8');
        expect(src).toContain('useState(!backgroundRuntimeEnabled)');
        expect(src).toContain('setNotesBootSettled(false)');
        expect(src).toContain('setNotesBootSettled(true)');
    });
});
