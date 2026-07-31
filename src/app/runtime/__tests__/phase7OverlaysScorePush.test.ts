import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('phase-7 overlays score push — security + mobile ownership', () => {
    it('MainView يملك Escape/native-back للأرشيف غير التنفيذي', () => {
        const main = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        const hook = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerNonExecArchiveEscape.ts'),
            'utf8',
        );
        expect(main).toContain('useLawyerNonExecArchiveEscape');
        expect(main).toContain('nonExecArchiveLive');
        expect(hook).toContain('registerNativeBackHandler');
        expect(hook).toContain("event.key !== 'Escape'");
    });

    it('NonExec ArchivePortal يعطّل Escape المحلي (escapeEnabled=false)', () => {
        const entry = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardNonExecArchiveOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('escapeEnabled={false}');
    });

    it('فتح التنفيذ من المسبح فقط + عقد + بدون spread بطاقة', () => {
        const execHook = readFileSync(join(root, 'src/app/hooks/useLawyerExecutionFiles.ts'), 'utf8');
        const entry = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(execHook).toContain('openExecutionDossierWithContract');
        expect(execHook).toContain('executionFiles.find');
        expect(execHook).toContain('if (!fromPool) return false');
        expect(entry).toContain("type: 'execution'");
        expect(entry).not.toMatch(/onOpenFile\(\{\s*\.\.\./);
    });

    it('resolveOpenableFileData يرفض id غير معروف عند وجود pool', () => {
        const utils = readFileSync(
            join(root, 'src/app/components/lawyer/LawyerDashboardParts/utils.ts'),
            'utf8',
        );
        expect(utils).toContain('resolveOpenableFileData');
        expect(utils).toContain('if (!hit) return null');
        expect(utils).toContain('pool.find');
    });

    it('native back يوازي Escape في الدعاوى / SmartFile / الجزائي', () => {
        const lawsuits = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawsuitsWorkspaceShell.tsx'),
            'utf8',
        );
        const smart = readFileSync(
            join(root, 'src/app/components/lawyer/smart-modal/SmartFileModalContent.tsx'),
            'utf8',
        );
        const criminal = readFileSync(
            join(root, 'src/app/components/lawyer/criminal-system/useCriminalDashboardNavigationGuard.ts'),
            'utf8',
        );
        for (const src of [lawsuits, smart, criminal]) {
            expect(src).toContain('registerNativeBackHandler');
        }
    });

    it('ClientRequests: noopener + scroll lock + 44px/safe-area بدون native-back مكرر', () => {
        const hub = readFileSync(join(root, 'src/app/components/lawyer/ClientRequestsHub.tsx'), 'utf8');
        expect(hub).toContain("noopener,noreferrer");
        expect(hub).toContain('useBodyScrollLock');
        expect(hub).toContain('min-h-[44px]');
        expect(hub).toContain('safe-area-inset-top');
        expect(hub).not.toContain('registerNativeBackHandler');
    });

    it('بوابات signed-in على فتح الأرشيف / الدعاوى / الجزائي', () => {
        const lawsuit = readFileSync(join(root, 'src/app/hooks/useLawsuitActiveDossier.ts'), 'utf8');
        const overlays = readFileSync(join(root, 'src/app/hooks/useLawyerDashboardOverlays.ts'), 'utf8');
        const tabBundle = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts'),
            'utf8',
        );
        expect(lawsuit).toContain('isRealSignedIn');
        expect(lawsuit).toContain('openLawsuitDossierWithContract');
        expect(overlays).toContain('openCriminalDossierWithContract');
        expect(overlays).toContain('isRealSignedIn');
        expect(tabBundle).toContain('isRealSignedIn');
    });
});
