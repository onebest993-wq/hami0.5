import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readCommandHubImplSource } from './readCommandHubImplSource';
import {
    readLawyerDashboardMainViewOverlayHosts,
    readLawyerDashboardMainViewSurface,
} from './readLawyerDashboardMainViewSurface';

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

    it('MainView: Community Entry كسول مع تسخين؛ الفتح ينتظر المقطع', () => {
        const main = readLawyerDashboardMainViewSurface();
        const hosts = readLawyerDashboardMainViewOverlayHosts();
        /*
         * كسول عبر communityOverlayEntryLoader. التركيب قبل resolve كان يعلق Suspense
         * عند النقر المبكر؛ commitCommunityOpen ينتظر loadCommunityOverlayEntry أولاً.
         */
        expect(main).toContain('LazyCommunityOverlayEntry');
        expect(main).toContain('loadCommunityOverlayEntry');
        expect(main).not.toMatch(/import \{ LawyerDashboardCommunityOverlayEntry \} from/);
        const communityIdx = hosts.indexOf('communityLive ?');
        expect(communityIdx).toBeGreaterThan(-1);
        const nextOverlay = hosts.indexOf('executionLive ?', communityIdx);
        const communityBlock = hosts.slice(
            communityIdx,
            nextOverlay > communityIdx ? nextOverlay : undefined,
        );
        expect(communityBlock).toContain('LazyCommunityOverlayEntry');
        expect(communityBlock).toContain('Suspense');
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
        expect(entry).toContain('createPortal');
        expect(entry).toContain('getForumOverlayPortalRoot');
        const forumPortal = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/CommunityScreen/forumOverlayPortal.ts'),
            'utf8',
        );
        expect(forumPortal).toContain('hami-overlay-portal');
        expect(entry).toContain('useState(() =>');
        expect(entry).toContain('createPortal(overlay, portalRoot)');
        expect(entry).not.toContain('createPortal(overlay, getForumOverlayPortalRoot())');
        expect(entry).not.toContain('CommunityScreenLoadingFallback');
        expect(entry).not.toContain('Suspense');
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/community/communityShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('loadCommunityOverlayEntry');
        expect(openFlow).toContain('isCommunityOverlayEntryResolved');
        expect(openFlow).toContain('hostAlreadyMounted');
        expect(openFlow).toContain('applyForumOpaqueChrome');
        expect(openFlow).toContain('paintForumInstantChrome');
        expect(openFlow).toContain('beginHubLayerExit');
    });

    it('تسخين بعد boot-reveal فقط بلا arm؛ لا interactive/content-ready أثناء الكشف؛ التركيب عند الفتح', () => {
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
        expect(hook).toContain('onDashboardInteractive');
        expect(hook).not.toContain('onBootContentReady');
        expect(hook).not.toMatch(
            /onDashboardInteractive\(\(\) => \{[\s\S]*?prefetchCommunityOverlayEntry/,
        );
        expect(hook).toContain('بلا تركيب Host حتى الفتح');
        expect(hook).not.toContain('Host يُركَّب مخفياً بعد content-ready');
        const primeBlock = hook.match(
            /const primeCommunityShellMount = useCallback\(\(\) => \{[\s\S]*?\}, \[warmCommunityPrimeChain\]\);/,
        )?.[0];
        expect(primeBlock).toBeTruthy();
        expect(primeBlock).toContain('warmCommunityPrimeChain');
        expect(primeBlock).not.toContain('setCommunityHostMounted');
        const closeFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/community/communityShellOpenFlow.ts'),
            'utf8',
        );
        expect(closeFlow).toContain('setCommunityHostMounted(false)');
    });

    it('المنتدى في PreDockFeatureSurfaces كسول بعد first-tab-open (خارج orchestration stem)', () => {
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
        expect(orch).toContain('createPreDockFeatureStubs');
        expect(orch).toContain('communityFeature');
        expect(orch).not.toMatch(/import \{[^}]*useLawyerDashboardCommunity[^}]*\} from/);
        const preDockStubs = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/createPreDockFeatureStubs.ts'),
            'utf8',
        );
        expect(preDockStubs).toContain("requestArm('community')");
        expect(preDockStubs).toContain('openCommunityTab:');
        expect(preDockStubs).toContain('armForumE2eForceOpenStub');
        const preDock = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardPreDockFeatureSurfaces.tsx',
            ),
            'utf8',
        );
        expect(preDock).toContain('useLawyerDashboardCommunity');
        expect(preDock).toContain('onLawyerDashboardFirstTabOpen');
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
        expect(deferred).toContain('params.openCommunityTab');
        expect(deferred).not.toContain('params.setShowCommunity');
        const fieldTasksSurfaces = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardFieldTasksFeatureSurfaces.tsx',
            ),
            'utf8',
        );
        expect(fieldTasksSurfaces).toContain('params.closeCommunity');
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
        expect(hook).toContain('bindForumE2eForceOpenLive');
    });

    it('forum dock بلا lucide MessageCircle وعلى stem بلا أيقونة ميتة', () => {
        const tiles = readCommandHubImplSource(root);
        const icons = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/homeStemIcons.tsx'),
            'utf8',
        );
        expect(tiles).toContain('data-testid="home-dock-forum"');
        expect(tiles).not.toMatch(/\bMessageCircle\b/);
        expect(icons).not.toContain('lucide-react');
        expect(icons).not.toContain('HomeMessageCircleIcon');
        expect(icons).not.toContain('MessageCircle');
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
        /*
         * الثابت `return true` انتقل إلى `communityHubReadiness`: دالّات الجهوزيّة لا
         * تحتاج الشاشة، وبقاؤها في المُحمِّل كان يُلزم كلَّ سائلٍ عن الجهوزيّة باستيراد
         * الشاشة ثابتاً — فأغلق دائرة من ستّة ملفّات على مسار المنتدى. والمعنى المحميّ
         * هو نفسه: الجواب ثابت لأن الوحدة متزامنة، لا وعدٌ يُنتظر.
         */
        const readiness = fs.readFileSync(
            path.join(root, 'src/app/runtime/communityHubReadiness.ts'),
            'utf8',
        );
        expect(readiness).toMatch(/return true/);
        expect(loader).not.toMatch(/isCommunityScreenModuleResolved\s*\(\s*\)\s*:\s*boolean/);
    });

    it('لا هيكل React فوري ميت؛ الطلاء عبر forumInstantPaint', () => {
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/CommunityScreen/components/ForumInstantShell.tsx',
                ),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/CommunityScreen/components/ForumFeedSkeleton.tsx',
                ),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/CommunityScreen/components/FullscreenImageOverlay.tsx',
                ),
            ),
        ).toBe(false);
        const hydrator = fs.readFileSync(
            path.join(root, 'src/app/runtime/communityBootHydrator.ts'),
            'utf8',
        );
        expect(hydrator).not.toContain('ForumInstantShell');
        const theme = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/CommunityScreen/forumPlumTheme.ts'),
            'utf8',
        );
        expect(theme).toContain("import './forumPlumChrome.css'");
        expect(theme).toContain('pt-[max(0.75rem,env(safe-area-inset-top))]');
        expect(theme).toContain('export const FORUM_PUBLISH_FAB =');
        expect(theme).not.toContain('export const FORUM_FAB');
        expect(fs.existsSync(path.join(root, 'src/app/components/lawyer/CommunityScreen/components/ForumPublishFab.tsx'))).toBe(true);
        const communityScreen = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/CommunityScreen.tsx'),
            'utf8',
        );
        expect(communityScreen).not.toContain(
            "if (typeof window !== 'undefined') {\n    prefetchPersistedCommunitySectionChunk();",
        );
        expect(communityScreen).toContain('if (!isOpen) return');
        expect(communityScreen).not.toContain('prefetchCommunityScreenContent');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/commandHub/ForumTileMainFace.tsx'),
            ),
        ).toBe(true);
        const forumTile = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/commandHub/ForumTile.tsx'),
            'utf8',
        );
        expect(forumTile).toContain('ForumTileMainFace');
        expect(forumTile).toContain('useForumTileChrome');
        expect(forumTile).toContain('forumTileOpenButtonProps');
        expect(forumTile).not.toContain('HubTileFace');
        const groupsDir = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/CommunityScreen/components/ForumGroupsDirectory.tsx',
            ),
            'utf8',
        );
        expect(groupsDir).not.toContain('searchQuery');
        const groupsSection = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/CommunityScreen/components/ForumGroupsSection.tsx',
            ),
            'utf8',
        );
        expect(groupsSection).not.toContain('groupsSearchQuery');
        const overlays = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/CommunityScreen/communityScreenLazyOverlays.tsx',
            ),
            'utf8',
        );
        expect(overlays).not.toContain('fullscreenImage');
        expect(overlays).not.toContain('prefetchCommunityDeleteConfirmOverlay');
        expect(overlays).not.toContain('prefetchCommunityHeavyOverlays');
        const body = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/CommunityScreen/components/CommunityScreenBody.tsx'),
            'utf8',
        );
        expect(body).toContain('CommunityScreenLazySectionPanes');
        expect(body).toContain('CommunityScreenBodyChrome');
        expect(body).toContain('useCommunityScreenLazySectionMount');
        expect(body).not.toContain('prefetchCommunityRepositorySection();\n        setRepositoryMounted(true);\n    }, [forumSurfaceOpen]);');
        const earlyPanes = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/CommunityScreen/components/CommunityScreenLazySectionPanes.tsx'),
            'utf8',
        );
        expect(earlyPanes).toContain('LazyLegalRepository');
        expect(earlyPanes).toContain('LazyForumGroupsSection');
        const intentWarm = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/forumIntentWarm.ts'),
            'utf8',
        );
        expect(intentWarm).not.toContain('prefetchCommunityRepositorySection');
        expect(intentWarm).not.toContain('prefetchCommunityScreenContent');
        expect(intentWarm).not.toContain('prefetchCommunityScreenModule');
        expect(intentWarm).toContain('prefetchPersistedCommunitySectionChunk');
        expect(intentWarm).toContain('warmForumGroupsCache');
        const hydratorBoot = fs.readFileSync(
            path.join(root, 'src/app/runtime/communityBootHydrator.ts'),
            'utf8',
        );
        const postsFeedBootstrap = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/CommunityScreen/hooks/useCommunityPostsFeedBootstrap.ts',
            ),
            'utf8',
        );
        expect(postsFeedBootstrap).toContain("activeSection !== 'forum'");
        const intentPrefetch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch.ts'),
            'utf8',
        );
        expect(intentPrefetch).toContain("case 'forum':");
        expect(intentPrefetch).toContain('prefetchCommunityOverlayEntry');
        const overlayWarm = fs.readFileSync(
            path.join(root, 'src/app/runtime/overlayEntryChunks.ts'),
            'utf8',
        );
        expect(overlayWarm).not.toContain('prefetchCommunityOverlayEntry');
        expect(intentWarm).toContain('prefetchCommunityOverlayEntry');
        const authRuntime = fs.readFileSync(
            path.join(root, 'src/app/context/authProviderRuntime.ts'),
            'utf8',
        );
        const unlock = authRuntime.slice(
            authRuntime.indexOf('export async function authDevBypassLogin'),
            authRuntime.indexOf('export async function authAdminBypassLogin'),
        );
        expect(unlock).not.toContain('prefetchCommunityOverlayEntry');
        expect(hydratorBoot).not.toContain('CommunityScreenHost');
        expect(hydratorBoot).not.toContain('warmRepositoryDocsCache');
    });

    it('طبقة keepAlive: inert عبر الطلاء الفوري وEntry؛ انتظار المقطع يُلغى بـ Escape/Cap', () => {
        const paint = fs.readFileSync(path.join(root, 'src/app/runtime/forumInstantPaint.ts'), 'utf8');
        expect(paint).toContain("root.setAttribute('inert', '')");
        expect(paint).toContain("root.removeAttribute('inert')");
        expect(paint).toContain('blurFocusWithin');
        const entry = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCommunityOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('inertProps(!layerOpen)');
        expect(entry).toContain('isForumShellPaintedOpen');
        expect(entry).toContain('const layerOpen = showCommunity || isForumShellPaintedOpen()');
        const screen = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/CommunityScreen.tsx'),
            'utf8',
        );
        expect(screen).toContain('inertProps(!isOpen)');
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/community/communityShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('armForumOpenPendingDismiss');
        expect(openFlow).toContain('registerNativeBackHandler');
        expect(openFlow).toContain("event.key !== 'Escape'");
        const css = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
            'utf8',
        );
        expect(css).not.toContain('[data-testid=\'forum-screen-loading\']');
        expect(css).not.toContain('[data-testid=\'forum-instant-shell\']');
        expect(css).toContain('[data-testid=\'forum-overlay-host\']');
        const plum = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/CommunityScreen/forumPlumChrome.css'),
            'utf8',
        );
        expect(plum).not.toContain('forum-instant-shell');
        expect(plum).not.toContain('forum-boot-shell');
    });

    it('أزرار البحث/المرفق/جدار المجموعة بلا 36/40px', () => {
        const search = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/CommunityScreen/components/SearchOverlayFilters.tsx'),
            'utf8',
        );
        expect(search).toContain('min-h-[44px]');
        expect(search).not.toContain('min-h-[40px]');
        const attach = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/CommunityScreen/components/QuestionCardAttachmentDocument.tsx',
            ),
            'utf8',
        );
        expect(attach).toContain('min-h-[44px]');
        expect(attach).not.toContain('h-9 px-3');
        const group = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/CommunityScreen/components/ForumGroupFeedPanel.tsx',
            ),
            'utf8',
        );
        expect(group).toContain('min-h-[44px] min-w-[44px]');
        expect(group).not.toContain('w-9 h-9');
        const edit = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/CommunityScreen/components/EditPostModal.tsx'),
            'utf8',
        );
        expect(edit).not.toContain('w-9 h-9');
        expect(edit).toContain('FORUM_ICON_BTN');
    });

    it('متحكّم/شريط مقسّمان؛ ظلال المستودع الخفيفة؛ بلا backdrop-blur على النوافذ', () => {
        const forumRoot = path.join(root, 'src/app/components/lawyer/CommunityScreen');
        const controller = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityScreenController.ts'),
            'utf8',
        );
        expect(controller.split('\n').length).toBeLessThan(300);
        expect(controller).toContain('useCommunityScreenShell');
        expect(controller).toContain('useCommunityScreenControllerFeeds');
        expect(controller).toContain('useCommunityScreenInteractions');
        expect(controller).toContain('useCommunityScreenKeepAliveDismiss');
        expect(controller).toContain('assembleCommunityScreenPropContext');
        expect(controller).toContain('useCommunityScreenForumEscape');
        for (const rel of [
            'hooks/useCommunityScreenControllerFeeds.ts',
            'hooks/useCommunityScreenShell.ts',
            'hooks/useCommunityScreenInteractions.ts',
            'hooks/useCommunityScreenKeepAliveDismiss.ts',
            'hooks/useCommunityScreenForumEscape.ts',
            'hooks/useCommunityScreenPropModel.ts',
            'hooks/communityScreenPropModelDeps.ts',
            'hooks/assembleCommunityScreenPropContext.ts',
            'hooks/assembleCommunityScreenPropContext.types.ts',
            'hooks/assembleCommunityScreenChromePropSlice.ts',
            'hooks/assembleCommunityScreenFeedPropSlice.ts',
            'hooks/assembleCommunityScreenOverlayPropSlice.ts',
            'hooks/useExpandingVisibleCount.ts',
            'hooks/useInViewOnce.ts',
            'legalRepositoryLazyModals.ts',
            'components/CommunityScreenForumFeedPane.tsx',
            'components/CommunityScreenLazySectionPanes.types.ts',
            'hooks/useForumAppBarChrome.ts',
            'components/ForumAppBarTools.tsx',
            'components/ForumAppBarSearchRow.tsx',
            'components/forumAppBarTypes.ts',
            'components/QuestionCardStatusBadges.tsx',
            'components/QuestionCardTagRow.tsx',
            'components/QuestionCardProcedureCta.tsx',
            'components/QuestionCardFooter.tsx',
            'hooks/useRepositoryCardThumb.ts',
            'forumFeedPublishVisibility.ts',
            'forumProcedureGuideOpen.ts',
            'repositoryCardTypeBadge.ts',
            'repositoryCardNativeShare.ts',
            'components/QuestionCardAuthorPopup.tsx',
            'components/QuestionCardEditHistory.tsx',
            'components/SearchOverlayFilters.tsx',
            'components/SearchOverlayResults.tsx',
            'components/UploadDocumentModalFields.tsx',
            'questionCardMoreMenuItems.ts',
            'components/QuestionCardMoreMenu.tsx',
            'components/CommentBottomSheetHeader.tsx',
            'components/CommentBottomSheetThreadList.tsx',
            'components/QuestionCardAttachmentImage.tsx',
            'components/QuestionCardAttachmentAudio.tsx',
            'components/QuestionCardAttachmentDocument.tsx',
            'components/RepositoryCardMedia.tsx',
            'components/RepositoryCardBody.tsx',
            'components/RepositoryCardActions.tsx',
            'hooks/useForumAppBarNotificationActions.ts',
            'components/CommunityScreenBodyChrome.tsx',
            'components/pickForumPostListShared.ts',
            'components/RepositoryPreviewImage.tsx',
            'components/RepositoryPreviewDocument.tsx',
            'components/repositoryPreviewFileSize.ts',
            'components/UploadDocumentModalKindPicker.tsx',
            'components/ForumAppBarSearchField.tsx',
            'components/ForumAppBarFilterTriggers.tsx',
            'components/ForumAppBarFilterOverlays.tsx',
            'hooks/forumEscapeApply.ts',
            'hooks/useForumEscapeStack.types.ts',
            'hooks/useCommunityPostUpvote.ts',
            'components/ForumFilterChip.tsx',
            'forumFilterPanelPosition.ts',
            'components/ForumCategoryPanelSections.tsx',
            'components/AddQuestionSheetFields.tsx',
            'components/QuestionCardHeaderIdentity.tsx',
            'components/QuestionCardHeader.types.ts',
            'components/SearchOverlayPostHit.tsx',
            'components/SearchOverlayDocumentHit.tsx',
            'hooks/useCommunityPostsFeedPaging.ts',
            'hooks/useCommunityScreenThreadFollow.ts',
            'hooks/useUploadDocumentModalFormHydrate.ts',
            'hooks/useUploadDocumentModalTypeMenu.ts',
            'components/UploadDocumentModalTypeField.tsx',
            'components/UploadDocumentModalTagsField.tsx',
            'components/UploadDocumentModalFileField.tsx',
            'hooks/useCommentBottomSheetModel.ts',
        ]) {
            expect(fs.existsSync(path.join(forumRoot, rel)), rel).toBe(true);
        }

        const headerIdentity = fs.readFileSync(
            path.join(forumRoot, 'components/QuestionCardHeaderIdentity.tsx'),
            'utf8',
        );
        expect(headerIdentity).toContain("import { User } from '@/app/components/ui/icons/User'");
        expect(headerIdentity).toContain('<User size={16} />');

        const appBar = fs.readFileSync(path.join(forumRoot, 'components/ForumAppBar.tsx'), 'utf8');
        expect(appBar.split('\n').length).toBeLessThan(160);
        expect(appBar).toContain('data-testid="forum-app-bar"');
        expect(appBar).toContain('forum-back');
        expect(appBar).toContain('ForumAppBarTools');
        expect(appBar).toContain('ForumAppBarSearchRow');
        expect(appBar).toContain('useForumAppBarChrome');
        const tools = fs.readFileSync(path.join(forumRoot, 'components/ForumAppBarTools.tsx'), 'utf8');
        expect(tools).toContain('forum-following-trigger');
        expect(tools).toContain('forum-notifications-trigger');
        const searchRow = fs.readFileSync(
            path.join(forumRoot, 'components/ForumAppBarSearchRow.tsx'),
            'utf8',
        );
        expect(searchRow).toContain('ForumAppBarSearchField');
        expect(searchRow).toContain('ForumAppBarFilterTriggers');
        const searchField = fs.readFileSync(
            path.join(forumRoot, 'components/ForumAppBarSearchField.tsx'),
            'utf8',
        );
        expect(searchField).toContain('forum-search-trigger');
        expect(searchField).toContain('min-h-[44px]');

        const theme = fs.readFileSync(path.join(forumRoot, 'forumPlumTheme.ts'), 'utf8');
        expect(theme).not.toContain('shadow-2xl');
        expect(theme).not.toContain('0_8px_22px');

        const plum = fs.readFileSync(path.join(forumRoot, 'forumPlumChrome.css'), 'utf8');
        expect(plum).toContain('box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22)');
        expect(plum).not.toContain('box-shadow: 0 12px 32px');
        expect(plum).not.toContain('box-shadow: 0 20px 48px');
        expect(plum).not.toContain('radial-gradient');

        const edit = fs.readFileSync(path.join(forumRoot, 'components/EditPostModal.tsx'), 'utf8');
        expect(edit).not.toContain('backdrop-blur');
        const preview = fs.readFileSync(
            path.join(forumRoot, 'components/RepositoryPreviewModal.tsx'),
            'utf8',
        );
        expect(preview).not.toContain('backdrop-blur');
        expect(preview).not.toContain('w-8 h-8');
        const previewImage = fs.readFileSync(
            path.join(forumRoot, 'components/RepositoryPreviewImage.tsx'),
            'utf8',
        );
        expect(previewImage).toContain('min-h-[44px]');
        const previewDoc = fs.readFileSync(
            path.join(forumRoot, 'components/RepositoryPreviewDocument.tsx'),
            'utf8',
        );
        expect(previewDoc).toContain('min-h-[44px]');
        expect(previewDoc).toContain('تاريخ الرفع');
        const deleteModal = fs.readFileSync(
            path.join(forumRoot, 'components/ForumDeleteConfirmModal.tsx'),
            'utf8',
        );
        expect(deleteModal).toContain("from '@/app/components/ui/icons/X'");
        expect(deleteModal).not.toContain('w-8 h-8');

        const overlayFiles = [
            'components/ForumNotificationsPanel.tsx',
            'components/QuestionCardHeader.tsx',
            'components/CreateGroupModal.tsx',
            'components/ForumFollowingPanel.tsx',
            'components/ForumFollowingList.tsx',
            'components/ForumFollowersList.tsx',
            'components/ForumFollowPrefToggle.tsx',
            'components/UploadDocumentModal.tsx',
            'components/ForumDeleteConfirmModal.tsx',
            'components/AddQuestionSheet.tsx',
            'components/AddQuestionSheetFields.tsx',
            'components/AddQuestionSheetOptions.tsx',
            'components/AddQuestionSheetAttachments.tsx',
            'components/AddQuestionSheetPreview.tsx',
            'components/AddQuestionSheetPublishRow.tsx',
            'components/CommunityScreenOverlays.tsx',
            'components/CommunityScreenComposeOverlays.tsx',
            'components/CommunityScreenBrowseOverlays.tsx',
        ];
        for (const rel of overlayFiles) {
            const src = fs.readFileSync(path.join(forumRoot, rel), 'utf8');
            expect(src, rel).not.toContain('shadow-2xl');
        }
    });

    it('نشر/إجراءات المنشور مقسّمة؛ قفل التعليق وحارس inflight موجودان', () => {
        const forumRoot = path.join(root, 'src/app/components/lawyer/CommunityScreen');
        const addQuestion = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityAddQuestion.ts'),
            'utf8',
        );
        expect(addQuestion.split('\n').length).toBeLessThan(140);
        expect(addQuestion).toContain('useCommunityAddQuestionAttachment');
        expect(addQuestion).toContain('useCommunityAddQuestionVoice');
        expect(addQuestion).toContain('useCommunityAddQuestionPublish');
        const postActions = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityPostActions.ts'),
            'utf8',
        );
        expect(postActions.split('\n').length).toBeLessThan(50);
        expect(postActions).toContain('useCommunityPostEngagement');
        expect(postActions).toContain('useCommunityPostCommentActions');
        for (const rel of [
            'hooks/useCommunityAddQuestionAttachment.ts',
            'hooks/useCommunityAddQuestionVoice.ts',
            'hooks/useCommunityAddQuestionPublish.ts',
            'hooks/runCommunityAddQuestionPublish.ts',
            'hooks/useCommunityPostEngagement.ts',
            'hooks/useCommunityPostUpvote.ts',
            'hooks/useCommunityPostCommentActions.ts',
            'hooks/useCommunityPostCommentWrite.ts',
            'hooks/useCommunityPostCommentAdd.ts',
            'hooks/useCommunityPostCommentMutate.ts',
            'hooks/useCommunityPostCommentSignals.ts',
            'communityAddQuestionPublishGuard.ts',
            'communityAddQuestionPublishDraft.ts',
            'communityAddQuestionPublishCommit.ts',
            'communityCommentContent.ts',
            'forumVoiceRecorderControl.ts',
            'forumEntityId.ts',
            'forumBlobUrl.ts',
        ]) {
            expect(fs.existsSync(path.join(forumRoot, rel)), rel).toBe(true);
        }
        const publish = fs.readFileSync(
            path.join(forumRoot, 'hooks/runCommunityAddQuestionPublish.ts'),
            'utf8',
        );
        expect(publish).toContain('buildForumPostDraft');
        expect(publish).toContain('insertOptimisticForumPost');
        expect(publish).toContain('settlePublishedForumPost');
        expect(publish).toContain("checkForumRateLimit('post'");
        const publishHook = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityAddQuestionPublish.ts'),
            'utf8',
        );
        expect(publishHook).toContain('finally');
        expect(publishHook).toContain('submitInFlightRef.current = false');
        expect(publishHook).toContain('peekForumRateLimit');
        const comments = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityPostCommentActions.ts'),
            'utf8',
        );
        expect(comments.split('\n').length).toBeLessThan(40);
        expect(comments).toContain('useCommunityPostCommentWrite');
        expect(comments).toContain('useCommunityPostCommentSignals');
        const write = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityPostCommentWrite.ts'),
            'utf8',
        );
        expect(write.split('\n').length).toBeLessThan(40);
        expect(write).toContain('useCommunityPostCommentAdd');
        expect(write).toContain('useCommunityPostCommentMutate');
        const add = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityPostCommentAdd.ts'),
            'utf8',
        );
        expect(add).toContain('canAddComment');
        expect(add).toContain('peekForumRateLimit');
        expect(add).toContain("checkForumRateLimit('comment'");
        const mutate = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityPostCommentMutate.ts'),
            'utf8',
        );
        expect(mutate).toContain('canDeleteComment');
        expect(mutate).toContain('canEditComment');
        const signals = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityPostCommentSignals.ts'),
            'utf8',
        );
        expect(signals).toContain('getCommentAuthorId');
        expect(signals).toContain("type: 'best_answer'");
        expect(signals).toContain('commentAuthorId === currentUserId');
        expect(signals).toContain('peekForumRateLimit');
        expect(signals).toContain('report-comment:');
        const permissions = fs.readFileSync(
            path.join(forumRoot, 'communityPermissions.ts'),
            'utf8',
        );
        expect(permissions).toContain('export function canAddComment');
    });

    it('مستودع المنتدى مقسّم؛ الحذف يحدّث الكاش والإبلاغ يتطلب دخولاً', () => {
        const forumRoot = path.join(root, 'src/app/components/lawyer/CommunityScreen');
        const orchestrator = fs.readFileSync(
            path.join(forumRoot, 'hooks/useLegalRepositoryDocuments.ts'),
            'utf8',
        );
        expect(orchestrator.split('\n').length).toBeLessThan(280);
        expect(orchestrator).toContain('useLegalRepositoryBootstrap');
        expect(orchestrator).toContain('useLegalRepositoryPreview');
        expect(orchestrator).toContain('useLegalRepositoryMutations');
        expect(orchestrator).toContain('setRepositoryDocsCache');
        expect(orchestrator).not.toContain('RepositoryDB.deleteDocument');
        expect(orchestrator).not.toContain('handleReportDocument =');

        const mutations = fs.readFileSync(
            path.join(forumRoot, 'hooks/useLegalRepositoryMutations.ts'),
            'utf8',
        );
        expect(mutations.split('\n').length).toBeLessThan(80);
        expect(mutations).toContain('useLegalRepositoryUpload');
        expect(mutations).toContain('useLegalRepositoryDelete');
        expect(mutations).not.toContain('RepositoryDB.deleteDocument');
        expect(mutations).not.toContain('handleUploadSubmit =');

        for (const rel of [
            'hooks/useLegalRepositoryBootstrap.ts',
            'hooks/useLegalRepositoryPreview.ts',
            'hooks/useLegalRepositoryMutations.ts',
            'hooks/useLegalRepositoryUpload.ts',
            'hooks/runLegalRepositoryUploadSubmit.ts',
            'hooks/useLegalRepositoryUploadModal.ts',
            'hooks/useLegalRepositoryDelete.ts',
            'hooks/useLegalRepositoryReport.ts',
            'hooks/useCommunityScreenLazySectionMount.ts',
            'legalRepositoryListQuery.ts',
            'legalRepositoryNormalize.ts',
            'legalRepositoryTypes.ts',
            'legalRepositoryUploadBuild.ts',
            'legalRepositoryCloudSync.ts',
            'legalRepositoryLocalReports.ts',
            'components/CommunityScreenBody.types.ts',
            'components/CommunityScreenLazySectionPanes.tsx',
            'hooks/communityScreenPropBuilders.ts',
            'hooks/communityScreenPropBuilderContext.ts',
            'hooks/communityScreenBodyPropBuilder.ts',
            'hooks/communityScreenOverlayPropBuilder.ts',
        ]) {
            expect(fs.existsSync(path.join(forumRoot, rel)), rel).toBe(true);
        }

        const upload = fs.readFileSync(
            path.join(forumRoot, 'hooks/useLegalRepositoryUpload.ts'),
            'utf8',
        );
        expect(upload.split('\n').length).toBeLessThan(90);
        expect(upload).toContain('useLegalRepositoryUploadModal');
        expect(upload).toContain('runLegalRepositoryUploadSubmit');
        const uploadRun = fs.readFileSync(
            path.join(forumRoot, 'hooks/runLegalRepositoryUploadSubmit.ts'),
            'utf8',
        );
        expect(uploadRun).toContain('await syncRepositoryDocumentToCloud');
        expect(uploadRun).toContain('upload:${');
        expect(uploadRun).toContain('releaseRepositoryBlobUrl');
        expect(uploadRun).toContain('isStillPresent');
        const cloudSync = fs.readFileSync(
            path.join(forumRoot, 'legalRepositoryCloudSync.ts'),
            'utf8',
        );
        expect(cloudSync).toContain('isStillPresent');
        expect(cloudSync).not.toContain('isLawyerWorkCloudLive');
        expect(cloudSync).not.toContain('reportPost');
        const deletion = fs.readFileSync(
            path.join(forumRoot, 'hooks/useLegalRepositoryDelete.ts'),
            'utf8',
        );
        expect(deletion).toContain('documentsRef.current');
        expect(deletion).toContain('applyDocuments(next)');
        expect(deletion).toContain('applyDocuments(snapshot)');
        expect(deletion).toContain('del:${');
        expect(deletion).not.toContain('setDocuments');
        expect(deletion).toContain('deleteForumRepositoryDocument');
        expect(deletion).not.toContain('ForumApiService');
        expect(deletion).not.toContain('reportPost');
        expect(deletion).not.toContain('handleReportDocument');
        const reportHook = fs.readFileSync(
            path.join(forumRoot, 'hooks/useLegalRepositoryReport.ts'),
            'utf8',
        );
        expect(reportHook).toContain("سجّل الدخول للإبلاغ");
        expect(reportHook).toContain('peekForumRateLimit');
        expect(reportHook).toContain("checkForumRateLimit('report'");
        expect(reportHook).toContain('repo:${doc.id}');
        expect(reportHook).toContain('recordLegalRepositoryLocalReport');
        const bootstrap = fs.readFileSync(
            path.join(forumRoot, 'hooks/useLegalRepositoryBootstrap.ts'),
            'utf8',
        );
        expect(bootstrap).toContain('allowRemoteFetch');
        const documentsHook = fs.readFileSync(
            path.join(forumRoot, 'hooks/useLegalRepositoryDocuments.ts'),
            'utf8',
        );
        expect(documentsHook).toContain('allowRemoteFetch');
        expect(documentsHook).not.toContain('reportPost');
        expect(reportHook).not.toContain('ForumApiService');
        expect(reportHook).not.toContain('reportPost');
        expect(mutations).toContain('useLegalRepositoryReport');
        expect(
            fs.existsSync(path.join(forumRoot, 'legalRepositoryLocalReports.ts')),
        ).toBe(true);
    });

    it('تعديل المنشور والمتابعة مقسّمان؛ الإبلاغ لا يستهلك الحصة قبل الخادم', () => {
        const forumRoot = path.join(root, 'src/app/components/lawyer/CommunityScreen');
        const moderation = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityScreenPostModeration.ts'),
            'utf8',
        );
        expect(moderation.split('\n').length).toBeLessThan(80);
        expect(moderation).toContain('useCommunityScreenPostAdmin');
        expect(moderation).toContain('useCommunityScreenPostEdit');
        expect(moderation).toContain('useCommunityScreenPostSaves');
        const admin = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityScreenPostAdmin.ts'),
            'utf8',
        );
        expect(admin).toContain('peekForumRateLimit');
        expect(admin).toContain("checkForumRateLimit('report'");
        expect(admin).toContain('result.ok');
        const social = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityScreenSocialGraph.ts'),
            'utf8',
        );
        expect(social.split('\n').length).toBeLessThan(120);
        expect(social).toContain('useCommunityScreenSocialBootstrap');
        expect(social).toContain('useCommunityScreenFollowActions');
        const bootstrap = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityScreenSocialBootstrap.ts'),
            'utf8',
        );
        expect(bootstrap.split('\n').length).toBeLessThan(50);
        expect(bootstrap).toContain('useCommunityScreenSocialLists');
        expect(bootstrap).toContain('useCommunityScreenSocialFlags');
        const lists = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityScreenSocialLists.ts'),
            'utf8',
        );
        expect(lists).toContain('followingRecordsRef.current');
        expect(lists).toContain('() => followingRecordsRef.current');
        const follow = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityScreenFollowActions.ts'),
            'utf8',
        );
        expect(follow).toContain('snapshotRecord');
        expect(follow).toContain('useCommunityScreenThreadFollow');
        const threadFollow = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityScreenThreadFollow.ts'),
            'utf8',
        );
        expect(threadFollow).toContain('thread:${postId}');
        for (const rel of [
            'hooks/useQuestionCardModel.ts',
            'hooks/useCommentThreadWindow.ts',
            'hooks/useUploadDocumentModalForm.ts',
            'components/ForumToggleSwitch.tsx',
            'forumClipboardCopy.ts',
            'forumVoiceFormat.ts',
            'components/CommunityScreenComposeOverlays.tsx',
            'components/CommunityScreenBrowseOverlays.tsx',
            'components/CommunityScreenOverlays.types.ts',
            'components/AddQuestionSheetOptions.tsx',
            'components/AddQuestionSheetAttachments.tsx',
            'components/ForumFollowPrefToggle.tsx',
            'components/ForumFollowingList.tsx',
            'components/ForumFollowersList.tsx',
            'components/AddQuestionSheetPreview.tsx',
            'components/AddQuestionSheetPublishRow.tsx',
            'forumLazySectionMount.ts',
        ]) {
            expect(fs.existsSync(path.join(forumRoot, rel)), rel).toBe(true);
        }
        const overlays = fs.readFileSync(
            path.join(forumRoot, 'components/CommunityScreenOverlays.tsx'),
            'utf8',
        );
        expect(overlays.split('\n').length).toBeLessThan(40);
        expect(overlays).toContain('CommunityScreenComposeEarlyOverlays');
        expect(overlays).toContain('CommunityScreenBrowseMidOverlays');
        expect(overlays).toContain('CommunityScreenComposeLateOverlays');
        expect(overlays).toContain('CommunityScreenBrowseProfileOverlay');
        const addSheet = fs.readFileSync(
            path.join(forumRoot, 'components/AddQuestionSheet.tsx'),
            'utf8',
        );
        expect(addSheet).toContain('AddQuestionSheetOptions');
        expect(addSheet).toContain('AddQuestionSheetAttachments');
        const following = fs.readFileSync(
            path.join(forumRoot, 'components/ForumFollowingPanel.tsx'),
            'utf8',
        );
        expect(following).toContain('ForumFollowingList');
        expect(following).toContain('ForumFollowersList');
        expect(following).toContain('getForumOverlayPortalRoot()');
        const attachments = fs.readFileSync(
            path.join(forumRoot, 'components/AddQuestionSheetAttachments.tsx'),
            'utf8',
        );
        expect(attachments).toContain('AddQuestionSheetPreview');
        expect(attachments).toContain('AddQuestionSheetPublishRow');
        const body = fs.readFileSync(
            path.join(forumRoot, 'components/CommunityScreenBody.tsx'),
            'utf8',
        );
        expect(body).toContain('CommunityScreenLazySectionPanes');
        expect(body).toContain('useCommunityScreenLazySectionMount');
        expect(body).toContain('CommunityScreenBody.types');
        expect(body).toContain('CommunityScreenBodyChrome');
        expect(body).toContain('useMobileKeyboardInset');
        expect(body).toContain('keyboardInset === 0');
        expect(body.split('\n').length).toBeLessThan(280);
        const panes = fs.readFileSync(
            path.join(forumRoot, 'components/CommunityScreenLazySectionPanes.tsx'),
            'utf8',
        );
        expect(panes).toContain('shouldMountForumLazySection');
        expect(panes).toContain('forumLazySectionPaneClass');
        expect(panes).toContain('CommunityScreenForumFeedPane');
        expect(panes).toContain('data-testid="forum-legal-repository"');
        expect(panes).toContain('data-testid="forum-groups-directory"');
        const forumFeedPane = fs.readFileSync(
            path.join(forumRoot, 'components/CommunityScreenForumFeedPane.tsx'),
            'utf8',
        );
        expect(forumFeedPane).toContain('min-h-[44px]');
        const lazyMount = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityScreenLazySectionMount.ts'),
            'utf8',
        );
        expect(lazyMount).toContain('scheduleIdleCommunityLazySectionPrefetch');
        expect(lazyMount).toContain('prefetchCommunityLazySectionChunks');
        expect(lazyMount).toContain('warmLazySection');
        expect(lazyMount).toContain('setRepositoryMounted(true)');
        expect(lazyMount).toContain('setRepositoryMounted(false)');
        expect(lazyMount).not.toMatch(
            /scheduleIdleCommunityLazySectionPrefetch\(\(\) => \{[\s\S]*setRepositoryMounted\(true\)/,
        );
        const switchSrc = fs.readFileSync(
            path.join(forumRoot, 'components/ForumSectionSwitch.tsx'),
            'utf8',
        );
        expect(switchSrc).toContain('onClick={() => {');
        expect(switchSrc).toContain('prefetchForumSection');
        expect(switchSrc).toContain('prefetchCommunityRepositorySection()');
        expect(switchSrc).toContain('prefetchCommunityRepositorySectionChunk()');
        expect(switchSrc).toContain('onSectionIntent');
        expect(body).toContain('onSectionIntent={warmLazySection}');
        const lazySections = fs.readFileSync(
            path.join(forumRoot, 'communityScreenLazySections.tsx'),
            'utf8',
        );
        expect(lazySections).toContain('prefetchCommunityRepositorySectionChunk');
        expect(lazySections).toContain('prefetchCommunityLazySectionChunks');
        expect(lazySections).toMatch(
            /Promise\.all\(\[\s*prefetchCommunityRepositorySectionChunk\(\)/,
        );
        expect(lazySections).toContain(
            "else if (section === 'repository') prefetchCommunityRepositorySectionChunk()",
        );
        expect(body).toContain('useForumSectionScrollMemory');
        expect(panes).toContain("activeSection === 'forum' ? (");
        const assembleCtx = fs.readFileSync(
            path.join(forumRoot, 'hooks/assembleCommunityScreenPropContext.ts'),
            'utf8',
        );
        expect(assembleCtx.split('\n').length).toBeLessThan(30);
        expect(assembleCtx).toContain('assembleCommunityScreenChromePropSlice');
        const propModel = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityScreenPropModel.ts'),
            'utf8',
        );
        expect(propModel.split('\n').length).toBeLessThan(40);
        expect(propModel).toContain('communityScreenPropModelMemoInputs');
        const legalRepo = fs.readFileSync(
            path.join(forumRoot, 'components/LegalRepository.tsx'),
            'utf8',
        );
        expect(legalRepo).toContain('useExpandingVisibleCount');
        expect(legalRepo).toContain('REPO_LIST_INITIAL');
        const feedWindow = fs.readFileSync(
            path.join(forumRoot, 'hooks/useForumFeedWindow.ts'),
            'utf8',
        );
        expect(feedWindow).toContain('useExpandingVisibleCount');
        const commentWindow = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommentThreadWindow.ts'),
            'utf8',
        );
        expect(commentWindow).toContain('useExpandingVisibleCount');
        const questionModel = fs.readFileSync(
            path.join(forumRoot, 'hooks/useQuestionCardModel.ts'),
            'utf8',
        );
        expect(questionModel).toContain('useInViewOnce');
        const repoThumb = fs.readFileSync(
            path.join(forumRoot, 'hooks/useRepositoryCardThumb.ts'),
            'utf8',
        );
        expect(repoThumb).toContain('useInViewOnce');
        const repoCard = fs.readFileSync(
            path.join(forumRoot, 'components/RepositoryCard.tsx'),
            'utf8',
        );
        expect(repoCard).toContain('useRepositoryCardThumb');
        expect(repoCard).toContain('RepositoryCardActions');
        expect(repoCard.split('\n').length).toBeLessThan(90);
        const repoActions = fs.readFileSync(
            path.join(forumRoot, 'components/RepositoryCardActions.tsx'),
            'utf8',
        );
        expect(repoActions).toContain('shareRepositoryDocument');
        expect(panes).toContain('CommunityScreenLazySectionPanes.types');
        const repoModals = fs.readFileSync(
            path.join(forumRoot, 'legalRepositoryLazyModals.ts'),
            'utf8',
        );
        expect(repoModals).toContain('lazy(()');
        const postList = fs.readFileSync(
            path.join(forumRoot, 'components/ForumPostList.tsx'),
            'utf8',
        );
        expect(postList).toContain('preferEagerImage={index < 2}');
        const attachmentImage = fs.readFileSync(
            path.join(forumRoot, 'components/QuestionCardAttachmentImage.tsx'),
            'utf8',
        );
        expect(attachmentImage).toContain("loading={preferEagerImage ? 'eager' : 'lazy'}");
        expect(fs.readFileSync(path.join(forumRoot, 'components/QuestionCardAttachment.tsx'), 'utf8').split('\n').length).toBeLessThan(95);
        const asyncUtil = fs.readFileSync(path.join(forumRoot, 'forumAsync.ts'), 'utf8');
        expect(asyncUtil).toContain('clearTimeout');
        expect(asyncUtil).toContain('unwrapForumAsyncFallback');
        expect(switchSrc).toContain('onPointerDown');
        expect(body).not.toContain('prefetchCommunityRepositorySection();\n            setRepositoryMounted(true);\n        }\n    }, [forumSurfaceOpen]);');
        const propBuilders = fs.readFileSync(
            path.join(forumRoot, 'hooks/communityScreenPropBuilders.ts'),
            'utf8',
        );
        expect(propBuilders.split('\n').length).toBeLessThan(20);
        expect(propBuilders).toContain('communityScreenPropBuilderContext');
        expect(propBuilders).toContain('communityScreenBodyPropBuilder');
        expect(propBuilders).toContain('communityScreenOverlayPropBuilder');
        const bodyBuilder = fs.readFileSync(
            path.join(forumRoot, 'hooks/communityScreenBodyPropBuilder.ts'),
            'utf8',
        );
        expect(bodyBuilder.split('\n').length).toBeLessThan(120);
        expect(bodyBuilder).toContain('buildCommunityScreenBodyProps');
        const overlayBuilder = fs.readFileSync(
            path.join(forumRoot, 'hooks/communityScreenOverlayPropBuilder.ts'),
            'utf8',
        );
        expect(overlayBuilder.split('\n').length).toBeLessThan(120);
        expect(overlayBuilder).toContain('buildCommunityScreenOverlayProps');
        expect(fs.existsSync(path.join(forumRoot, 'forumGroupCreateGuard.ts'))).toBe(true);
        expect(fs.existsSync(path.join(forumRoot, 'hooks/useCommunityGroupsCatalog.ts'))).toBe(true);
        expect(fs.existsSync(path.join(forumRoot, 'hooks/useCommunityGroupPostsFeed.ts'))).toBe(true);
        const groupsFeed = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityGroupsFeed.ts'),
            'utf8',
        );
        expect(groupsFeed.split('\n').length).toBeLessThan(45);
        expect(groupsFeed).toContain('useCommunityGroupsCatalog');
        expect(groupsFeed).toContain('useCommunityGroupPostsFeed');
        const groupsCatalog = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityGroupsCatalog.ts'),
            'utf8',
        );
        expect(groupsCatalog).toContain('resolveForumGroupCreateFields');
        expect(fs.existsSync(path.join(forumRoot, 'hooks/useCommunityScreenForumEscape.ts'))).toBe(true);
        expect(fs.existsSync(path.join(forumRoot, 'hooks/useCommunityPostsFeedBootstrap.ts'))).toBe(true);
        expect(fs.existsSync(path.join(forumRoot, 'hooks/useCommunityPostsFeedDeepLink.ts'))).toBe(true);
        expect(fs.existsSync(path.join(forumRoot, 'forumCommentRowLayout.ts'))).toBe(true);
        expect(fs.existsSync(path.join(forumRoot, 'components/ForumCommentRowEdit.tsx'))).toBe(true);
        expect(fs.existsSync(path.join(forumRoot, 'components/ForumCommentRowHeader.tsx'))).toBe(true);
        expect(fs.existsSync(path.join(forumRoot, 'components/ForumCommentRowFooter.tsx'))).toBe(true);
        expect(fs.existsSync(path.join(forumRoot, 'components/ForumCommentRowIdentity.tsx'))).toBe(true);
        const commentRow = fs.readFileSync(
            path.join(forumRoot, 'components/ForumCommentRow.tsx'),
            'utf8',
        );
        expect(commentRow.split('\n').length).toBeLessThan(160);
        expect(commentRow).toContain('ForumCommentRowEdit');
        expect(commentRow).toContain('ForumCommentRowHeader');
        expect(commentRow).toContain('ForumCommentRowFooter');
        const postsFeed = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityPostsFeed.ts'),
            'utf8',
        );
        expect(postsFeed.split('\n').length).toBeLessThan(200);
        expect(postsFeed).toContain('useCommunityPostsFeedBootstrap');
        expect(postsFeed).toContain('useCommunityPostsFeedDeepLink');
        expect(postsFeed).toContain('useCommunityPostsFeedPaging');
        const questionCard = fs.readFileSync(
            path.join(forumRoot, 'components/QuestionCard.tsx'),
            'utf8',
        );
        expect(questionCard.split('\n').length).toBeLessThan(180);
        expect(questionCard).toContain('QuestionCardStatusBadges');
        expect(questionCard).toContain('QuestionCardTagRow');
        expect(questionCard).toContain('QuestionCardProcedureCta');
        const questionFooter = fs.readFileSync(
            path.join(forumRoot, 'components/QuestionCardFooter.tsx'),
            'utf8',
        );
        expect(questionFooter).toContain('forum-comment-open');
        const bodyPublish = fs.readFileSync(
            path.join(forumRoot, 'components/CommunityScreenBodyChrome.tsx'),
            'utf8',
        );
        expect(bodyPublish).toContain('shouldShowForumFeedPublishFab');
        const questionHeader = fs.readFileSync(
            path.join(forumRoot, 'components/QuestionCardHeader.tsx'),
            'utf8',
        );
        expect(questionHeader.split('\n').length).toBeLessThan(200);
        expect(questionHeader).toContain('QuestionCardAuthorPopup');
        expect(questionHeader).toContain('QuestionCardEditHistory');
        const searchOverlay = fs.readFileSync(
            path.join(forumRoot, 'components/SearchOverlay.tsx'),
            'utf8',
        );
        expect(searchOverlay.split('\n').length).toBeLessThan(140);
        expect(searchOverlay).toContain('SearchOverlayFilters');
        expect(searchOverlay).toContain('SearchOverlayResults');
        const searchResults = fs.readFileSync(
            path.join(forumRoot, 'components/SearchOverlayResults.tsx'),
            'utf8',
        );
        expect(searchResults).toContain('SearchOverlayPostHit');
        expect(searchResults).toContain('SearchOverlayDocumentHit');
        const uploadModal = fs.readFileSync(
            path.join(forumRoot, 'components/UploadDocumentModal.tsx'),
            'utf8',
        );
        expect(uploadModal.split('\n').length).toBeLessThan(130);
        expect(uploadModal).toContain('UploadDocumentModalFields');
        const moreMenu = fs.readFileSync(
            path.join(forumRoot, 'components/QuestionCardMoreMenu.tsx'),
            'utf8',
        );
        expect(moreMenu.split('\n').length).toBeLessThan(170);
        expect(moreMenu).toContain('buildQuestionCardMoreMenuItems');
        expect(moreMenu).toContain('خيارات المنشور');
        const commentSheetSplit = fs.readFileSync(
            path.join(forumRoot, 'components/CommentBottomSheet.tsx'),
            'utf8',
        );
        expect(commentSheetSplit.split('\n').length).toBeLessThan(200);
        expect(commentSheetSplit).toContain('CommentBottomSheetHeader');
        expect(commentSheetSplit).toContain('CommentBottomSheetThreadList');
        expect(commentSheetSplit).toContain('useCommentBottomSheetModel');
        const categoryPanel = fs.readFileSync(
            path.join(forumRoot, 'components/ForumCategoryPanel.tsx'),
            'utf8',
        );
        expect(categoryPanel).toContain('min-h-[44px]');
        expect(categoryPanel).toContain('ForumCategoryPanelSections');
        const categorySections = fs.readFileSync(
            path.join(forumRoot, 'components/ForumCategoryPanelSections.tsx'),
            'utf8',
        );
        expect(categorySections).toContain('FORUM_FILTER_CLEAR_BTN');
        const repoFilter = fs.readFileSync(
            path.join(forumRoot, 'components/RepositoryFilterPanel.tsx'),
            'utf8',
        );
        expect(repoFilter).toContain('FORUM_FILTER_CLEAR_BTN');
        const filterTheme = fs.readFileSync(path.join(forumRoot, 'forumPlumTheme.ts'), 'utf8');
        expect(filterTheme).toContain('FORUM_FILTER_CLEAR_BTN');
    });

    it('تحصين Wife/KYC: لا انتحال fallback، لا SVG data، إدارة المنتدى عبر requireForumAdminAuth', () => {
        const forumRoot = path.join(root, 'src/app/components/lawyer/CommunityScreen');
        const access = fs.readFileSync(
            path.join(forumRoot, 'hooks/useCommunityForumAccess.ts'),
            'utf8',
        );
        expect(access).toContain('canUseForumNetworkFeatures');
        expect(access).toContain('sessionUserId');
        expect(access).toContain('void fallbackUserId');
        expect(access).toContain('syncLawyerVerificationFromServer');
        expect(access).toContain('forumAccessDenialReason');
        expect(access).not.toMatch(/signedIn && gateLoading/);
        expect(access).not.toContain('forumDevOpen');
        expect(access).not.toContain('VITE_COMMUNITY_DEV_OPEN');
        const accessGate = fs.readFileSync(
            path.join(forumRoot, 'components/CommunityScreenAccessGate.tsx'),
            'utf8',
        );
        expect(accessGate).toContain('forum-access-pending');
        expect(accessGate).toContain('forum-access-rejected');
        const urlSafety = fs.readFileSync(
            path.join(root, 'src/app/services/forum/forumUrlSafety.ts'),
            'utf8',
        );
        expect(urlSafety).toContain('image/svg+xml');
        expect(urlSafety).toContain('isSafeRepositorySharePath');
        expect(urlSafety).toContain('buildRepositoryPublicFileUrl');
        const forumAuth = fs.readFileSync(path.join(root, 'src/app/api/forum/_auth.ts'), 'utf8');
        expect(forumAuth).toContain('requireForumAdminAuth');
        expect(forumAuth).toContain('wifeJsonResponse');
        const stats = fs.readFileSync(path.join(root, 'src/app/api/forum/stats/route.ts'), 'utf8');
        expect(stats).toContain('requireTrustedHeadquartersAdmin');
        expect(stats).not.toContain('requireWifeUser');
        const reportHook = fs.readFileSync(
            path.join(forumRoot, 'hooks/useLegalRepositoryReport.ts'),
            'utf8',
        );
        expect(reportHook).not.toContain('reportPost');
        expect(fs.existsSync(path.join(forumRoot, 'forumSwipeEdgeGuard.ts'))).toBe(true);
        expect(fs.existsSync(path.join(forumRoot, 'components/ForumSheetSwipeHandle.tsx'))).toBe(true);
        const sectionSwipe = fs.readFileSync(
            path.join(forumRoot, 'hooks/useForumSectionSwipe.ts'),
            'utf8',
        );
        expect(sectionSwipe).toContain('isForumSwipeFromSystemGestureEdge');
        expect(sectionSwipe).toContain('data-forum-no-swipe');
        const commentSheet = fs.readFileSync(
            path.join(forumRoot, 'components/CommentBottomSheet.tsx'),
            'utf8',
        );
        expect(commentSheet).toContain('ForumSheetSwipeHandle');
        expect(commentSheet).toContain('useCommunitySheetChrome');
        const addQuestion = fs.readFileSync(
            path.join(forumRoot, 'components/AddQuestionSheet.tsx'),
            'utf8',
        );
        expect(addQuestion).toContain('ForumSheetSwipeHandle');
        const createGroup = fs.readFileSync(
            path.join(forumRoot, 'components/CreateGroupModal.tsx'),
            'utf8',
        );
        expect(createGroup).toContain('ForumSheetSwipeHandle');
        expect(createGroup).toContain('useCommunitySheetChrome');
        const following = fs.readFileSync(
            path.join(forumRoot, 'components/ForumFollowingPanel.tsx'),
            'utf8',
        );
        expect(following).toContain('ForumSheetSwipeHandle');
        expect(following).toContain('useCommunitySheetChrome');
        expect(following).toContain('min-h-[44px]');
        const followList = fs.readFileSync(
            path.join(forumRoot, 'components/ForumFollowingList.tsx'),
            'utf8',
        );
        expect(followList).toContain('min-h-[44px] min-w-[44px]');
        expect(followList).not.toContain('w-8 h-8');
        const edgeGuard = fs.readFileSync(path.join(forumRoot, 'forumSwipeEdgeGuard.ts'), 'utf8');
        expect(edgeGuard).toContain('FORUM_SYSTEM_GESTURE_EDGE_PX = 32');
        const addQuestionChrome = fs.readFileSync(
            path.join(forumRoot, 'components/AddQuestionSheet.tsx'),
            'utf8',
        );
        expect(addQuestionChrome).toContain('useCommunitySheetChrome(isOpen)');
        const uploadClose = fs.readFileSync(
            path.join(forumRoot, 'components/UploadDocumentModal.tsx'),
            'utf8',
        );
        expect(uploadClose).toContain('FORUM_ICON_BTN');
        expect(uploadClose).not.toContain('w-8 h-8');
        const composer = fs.readFileSync(
            path.join(forumRoot, 'components/CommentSheetComposer.tsx'),
            'utf8',
        );
        expect(composer).toContain('text-[16px]');
        expect(composer).toContain("minHeight: '44px'");
        const body = fs.readFileSync(
            path.join(forumRoot, 'components/CommunityScreenBody.tsx'),
            'utf8',
        );
        expect(body).toContain('overscroll-contain');
        expect(body).toContain('swipeHandlers');
    });

    it('أداء keepAlive: لا إقلاع تغذية/اجتماعي/مجموعات بينما السطح مغلق', () => {
        const bootstrap = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/CommunityScreen/hooks/useCommunityPostsFeedBootstrap.ts',
            ),
            'utf8',
        );
        const controller = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenController.ts',
            ),
            'utf8',
        );
        const postsFeed = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/CommunityScreen/hooks/useCommunityPostsFeed.ts'),
            'utf8',
        );
        const flags = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenSocialFlags.ts',
            ),
            'utf8',
        );
        const lists = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenSocialLists.ts',
            ),
            'utf8',
        );
        expect(bootstrap).toContain('surfaceOpen === false');
        expect(controller).toContain('forumSurfaceOpen && canAccessLawyerForum && !accountFrozen');
        expect(controller).toContain('forumSurfaceOpen: forumNetworkLive');
        expect(controller).toContain('forumSurfaceOpen');
        const feedsHonesty = fs.readFileSync(path.join(root, 'src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenControllerFeeds.ts'), 'utf8');
        expect(feedsHonesty).toContain('surfaceOpen: forumSurfaceOpen');
        expect(postsFeed).toContain('[hasActiveUrgent, surfaceOpen]');
        expect(postsFeed).toContain('hasAnyActiveUrgentConsultation(posts)');
        expect(flags).toContain('surfaceOpen === false');
        expect(lists).toContain('surfaceOpen === false');
        const notif = fs.readFileSync(path.join(root, 'src/app/components/lawyer/CommunityScreen/hooks/useForumAppBarNotifications.ts'), 'utf8');
        const deep = fs.readFileSync(path.join(root, 'src/app/components/lawyer/CommunityScreen/hooks/useCommunityPostsFeedDeepLink.ts'), 'utf8');
        expect(notif).toContain('if (surfaceOpen === false)');
        expect(notif).toContain('useForumAppBarNotificationActions');
        expect(notif.split('\n').length).toBeLessThan(170);
        expect(deep).toContain('if (surfaceOpen === false) return');
    });
});
