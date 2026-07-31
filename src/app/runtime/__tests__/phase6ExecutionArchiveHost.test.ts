import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Phase 6 — Execution ArchivePortalHost + archivePortalBoot', () => {
    it('ExecutionOverlayEntry لا يستورد ArchivePortal بشكل sync؛ القشرة في InstantChrome', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(src).toContain('ArchivePortalHost');
        expect(src).not.toContain('ExecutionArchiveShell');
        expect(src).not.toMatch(/import \{ ArchivePortal \} from/);
        expect(src).not.toContain('adoptCachedArchivePortal');
        expect(src).toContain('openExecutionCreationWithContract');
        const main = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('ExecutionArchiveInstantChrome');
    });

    it('لا يوجد استيراد sync لـ ArchivePortal من مسارات اللوحة الحية', () => {
        const main = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        const exec = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(main).not.toMatch(/from ['\"]@\/app\/components\/lawyer\/ArchivePortal['\"]/);
        expect(exec).not.toMatch(/from ['\"]@\/app\/components\/lawyer\/ArchivePortal['\"]/);
    });

    it('caseOverlaysBoot محذوف؛ archivePortalBoot هو المسار الحي', () => {
        expect(() =>
            readFileSync(join(root, 'src/app/runtime/caseOverlaysBoot.ts'), 'utf8'),
        ).toThrow();
        const boot = readFileSync(join(root, 'src/app/runtime/archivePortalBoot.ts'), 'utf8');
        expect(boot).toContain('prefetchArchivePortalShell');
        expect(boot).toContain('prefetchArchivePortalForWorkspace');
        const main = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        // التركيب الحي: InstantChrome + Entry sync keep-alive
        expect(main).toContain('ExecutionArchiveInstantChrome');
        expect(main).toContain('LawyerDashboardExecutionOverlayEntry');
        expect(main).not.toContain('LazyExecutionOverlayEntry');
    });
});
