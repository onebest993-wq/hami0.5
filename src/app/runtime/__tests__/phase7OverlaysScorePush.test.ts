import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('phase-7 overlays score push — security + mobile ownership', () => {
    it('MainView يملك Escape/native-back للأرشيف غير التنفيذي', () => {
        const main = readLawyerDashboardMainViewSurface();
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

    it('resolveOpenableFileData يفضّل pool ثم يقع لصف البطاقة إن غاب عن النشطة', () => {
        const utils = readFileSync(
            join(root, 'src/app/components/lawyer/LawyerDashboardParts/utils.ts'),
            'utf8',
        );
        expect(utils).toContain('resolveOpenableFileData');
        expect(utils).toContain('pool.find');
        expect(utils).toContain('if (hit) return normalizeFileDataForOpen(hit)');
        expect(utils).toContain('return normalizeFileDataForOpen(value)');
        expect(utils).not.toContain('if (!hit) return null');
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

    it('صندوق طلبات التوكيل محذوف من الواجهة والأرشيف', () => {
        expect(existsSync(join(root, 'src/app/components/lawyer/ClientRequestsHub.tsx'))).toBe(false);
        const entry = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardNonExecArchiveOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).not.toContain('LazyClientRequestsHub');
        expect(entry).not.toContain('client_requests');
        const lazy = readFileSync(join(root, 'src/app/utils/lazyComponents.tsx'), 'utf8');
        expect(lazy).not.toContain('LazyClientRequestsHub');
        expect(lazy).not.toContain('ClientRequestsHub');
    });

    it('طبقات ملء الشاشة تحجز شريط الحالة عبر --hami-lawyer-header-safe-top', () => {
        const overlayPortal = readFileSync(join(root, 'src/app/utils/overlayPortal.ts'), 'utf8');
        const tasks = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/TasksManagerOverlay.tsx'),
            'utf8',
        );
        const forum = readFileSync(
            join(root, 'src/app/components/lawyer/CommunityScreen/forumPlumTheme.ts'),
            'utf8',
        );
        const repo = readFileSync(
            join(root, 'src/app/components/lawyer/SmartRepository/smartRepositoryTheme.ts'),
            'utf8',
        );
        expect(overlayPortal).toContain('HAMI_OVERLAY_SAFE_INSETS_CLASS');
        expect(overlayPortal).toContain('--hami-lawyer-header-safe-top');
        expect(tasks).toContain('HAMI_OVERLAY_SAFE_INSETS_CLASS');
        expect(forum).toContain('--hami-lawyer-header-safe-top');
        expect(repo).toContain('--hami-lawyer-header-safe-top');
        const gesture = readFileSync(join(root, 'src/app/runtime/overlayEdgeBackGesture.ts'), 'utf8');
        expect(gesture).toContain('dispatchNativeBack');
        const lifecycle = readFileSync(join(root, 'src/app/runtime/capacitorAppLifecycle.ts'), 'utf8');
        expect(lifecycle).toContain('wireOverlayEdgeBackGesture');
    });

    it('بوابات signed-in على فتح الأرشيف / الدعاوى / الجزائي', () => {
        const lawsuitOpen = readFileSync(
            join(root, 'src/app/hooks/useLawsuitActiveDossierOpenUpdate.ts'),
            'utf8',
        );
        const overlays = readFileSync(join(root, 'src/app/hooks/useLawyerDashboardOverlays.ts'), 'utf8');
        const tabBundle = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts'),
            'utf8',
        );
        expect(lawsuitOpen).toContain('hasLocalAppSession');
        expect(lawsuitOpen).toContain('openLawsuitDossierWithContract');
        expect(overlays).toContain('openCriminalDossierWithContract');
        expect(overlays).toContain('hasLocalAppSession');
        expect(tabBundle).toContain('hasLocalAppSession');
    });
});
