import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(resolve(root, rel), 'utf8');
}

describe('profile first-open split — complete page, lighter first graph', () => {
    it('لا يعيد InstantChrome / أسفل-الطية / جسر الهوية', () => {
        const paint = read('src/app/runtime/profileInstantPaint.ts');
        const content = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileContent.tsx',
        );
        const body = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileContentBodySections.tsx',
        );
        const index = read('src/app/components/lawyer/RoyalLawyerProfile/index.tsx');
        const host = read('src/app/components/lawyer/dashboard/profile/ProfileTabHost.tsx');

        expect(paint).not.toContain('profile-open-instant-chrome');
        expect(paint).not.toContain('ensureProfileInstantBridge');
        expect(paint).toContain('FIRST_PAGE_SELECTOR');
        expect(paint).toContain('LIVE_TREE_SELECTOR');
        expect(content).not.toContain('useProfileBelowFoldArmed');
        expect(content).toContain('ProfileFirstPaintTree');
        expect(content).toContain('armEditOnPointerDown={false}');
        expect(content).not.toContain('<ProfilePaintGate');
        expect(index).not.toContain('ProfileInstantShell');
        expect(host).not.toContain('ProfileTabHostGate');
        expect(body).not.toContain('useProfileBelowFoldArmed');
    });

    it('أول طلاء ثابت: هيرو + قنوات + معرض — الكتل والمُعاين خارج التقييم الأول', () => {
        const body = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileContentBodySections.tsx',
        );
        const gallery = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileGallerySection.tsx',
        );
        const fx = read('src/app/components/lawyer/RoyalLawyerProfile/profilePageFx.css');
        const blocks = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileCustomBlocks.tsx',
        );
        const extras = read('src/app/runtime/profilePageExtrasPrefetch.ts');

        expect(body).toContain('ProfileContactSection');
        expect(body).toContain('ProfileGallerySection');
        expect(body).toContain("import('./ProfileCustomBlocks')");
        expect(body).not.toContain("import { ProfileCustomBlocks }");
        expect(body).toContain('data-profile-blocks-pending');
        expect(body).toContain('shouldMountProfileCustomBlocks');

        expect(gallery).toContain("import('./ProfileGalleryViewer')");
        expect(gallery).not.toContain("import { ProfileGalleryViewer }");

        expect(fx).not.toMatch(/@import\s+['"].*profilePageBlockFx/);
        expect(fx).not.toMatch(/@import\s+['"].*profileImageFx/);
        expect(blocks).toContain('profilePageBlockFx.css');

        expect(extras).toContain('ProfileCustomBlocks');
        expect(extras).not.toContain('ProfileGalleryViewer');
    });

    it('صفحة الفتح الكاملة تُرسم مع النقرة — الشجرة الحية تُعتمد تحتها', () => {
        const main = read('src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx');
        const gate = read(
            'src/app/components/lawyer/dashboard/profile/ProfilePagePaintGate.tsx',
        );
        const flow = read('src/app/hooks/lawyerDashboard/profile/profileShellOpenFlow.ts');
        expect(main).toContain('ProfilePagePaintGate');
        expect(gate).toContain('ProfileOpenFirstPage');
        expect(gate).toContain('useProfilePageLivePaint');
        const livePaint = read(
            'src/app/components/lawyer/dashboard/profile/useProfilePageLivePaint.ts',
        );
        expect(livePaint).toContain('MutationObserver');
        const model = read(
            'src/app/components/lawyer/dashboard/profile/useProfileOpenFirstPageModel.ts',
        );
        expect(model).toContain('subscribeUserIdentityUiState');
        expect(model).toContain('subscribeProfileWarmCache');
        expect(model).toContain('setCoverCustomization');
        const commit = flow.slice(flow.indexOf('export function commitProfileOpen'));
        expect(commit).toContain('flushSync');
        expect(commit.indexOf('prepareProfileOpenPaint')).toBeLessThan(commit.indexOf('flushSync'));
        expect(commit.indexOf('flushSync')).toBeLessThan(commit.indexOf('revealProfileWarmShell()'));

        const openPage = read(
            'src/app/components/lawyer/dashboard/profile/ProfileOpenFirstPage.tsx',
        );
        const firstTree = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileFirstPaintTree.tsx',
        );
        expect(openPage).toContain('ProfileFirstPaintTree');
        expect(openPage).toContain('ProfilePageSurfaceFrame');
        expect(openPage).toContain('openFirstPage');
        expect(openPage).toContain('armEditOnPointerDown');
        expect(openPage).not.toContain("components/ProfileContent'");
        const surface = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfilePageSurfaceFrame.tsx',
        );
        expect(surface).toContain('data-profile-open-first-page');
        expect(surface).toContain('data-profile-live-tree');
        expect(surface).toContain('data-lawyer-profile-root');
        expect(openPage).not.toContain('ProfileSettingsSheetHost');
        expect(openPage).not.toContain('useProfilePageAccess');
        expect(openPage).not.toContain('useAccreditedLawyerMark');
        expect(openPage).not.toContain('ProfilePageAccessBlocked');
        expect(/from '@\/app\/utils\/lazyComponents['"]/.test(openPage)).toBe(false);
        expect(firstTree).toContain('ProfileContentBodySections');
        expect(firstTree).not.toContain('ProfileSettingsSheetHost');
        expect(firstTree).not.toContain('ProfilePageAccessBlocked');
        expect(/from '@\/app\/utils\/lazyComponents['"]/.test(firstTree)).toBe(false);
        const liveContent = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileContent.tsx',
        );
        expect(liveContent).toContain('ProfileSettingsSheetHost');
        expect(liveContent).toContain('ProfilePageAccessBlocked');
    });

    it('تسخين الكتل بعد Royal لا معه — حتى لا ينافس أول تقييم', () => {
        const hydrator = read('src/app/runtime/profileBootHydrator.ts');
        const lazy = read('src/app/hooks/lawyerDashboard/profile/profileLazyImports.ts');
        const hubFn = hydrator.slice(
            hydrator.indexOf('export function prefetchProfileHubAfterInteractive'),
            hydrator.indexOf('export function hydrateProfileShellForInstantOpenWithData'),
        );
        expect(hubFn.indexOf('loadProfileHubModule')).toBeLessThan(
            hubFn.indexOf('prefetchPageExtrasAfterHub'),
        );
        expect(lazy).toContain('profilePageExtrasPrefetch');
        const afterHub = lazy.slice(lazy.indexOf('loadProfileHubModule'));
        expect(afterHub.indexOf('loadProfileHubModule')).toBeLessThan(
            afterHub.indexOf('profilePageExtrasPrefetch'),
        );
    });
});
