import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(resolve(root, rel), 'utf8');
}

describe('profile first elements paint honesty', () => {
    it('خمول ما بعد اللوحة يسخّن مقطع الملف قبل التنفيذ', () => {
        const chunks = read('src/app/runtime/overlayEntryChunks.ts');
        const profileIdx = chunks.indexOf("profile/ProfileTabHost");
        const executionIdx = chunks.indexOf('LawyerDashboardExecutionOverlayEntry');
        expect(profileIdx).toBeGreaterThan(0);
        expect(profileIdx).toBeLessThan(executionIdx);
        expect(chunks).toContain('prefetchProfileHubModule');
    });

    it('نية الفتح تطلب ProfileTabHost فوراً لا بعد سلسلة المحمّل فقط', () => {
        const lazy = read('src/app/hooks/lawyerDashboard/profile/profileLazyImports.ts');
        const hostIdx = lazy.indexOf("profile/ProfileTabHost");
        const loaderIdx = lazy.indexOf('royalLawyerProfileLoader');
        expect(hostIdx).toBeGreaterThan(0);
        expect(hostIdx).toBeLessThan(loaderIdx);
    });

    it('دخول الملف بلا تعتيم 0.62 ولا حركة translate على المحتوى', () => {
        const enter = read('src/app/components/lawyer/RoyalLawyerProfile/profilePageEnterFx.css');
        const critical = read('src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css');
        for (const css of [enter, critical]) {
            expect(css).not.toContain('opacity: 0.62');
            expect(css).toMatch(
                /html\[data-hami-profile-open='1'\] \[data-lawyer-profile-root\]\s*\{[^}]*opacity:\s*1/s,
            );
        }
    });

    it('الجسر لا يخفي الرئيسية قبل الصفحة الكاملة — snap عند الجسم الحي فقط', () => {
        const paint = read('src/app/runtime/profileInstantPaint.ts');
        expect(paint).toContain('isProfileLiveContentReady');
        expect(paint).toContain('isProfilePageComplete');
        expect(paint).toContain('data-profile-page-body');
        expect(paint).toContain('export const PROFILE_LIVE_PAINT_SETTLE_FRAMES');
        expect(paint).toContain('scheduleLiveSnap');
        expect(paint).toContain('commitLiveSurface');
        expect(paint).toContain('if (!forceVisible) return');
        expect(paint).toContain('PROFILE_LIVE_SHELL_READY_EVENT');
        expect(paint).not.toContain('isProfileSurfaceCovered');
        expect(paint).not.toContain('profile-open-instant-chrome');
        expect(paint).not.toContain('fillProfileInstantBridgeIdentity');
        expect(paint).not.toContain('ensureProfileInstantBridge');
        expect(paint).not.toContain('armOverlayEnterSettle');
        const loader = read(
            'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileLoader.ts',
        );
        expect(loader).toContain('seedFirstPaintProfile');
        expect(loader).toContain('} else if (!profileRef.current)');
        const seed = read(
            'src/app/components/lawyer/RoyalLawyerProfile/hooks/normalizeLoadedProfile.ts',
        );
        expect(seed).toContain('getUserIdentityUiState');
        const warm = read('src/app/services/profile/profileWarmCache.ts');
        expect(warm).toContain('profileImage');
        expect(warm).toContain('getUserIdentityUiState');
        const hydrator = read('src/app/runtime/profileBootHydrator.ts');
        expect(hydrator).toContain('prefetchProfileHubAfterInteractive');
        expect(hydrator).toContain('prefetchProfileAfterBootReveal');
        const afterBoot = hydrator.slice(
            hydrator.indexOf('export function prefetchProfileAfterBootReveal'),
            hydrator.indexOf('export function prefetchProfileHubAfterInteractive'),
        );
        expect(afterBoot).not.toContain('ProfileTabHost');
        expect(afterBoot).not.toContain('loadProfileHubModule');
        const hubFn = hydrator.slice(
            hydrator.indexOf('export function prefetchProfileHubAfterInteractive'),
            hydrator.indexOf('export function hydrateProfileShellForInstantOpenWithData'),
        );
        expect(hubFn).toContain('prefetchPageExtrasAfterHub');
        expect(hubFn.indexOf('loadProfileHubModule')).toBeLessThan(
            hubFn.indexOf('prefetchPageExtrasAfterHub'),
        );
    });

    it('جسم الملف يُرسم مع الكروم في نفس الشجرة — بلا قشرة InstantChrome ولا تأخير أسفل الطية', () => {
        const content = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileContent.tsx',
        );
        expect(content).not.toContain('useProfileBelowFoldArmed');
        expect(content).not.toContain('lazy(() =>');
        expect(content).toContain('ProfileFirstPaintTree');
        const firstTree = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileFirstPaintTree.tsx',
        );
        expect(firstTree).toMatch(
            /import \{ ProfileContentBodySections \} from '\.\/ProfileContentBodySections'/,
        );
        const lazy = read('src/app/hooks/lawyerDashboard/profile/profileLazyImports.ts');
        expect(lazy).not.toContain('ProfileContentBodySections');
        const main = read('src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx');
        expect(main).toContain('ProfilePagePaintGate');
        expect(main).not.toContain('<ProfilePaintGate');
        expect(main).not.toContain('ProfileOpenInstantChrome');
        expect(main).toContain('LazyProfileTabHost');
    });
});
