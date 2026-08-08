import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('forum dock section surgical close honesty', () => {
    it('PostModeration ┘╪د ┘è╪▒╪│┘ ╪ث╪ص╪»╪د╪س ╪ز╪╡╪ص┘è╪ص ╪ح┘┘ë 127.0.0.1:7777', () => {
        const mod = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenPostModeration.ts',
            ),
            'utf8',
        );
        expect(mod).not.toContain('127.0.0.1:7777');
        expect(mod).not.toContain('debug-point');
    });

    it('MainView: Community Entry sync ╪ذ┘╪د Suspense╪ؤ Host keepAlive + isOpen', () => {
        const main = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('LawyerDashboardCommunityOverlayEntry');
        expect(main).not.toContain('LazyCommunityOverlayEntry');
        expect(main).not.toMatch(
            /communityLive[\s\S]*?CommunityScreenLoadingFallback[\s\S]*?LawyerDashboardCommunityOverlayEntry/,
        );
        const communityIdx = main.indexOf('communityLive ?');
        expect(communityIdx).toBeGreaterThan(-1);
        const nextOverlay = main.indexOf('executionLive ?', communityIdx);
        const communityBlock = main.slice(
            communityIdx,
            nextOverlay > communityIdx ? nextOverlay : undefined,
        );
        expect(communityBlock).toContain('LawyerDashboardCommunityOverlayEntry');
        expect(communityBlock).not.toContain('<Suspense');
        expect(communityBlock).not.toContain('CommunityScreenLoadingFallback');
        const entry = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCommunityOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('keepAlive={communityHostMounted}');
        expect(entry).toContain('isOpen={showCommunity}');
        expect(entry).not.toContain('CommunityScreenLoadingFallback');
        expect(entry).not.toContain('Suspense');
    });

    it('╪ذ╪╣╪» boot-reveal: ╪ز╪│╪«┘è┘ ╪ذ┘╪د arm╪ؤ ╪ذ╪╣╪» interactive: arm Host ┘à╪س┘ ╪د┘╪ح╪╣╪»╪د╪»╪د╪ز', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCommunity.ts'),
            'utf8',
        );
        expect(hook).toContain('prefetchForumAfterBootReveal');
        expect(hook).toContain('prefetchCommunityOverlayEntry');
        const warmBlock = hook.match(
            /const scheduleWarm = \(\) => \{[\s\S]*?\n        \};/,
        )?.[0];
        expect(warmBlock).toBeTruthy();
        expect(warmBlock).toContain('prefetchForumAfterBootReveal');
        expect(warmBlock).not.toContain('armCommunityHost');
        expect(warmBlock).not.toContain('setCommunityHostMounted(true)');
        expect(hook).toMatch(
            /onDashboardInteractive\(\(\) => \{[\s\S]*?setCommunityHostMounted\(true\)/,
        );
    });

    it('╪د┘┘à┘╪ز╪»┘ë ╪ص┘è ┘┘è orchestration ╪«╪د╪▒╪ش ╪د┘╪ش╪▓┘è╪▒╪ر ╪د┘┘à╪ج╪ش┘ّ┘╪ر (┘à╪س┘ ╪د┘╪ح╪╣╪»╪د╪»╪د╪ز)', () => {
        const orch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
            'utf8',
        );
        expect(orch).toContain('useLawyerDashboardCommunity');
        expect(orch).toContain('communityFeature');
        const stubs = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/createDeferredFeatureStubs.ts'),
            'utf8',
        );
        expect(stubs).not.toContain("requestArm('community')");
        expect(stubs).not.toContain('openCommunityTab:');
        const deferred = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.tsx',
            ),
            'utf8',
        );
        expect(deferred).not.toContain('useLawyerDashboardCommunity');
        expect(deferred).toContain('params.setShowCommunity');
        expect(deferred).toContain('params.closeCommunity');
    });

    it('┘à╪│╪د╪▒ ╪د┘┘╪ز╪ص ┘╪د ┘è┘â╪▒╪▒ hydrate ╪ذ╪╣╪» warmForumOnOpen', () => {
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/community/communityShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('warmForumOnOpen');
        expect(openFlow).not.toContain('hydrateCommunityShellForInstantOpen');
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCommunity.ts'),
            'utf8',
        );
        expect(hook).toContain('commitCommunityOpen');
    });

    it('╪ذ┘╪د╪╖╪ر ╪د┘┘à┘╪ز╪»┘ë ╪ز╪│╪ز╪«╪»┘à HomeMessageCircleIcon ╪ذ╪»┘ lucide MessageCircle', () => {
        const home = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(home).toContain('HomeMessageCircleIcon');
        expect(home).toContain('data-testid="home-dock-forum"');
        expect(home).not.toMatch(/\bMessageCircle\b/);
        /* ┘é╪» ┘è╪«╪ز┘┘è lucide ╪ذ╪د┘┘â╪د┘à┘ ┘à┘ HomeTab ظ¤ ┘╪د ┘┘╪▒╪╢ ┘ê╪ش┘ê╪» ╪د┘╪د╪│╪ز┘è╪▒╪د╪» */
        if (home.includes("from 'lucide-react'")) {
            expect(home).not.toMatch(/MessageCircle,\s*\n\s*Warehouse/);
            expect(home).not.toMatch(/,\s*MessageCircle\s*[,}]/);
        }
    });

    it('┘╪ز╪ص ╪د┘┘à┘╪ز╪»┘ë ┘à╪د ╪▓╪د┘ ╪╣╪ذ╪▒ isRealSignedIn(userId) ┘ê┘┘è╪│ null', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCommunity.ts'),
            'utf8',
        );
        expect(hook).toContain('isRealSignedIn(userId)');
        expect(hook).not.toContain('isRealSignedIn(null)');
    });

    it('CommunityScreenHost ┘à╪ز╪▓╪د┘à┘ ظ¤ ╪ذ┘╪د dynamic import ┘ê┘╪د InstantShell', () => {
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/CommunityScreen/CommunityScreenHost.tsx'),
            'utf8',
        );
        expect(host).toContain("from '@/app/components/lawyer/CommunityScreen'");
        expect(host).toContain('<CommunityScreen {...props} />');
        expect(host).not.toContain('CommunityScreenLoadingFallback');
        expect(host).not.toContain('loadCommunityScreenModule');
        const loader = fs.readFileSync(
            path.join(root, 'src/app/runtime/communityHubLoader.ts'),
            'utf8',
        );
        expect(loader).toContain('isCommunityScreenModuleResolved');
        expect(loader).toMatch(/return true/);
    });
});
