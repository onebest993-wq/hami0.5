import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('profile tab host — no skeleton on first open', () => {
    it('ProfileTabHost يستورد الشجرة ثابتاً بلا Suspense/قشرة', () => {
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/profile/ProfileTabHost.tsx'),
            'utf8',
        );
        expect(host).toContain('import { LawyerDashboardProfileTab }');
        expect(host).toContain('return <LawyerDashboardProfileTab');
        expect(host).toContain('markRoyalLawyerProfileModuleResolved');
        expect(host).not.toContain('lazyWithRetry');
        expect(host).not.toContain('<Suspense');
        expect(host).not.toContain('LawyerProfileTabLoadingFallback');
        expect(host).not.toContain('ProfileInstantShell');
        expect(host).not.toContain('getCachedLawyerDashboardProfileTab');
        expect(host).not.toContain('profileTabModuleLoader');
    });

    it('لوحة المحامي لا تستبدل المحتوى بقشرة هيكل', () => {
        const index = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/RoyalLawyerProfile/index.tsx'),
            'utf8',
        );
        expect(index).toContain('hasRenderableProfile || (isScreenMode && !profile.loadError)');
        expect(index).not.toContain('ProfileInstantShell');
        expect(index).not.toContain('profilePageFxLoader');
    });

    it('الملف حي في orchestration مثل الإعدادات — بلا قشور ميتة', () => {
        const orch = [
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts'),
                'utf8',
            ),
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
                'utf8',
            ),
        ].join('\n');
        const deferred = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.tsx',
            ),
            'utf8',
        );
        const stubs = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/createDeferredFeatureStubs.ts'),
            'utf8',
        );
        const paint = fs.readFileSync(
            path.join(root, 'src/app/runtime/profileInstantPaint.ts'),
            'utf8',
        );
        const main = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(orch).toContain('createBootChromeFeatureStubs');
        expect(orch).toContain('profileFeature');
        expect(orch).toContain('const profileTab = profileFeature');
        expect(orch).not.toMatch(/import \{ useLawyerDashboardProfileTab \} from/);
        expect(deferred).not.toContain('useLawyerDashboardProfileTab');
        expect(stubs).not.toContain('openProfileTab');
        expect(stubs).not.toContain('profilePrime');
        expect(paint).toContain('isHomeFirstPaintCovering');
        expect(paint).toContain('isProfileLiveContentReady');
        expect(paint).toContain('scheduleLiveSnap');
        expect(main).toContain('LazyProfileTabHost');
        expect(main).toContain('ProfilePagePaintGate');
        expect(main).not.toContain('<ProfilePaintGate');
        expect(main).not.toContain('ProfileOpenInstantChrome');
        expect(main).not.toContain('ProfileTabHostGate');
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        expect(hook).not.toContain('profileTabSessionKey');
        expect(hook).not.toContain('loadProfileTabModule');
        expect(fs.existsSync(path.join(root, 'src/app/runtime/profileTabModuleLoader.ts'))).toBe(false);
        expect(fs.existsSync(path.join(root, 'src/app/runtime/profileHubLoader.ts'))).toBe(false);
        expect(fs.existsSync(path.join(root, 'src/app/hooks/lawyerDashboard/profileIntentWarm.ts'))).toBe(
            false,
        );
        expect(fs.existsSync(path.join(root, 'src/app/components/lawyer/RoyalLawyerProfile/ProfileInstantShell.tsx'))).toBe(
            false,
        );
        expect(
            fs.existsSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/profile/useProfileShellReadiness.ts'),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/profile/ProfilePaintGate.tsx'),
            ),
        ).toBe(false);
        const paintGate = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/profile/ProfilePagePaintGate.tsx'),
            'utf8',
        );
        expect(paintGate).toContain("const PROFILE_PAINT_SLOT_CLASS = 'h-full min-h-[100dvh]'");
        expect(paintGate).toContain('live');
        expect(paintGate).toContain('PROFILE_PAINT_SLOT_CLASS');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/profile/ProfilePagePaintGate.tsx'),
            ),
        ).toBe(true);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/profile/ProfileOpenFirstPage.tsx'),
            ),
        ).toBe(true);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/profile/ProfileOpenInstantChrome.tsx'),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/profile/profileLivePaint.ts'),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileBelowFoldArmed.ts',
                ),
            ),
        ).toBe(false);
    });
});
