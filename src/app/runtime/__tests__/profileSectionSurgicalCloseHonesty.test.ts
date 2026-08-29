import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('profile section surgical close honesty', () => {
    it('assemble يمرّر profileHostMounted من useLawyerDashboardProfileTab', () => {
        const assemble = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/assembleLawyerDashboardReadyView.ts'),
            'utf8',
        );
        expect(assemble).toContain('profileHostMounted: profileTab.profileHostMounted');
    });

    it('بعد الإقلاع: prefetch فقط — Host يُركَّب عند prime/hover لا على boot-reveal', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        expect(hook).toContain('prefetchProfileAfterBootReveal');
        expect(hook).toContain('PROFILE_LIVE_SHELL_READY_EVENT');
        expect(hook).toMatch(/onDashboardInteractive\([\s\S]*armProfileHost\(\)/);
        const warmBlock = hook.match(
            /const scheduleWarm = \(\) => \{[\s\S]*?\n        \};/,
        )?.[0];
        expect(warmBlock).toBeTruthy();
        expect(warmBlock).toContain('prefetchProfileAfterBootReveal');
        expect(warmBlock).not.toMatch(/\barmProfileHost\s*\(/);
    });

    it('هيدر الملف يمرّر sanitizeProfileMediaUrl قبل عرض الصورة', () => {
        const headerHook = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerProfileHeader.ts'),
            'utf8',
        );
        expect(headerHook).toContain('sanitizeProfileMediaUrl');
        const avatar = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileAvatarImage.tsx',
            ),
            'utf8',
        );
        expect(avatar).toContain('sanitizeProfileMediaUrl');
        expect(avatar).toContain('safeSrc');
    });

    it('مسارات الملف لا ترسل أحداث تصحيح إلى 127.0.0.1:7777', () => {
        const files = [
            'src/app/services/cloud/lawyerProfileCloud.ts',
            'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileLoader.ts',
            'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileEditSession.ts',
        ];
        for (const rel of files) {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(src, rel).not.toContain('127.0.0.1:7777');
        }
    });

    it('تنقّل الملف يستخدم hasLocalAppSession(userId) للجلسة المحلية', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        expect(hook).toContain('hasLocalAppSession(userId)');
        expect(hook).not.toContain('isRealSignedIn(null)');
        expect(hook).toContain('commitProfileClose({ closeSettings, setActiveTab })');
        expect(hook).toContain('wasProfileOpenedThisPage');
        expect(hook).not.toContain('revealProfileWarmShell');
        const openSession = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/profile/profileOpenSession.ts'),
            'utf8',
        );
        expect(openSession).toContain('data-hami-profile-opened-page');
        expect(openSession).toContain('data-hami-profile-studio-open');
    });

    it('زر الملف في بلاطة المنتدى يعلن aria-controls ويكشف فوراً على pointerdown', () => {
        const forum = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/commandHub/ForumTile.tsx',
            ),
            'utf8',
        );
        expect(forum).toContain('ForumTileProfileQuarterSlot');
        expect(forum).toContain('onPrimeProfilePress');
        expect(forum).not.toContain('revealProfileWarmShell');
        expect(forum).not.toContain('ProfileAvatarImage');
        const quarterSlot = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterSlot.tsx',
            ),
            'utf8',
        );
        expect(quarterSlot).toContain('LazyForumTileProfileQuarter');
        const quarter = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarter.tsx',
            ),
            'utf8',
        );
        expect(quarter).toContain('home-dock-forum-profile');
        expect(quarter).toMatch(
            /displayMaxEdge=\{PROFILE_AVATAR_DISPLAY_MAX_EDGE_TILE\}\s+priority/,
        );
        expect(quarter).not.toContain('crossfadeMs');
        expect(quarter).not.toContain('isInlineDataAvatar');
        expect(quarter).toContain('aria-controls="lawyer-dashboard-profile-surface"');
        expect(quarter).toContain('openedFromPointerRef');
        expect(quarter).toContain('onPrimeProfilePress');
        expect(quarter).not.toContain('revealProfileWarmShell');
        expect(quarter).toContain('beginProfileBackLock');
        const fallback = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterFallback.tsx',
            ),
            'utf8',
        );
        expect(fallback).toContain('onOpenProfile');
        expect(fallback).toContain('aria-controls="lawyer-dashboard-profile-surface"');
        expect(fallback).toContain('min-h-[44px]');
        const skeleton = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/HomeWidgetSlotSkeleton.tsx'),
            'utf8',
        );
        expect(skeleton).toContain('ForumTileProfileQuarterFallback');
        expect(skeleton).not.toContain('onOpenProfile=');
    });

    it('الملف يُفتَح من صف المنتدى — الهيدر بلا خصائص ملف ميتة', () => {
        const bundle = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts'),
            'utf8',
        );
        const header = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerDashboardParts/components/Header.tsx'),
            'utf8',
        );
        expect(bundle).not.toContain('onProfilePointerEnter: headerPrefetch.onProfilePointerEnter');
        expect(bundle).not.toContain('onProfilePointerDown: headerPrefetch.onProfilePointerDown');
        expect(bundle).not.toContain('onProfileClick:');
        expect(bundle).toContain('onPrimeProfile: headerPrefetch.onProfilePointerEnter');
        expect(bundle).toContain('onPrimeProfilePress: headerPrefetch.onProfilePointerDown');
        expect(header).not.toContain('onProfileClick');
        expect(header).not.toContain('profileExpanded');
    });

    it('استوديو الصفحة: محرر الخلفية والهيكل يملكان رجوعاً أصلياً، والتمرير بلا content-visibility:auto', () => {
        const editor = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileCanvasBackgroundEditor.ts',
            ),
            'utf8',
        );
        expect(editor).toContain('registerNativeBackHandler');
        expect(editor).toContain("e.key === 'Escape'");
        const fallback = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheetLoadingFallback.tsx',
            ),
            'utf8',
        );
        expect(fallback).toContain('registerNativeBackHandler');
        const sheet = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheet.tsx',
            ),
            'utf8',
        );
        expect(sheet).toContain('closeEnabled: !sheetBusy && !canvasEditorOpen');
        expect(sheet).toContain('trapTab: !canvasEditorOpen');
        const css = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/RoyalLawyerProfile/profileSettingsFx.css'),
            'utf8',
        );
        expect(css).toContain("@import './profileSettingsSheetChrome.css'");
        expect(css).toContain("@import './profileSettingsBlocks.css'");
        expect(css).toContain("@import './profileSettingsStudioEditor.css'");
        expect(css).not.toContain('.profile-settings-scroll-panel');
        const chrome = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/RoyalLawyerProfile/profileSettingsSheetChrome.css'),
            'utf8',
        );
        expect(chrome).not.toContain('content-visibility: auto');
        expect(chrome).toContain('content-visibility: visible');
        expect(chrome).toContain('.profile-settings-scroll-panel');
    });

    it('يسخّن مقطع الملف في خمول ما بعد اللوحة ويفكك Host بعد خمول الرئيسية', () => {
        const chunks = fs.readFileSync(
            path.join(root, 'src/app/runtime/overlayEntryChunks.ts'),
            'utf8',
        );
        expect(chunks).toContain("profile/ProfileTabHost");
        expect(chunks).toContain('royalLawyerProfileLoader');
        const profilePrefetchIdx = chunks.indexOf("profile/ProfileTabHost");
        const executionPrefetchIdx = chunks.indexOf('LawyerDashboardExecutionOverlayEntry');
        expect(profilePrefetchIdx).toBeGreaterThan(0);
        expect(profilePrefetchIdx).toBeLessThan(executionPrefetchIdx);

        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        expect(hook).toContain('scheduleProfileHostIdleRelease');
        const warmBlock = hook.match(
            /const scheduleWarm = \(\) => \{[\s\S]*?\n        \};/,
        )?.[0];
        expect(warmBlock).toBeTruthy();
        expect(warmBlock).not.toContain('warmProfileOnHover');

        const boot = fs.readFileSync(path.join(root, 'src/app/runtime/profileBootHydrator.ts'), 'utf8');
        expect(boot).toContain('warmProfileData(userId)');
        expect(boot).not.toContain('primeProfileForBoot');

        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/profile/ProfileTabHost.tsx'),
            'utf8',
        );
        expect(host).not.toContain('primeProfileForBoot');
        expect(host).toContain('markRoyalLawyerProfileModuleResolved');
    });

    it('زر التعديل في الصفحة الحية من click — الغطاء فقط يصفّر من pointerdown', () => {
        const hero = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileHeroSection.tsx',
            ),
            'utf8',
        );
        const content = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileContent.tsx'),
            'utf8',
        );
        expect(hero).not.toContain('useArmedPointerAction(startEdit)');
        expect(hero).toContain('onEditClick={() => {');
        expect(hero).toContain('startEdit()');
        expect(hero).toContain('armEditOnPointerDown');
        expect(hero).toContain('if (!armEditOnPointerDown || !isPrimaryDragPointer(event)) return');
        expect(content).toContain('armEditOnPointerDown={false}');
        expect(hero).toContain('armOnPointerDown: armEditOnPointerDown');
        const chrome = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileChromeHeader.tsx',
            ),
            'utf8',
        );
        expect(chrome).toContain('armBackOnPointerDown = false');
        expect(chrome).toContain('armOnPointerDown');
        const tree = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileFirstPaintTree.tsx',
            ),
            'utf8',
        );
        expect(tree).toContain('armBackOnPointerDown={armEditOnPointerDown}');
        const armed = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useArmedPointerAction.ts',
            ),
            'utf8',
        );
        expect(armed).toContain('options?.armOnPointerDown === true');
        const trap = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsFocusTrap.ts',
            ),
            'utf8',
        );
        expect(trap).toContain("el.getAttribute('data-testid') !== 'profile-settings-close'");
        const sheetHeader = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsSheetHeader.tsx',
            ),
            'utf8',
        );
        expect(sheetHeader).toContain('aria-label="إغلاق استوديو الصفحة"');
        expect(sheetHeader).not.toMatch(/aria-label="إغلاق"\s/);
        const openPage = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/profile/ProfileOpenFirstPage.tsx'),
            'utf8',
        );
        expect(openPage).toContain('armEditOnPointerDown');
        expect(openPage).not.toContain('armEditOnPointerDown={false}');
        const overlay = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/dashboardOverlayCoordinator.ts'),
            'utf8',
        );
        expect(overlay).toContain('if (except === undefined) return !isProfileShellSnappedOpen()');
        const studioLife = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioSheetLifecycle.ts',
            ),
            'utf8',
        );
        expect(studioLife).toContain('markProfileStudioOpen()');
        expect(studioLife).toContain('isProfileStudioMarkedOpen()');
        const dismissListener = studioLife.slice(studioLife.indexOf('const onDismiss'));
        expect(dismissListener).toContain('settingsOpenRef.current = false');
        const escapeHook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileScreenEscape.ts',
            ),
            'utf8',
        );
        expect(escapeHook).toContain('isProfileStudioSheetVisible()');
        expect(escapeHook).toContain('isProfileStudioChromeVisible()');
        expect(escapeHook).toContain('onCloseSettings()');
        const leave = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileLeaveAndGallery.ts',
            ),
            'utf8',
        );
        expect(leave).toContain('isProfileStudioMarkedOpen()');
        const closeFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/profile/profileShellCloseFlow.ts'),
            'utf8',
        );
        expect(closeFlow).toContain('finally');
        const shellExit = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/profile/profileShellExit.ts'),
            'utf8',
        );
        expect(shellExit).toContain('isStudioChromeMounted()');
        expect(shellExit).toContain('isProfileStudioChromeVisible');
        expect(shellExit).toContain("import.meta.env.VITE_E2E");
        expect(shellExit).toContain('recordE2eProfileClose(true)');
    });

    it('فتح الملف في E2E ينتظر snap html قبل النقر على التعديل', () => {
        const fixtures = fs.readFileSync(
            path.join(root, 'e2e/helpers/profileFixtures.ts'),
            'utf8',
        );
        const expectStart = fixtures.indexOf('export async function expectProfileTabOpen');
        const expectNext = fixtures.indexOf('export async function clickVisibleProfileBack');
        const openExpect = fixtures.slice(expectStart, expectNext);
        expect(openExpect).toContain("getAttribute('data-hami-profile-open')) !== '1'");
        expect(openExpect).toContain('home-dock-forum-profile');
        expect(openExpect).toContain('forceOpenProfileFromPage');
        expect(fixtures).toContain('export async function saveProfileDisplayName');
        const saveFn = fixtures.slice(fixtures.indexOf('export async function saveProfileDisplayName'));
        expect(saveFn).toContain('expectProfileTabOpen(page)');
        expect(fixtures).toContain('writeProfileNameWithoutPointer');
        expect(fixtures).toContain('studio-profile-closed');
        expect(fixtures).toContain('openedPage');
        expect(fixtures).toContain('studioOpen');
        expect(fixtures).toContain('lastSnap');
        expect(fixtures).toContain("data-hami-profile-open', '1'");
        expect(fixtures).toContain('clickNativeElement');
        expect(fixtures).toContain('waitForProfileForceOpenHook');
        expect(fixtures).toContain('forum-member-profile');
        expect(fixtures).toContain("toHaveCount(0, { timeout: 15_000 })");
        const openFn = fixtures.slice(fixtures.indexOf('export async function openLawyerProfile'));
        expect(openFn).toContain('expectProfileTabOpen(page)');
        expect(openFn).toContain("html.getAttribute('data-hami-profile-open')) === '1'");
        expect(openFn).toContain('forumProfile.count()');
        expect(openFn).toContain('waitForProfileForceOpenHook(page, false)');
        const visitorFn = fixtures.slice(
            fixtures.indexOf('export async function openForumVisitorAuthorProfile'),
        );
        expect(visitorFn).toContain('E2E_FORUM_VISITOR_AUTHOR_NAME');
        expect(visitorFn).not.toContain('postSnippet');
        expect(visitorFn).toContain('forum-member-profile');
        expect(visitorFn).toContain('.toPass(');
    });

    it('تركيب خطاف الملف الكسول لا يمسح snap فتح قائم', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        const mount = hook.slice(hook.indexOf('useLayoutEffect(() => {'), hook.indexOf('useEffect(() => {'));
        expect(mount).toContain('isProfileShellSnappedOpen()');
        expect(mount.indexOf('wasProfileOpenedThisPage()')).toBeLessThan(
            mount.indexOf('resetProfileShellOnColdDashboardBoot()'),
        );
        expect(mount.indexOf('concealProfileWarmShell()')).toBeLessThan(
            mount.indexOf('resetProfileShellOnColdDashboardBoot()'),
        );
        expect(hook).toContain('openProfileTabRef.current()');
        const onLive = hook.slice(
            hook.indexOf('const onLive = () => {'),
            hook.indexOf("window.addEventListener(PROFILE_LIVE_SHELL_READY_EVENT, onLive)"),
        );
        expect(onLive).toContain('wasProfileOpenedThisPage()');
        expect(onLive).toContain('isProfileShellSnappedOpen()');
        expect(onLive).toContain("setActiveTab('profile')");
        const concealHome = hook.slice(hook.indexOf('deferShellConcealAfterHandoff'));
        expect(concealHome).toContain('wasProfileOpenedThisPage()');
        expect(concealHome).toContain("setActiveTab('profile')");
        expect(concealHome.indexOf('wasProfileOpenedThisPage()')).toBeLessThan(
            concealHome.indexOf('concealProfileWarmShell()'),
        );
        expect(hook).toContain('clearProfileShellClosing()');
        const nav = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/lawyerDashboardNav.ts'),
            'utf8',
        );
        const resetFn = nav.slice(nav.indexOf('export function resetProfileShellOnColdDashboardBoot'));
        expect(resetFn).toContain("removeAttribute('data-hami-profile-closing')");
        expect(resetFn).toContain('wasProfileOpenedThisPage()');
        const overlays = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardOverlays.ts'),
            'utf8',
        );
        expect(overlays).toContain("if (wasProfileOpenedThisPage()) return 'profile'");
        const snap = fs.readFileSync(
            path.join(root, 'src/app/services/profile/profileShellSnap.ts'),
            'utf8',
        );
        expect(snap).toContain('if (wasProfileOpenedThisPage())');
        expect(snap).toContain('import.meta.env.VITE_E2E');
        const returnHome = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/lawyerDashboardReturnHome.ts'),
            'utf8',
        );
        expect(returnHome.indexOf('clearProfileOpenedThisPage()')).toBeLessThan(
            returnHome.indexOf('snapProfileShellClose()'),
        );
        const paint = fs.readFileSync(
            path.join(root, 'src/app/runtime/profileInstantPaint.ts'),
            'utf8',
        );
        expect(paint).toContain("removeAttribute('inert')");
        expect(paint).toContain('if (wasProfileOpenedThisPage()) return');
        const surface = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/schedule/DashboardTabSurface.tsx',
            ),
            'utf8',
        );
        expect(surface).toContain('isProfileShellSnappedOpen');
        expect(surface).toContain('inertProps(!live)');
        const studioSpec = fs.readFileSync(
            path.join(root, 'e2e/lawyer-profile-studio.spec.ts'),
            'utf8',
        );
        expect(studioSpec).toContain('prepareProfileStudioE2E');
        expect(studioSpec).not.toContain('studioSuiteSetup');
        expect(studioSpec).toContain('clickCatalogChip(page');
        expect(studioSpec).toContain('profile-portrait-frame-');
        expect(studioSpec).not.toContain('chip.click({ force: true');
    });

    it('شرائح كتالوج الاستوديو تُنقر عبر evaluate ولا تُقفل بالحفظ الصامت', () => {
        const fixtures = fs.readFileSync(
            path.join(root, 'e2e/helpers/profileFixtures.ts'),
            'utf8',
        );
        const clickStart = fixtures.indexOf('export async function clickCatalogChip');
        const clickNext = fixtures.indexOf('export async function', clickStart + 'export async function clickCatalogChip'.length);
        const clickFn = fixtures.slice(clickStart, clickNext);
        expect(clickFn).toContain('.evaluate(');
        expect(clickFn).toContain('.toPass(');
        expect(clickFn).toContain('toBeEnabled');
        expect(clickFn).toContain('profile-portrait-frame-');
        expect(clickFn).toContain('scrollIntoView');
        expect(clickFn).not.toContain('force: true');

        const resetFn = fixtures.slice(fixtures.indexOf('export async function resetProfileScreenForE2E'));
        expect(resetFn).toContain('profile-settings-close');

        const save = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioCustomizationSave.ts',
            ),
            'utf8',
        );
        const silentLock = save.slice(save.indexOf('/* الحفظ الصامت'));
        expect(silentLock).toContain('if (!options?.silent)');
        expect(silentLock).toContain('setSavingSettings(true)');

        const sheet = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheet.tsx',
            ),
            'utf8',
        );
        expect(sheet).toContain('ignoreBackdropCloseUntilRef.current = Date.now() + 420');
        const sheetActions = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetActions.ts',
            ),
            'utf8',
        );
        expect(sheetActions).toContain('ignoreBackdropCloseUntilRef.current = Date.now() + 700');
        expect(sheet).toContain('onUpdateBlock={guardedUpdateBlock}');
        expect(sheet).toContain('onAddBlock={guardedAddBlock}');

        const appearance = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsAppearanceTab.tsx',
            ),
            'utf8',
        );
        expect(appearance).toContain("? 'true' : 'false'");

        const theme = fs.readFileSync(
            path.join(root, 'src/app/services/profile/profileThemeRuntime.ts'),
            'utf8',
        );
        expect(theme).toContain('el.dataset.profileAccent = appearance.accentColor');
        const profileRoot = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/RoyalLawyerProfile/index.tsx'),
            'utf8',
        );
        const surface = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfilePageSurfaceFrame.tsx',
            ),
            'utf8',
        );
        expect(profileRoot).toContain('ProfilePageSurfaceFrame');
        expect(surface).toContain('data-profile-accent={accent}');
        const actions = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetActions.ts',
            ),
            'utf8',
        );
        const saveFn = actions.slice(actions.indexOf('const handleSave = useCallback'));
        expect(saveFn).toContain('onClose({ soft: true })');
        expect(saveFn.indexOf('onClose({ soft: true })')).toBeLessThan(saveFn.indexOf('void onSave(snapshot)'));
        expect(fixtures).toContain('export async function saveProfileStudioAndClose');
        expect(fixtures).toContain('export async function reopenLawyerProfileFromHome');
        const reopenStart = fixtures.indexOf('export async function reopenLawyerProfileFromHome');
        const reopenNext = fixtures.indexOf(
            'export async function',
            reopenStart + 'export async function reopenLawyerProfileFromHome'.length,
        );
        const reopenFn = fixtures.slice(reopenStart, reopenNext);
        expect(reopenFn).toContain('flushHamiPersistForE2E');
        expect(reopenFn).toContain('closeLawyerProfileTab');
        expect(reopenFn).toContain('openLawyerProfile(page)');
        expect(reopenFn).not.toContain('bootLawyerDashboardForProfile(page)');
        const persistSpec = fs.readFileSync(
            path.join(root, 'e2e/lawyer-profile-studio.spec.ts'),
            'utf8',
        );
        expect(persistSpec).toContain('saveProfileStudioAndClose');
        expect(persistSpec).toContain('data-profile-accent');
        expect(persistSpec).toContain('profile-custom-blocks');
        expect(persistSpec).toContain('حاوية نص E2E');
        const customBlocks = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileCustomBlocks.tsx',
            ),
            'utf8',
        );
        expect(customBlocks).toContain('data-testid="profile-custom-blocks"');
        expect(customBlocks).toContain('data-testid={`profile-page-block-${block.id}`}');
        expect(persistSpec).toContain('حاوية صورة E2E');
        expect(persistSpec).toContain('timeout: 240_000');
        expect(persistSpec).toContain('image-template-cinema');
        expect(persistSpec).toContain('image-rim-neon');
        expect(persistSpec).toContain('uploadStudioCustomBlockImage');
        expect(persistSpec).toContain('reopenLawyerProfileFromHome');
        expect(fixtures).toContain('export async function uploadStudioCustomBlockImage');
        expect(fixtures).toContain('profile-studio-block-image-input');
        const fileInputs = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsSheetFileInputs.tsx',
            ),
            'utf8',
        );
        expect(fileInputs).toContain('data-testid="profile-studio-block-image-input"');
        expect(fileInputs).toContain('data-testid="profile-studio-canvas-bg-input"');
        expect(fileInputs).toContain('aria-hidden="true"');
        const blockView = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileCustomBlockView.tsx',
            ),
            'utf8',
        );
        expect(blockView).toContain('data-testid="profile-page-image-block"');
        expect(blockView).toContain("data-has-image={block.imageUrl ? 'true' : 'false'}");
        const uploadFlow = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/profileBlockUploadFlow.ts',
            ),
            'utf8',
        );
        expect(uploadFlow).toContain('export function resolveProfileBlockImageUploadTarget');
        const imageUpload = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsBlockImageUpload.ts',
            ),
            'utf8',
        );
        expect(imageUpload).toContain('resolveProfileBlockImageUploadTarget');
        const blockOps = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsBlockOps.ts',
            ),
            'utf8',
        );
        expect(blockOps).toContain('getExpandedBlockId: () => expandedBlockIdRef.current');
        expect(fixtures).toContain('export async function clickProfileStudioTab');
        expect(fixtures).toContain('export async function uploadProfileGalleryImage');
        const closedStart = fixtures.indexOf('export async function expectProfileTabClosed');
        const closedNext = fixtures.indexOf('async function waitForProfileForceOpenHook');
        const closedFn = fixtures.slice(closedStart, closedNext);
        expect(closedFn).toContain('data-hami-profile-open');
        expect(closedFn).toContain('data-hami-profile-closing');
        expect(closedFn).toContain('home-dock-forum-profile');
        expect(closedFn).not.toContain("getByTestId('lawyer-profile')");
        expect(fixtures).toContain('homeClass');
        const vis = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/lawyerDashboardHeaderVisibility.ts'),
            'utf8',
        );
        expect(vis).toContain("tab === 'profile'");
        const mainView = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(mainView).toContain('const homeActive = homeTabProps.visible;');
        /* مصدر واحد لحساب visible للرئيسية: البناء والترقيع لا يختلفان تحت الملف */
        const patch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/patchLawyerDashboardHeaderOverlayOpen.ts'),
            'utf8',
        );
        expect(patch).toContain('isLawyerDashboardHomeStackTab(input.activeTab)');
        const profileSpec = fs.readFileSync(path.join(root, 'e2e/lawyer-profile.spec.ts'), 'utf8');
        expect(profileSpec).not.toContain('force: true');
        expect(profileSpec).toContain('clickProfileStudioTab');
        expect(profileSpec).toContain('reopenLawyerProfileFromHome');
        const privacySpec = fs.readFileSync(
            path.join(root, 'e2e/lawyer-profile-privacy-edit.spec.ts'),
            'utf8',
        );
        expect(privacySpec).not.toContain('force: true');
        expect(privacySpec).toContain('uploadProfileGalleryImage');
        expect(privacySpec).toContain('profile-contact-add-call');
        expect(privacySpec).toContain('profile-gallery-tile-0');
        expect(privacySpec).toContain('reopenLawyerProfileFromHome');
        const contacts = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileContactSection.tsx',
            ),
            'utf8',
        );
        expect(contacts).toContain('data-testid={`profile-contact-add-${opt.type}`}');
        const gallerySection = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileGallerySection.tsx',
            ),
            'utf8',
        );
        expect(gallerySection).toContain('data-testid="lawyer-profile-gallery"');
        expect(gallerySection).toContain("data-empty={gallery.length === 0 ? 'true' : 'false'}");
    });

    it('حفظ الملف ينتظر القرص ولا تُمسَح الحمولة الغنية بسحابة شحيحة', () => {
        const cloud = fs.readFileSync(
            path.join(root, 'src/app/services/cloud/lawyerProfileCloud.ts'),
            'utf8',
        );
        expect(cloud).toContain('waitForPendingSetItem');
        expect(cloud).not.toMatch(/setTimeout\(resolve, 8_000\)/);
        expect(cloud).toContain('reconcileOwnerProfileFromCloud');
        expect(cloud).toContain('profile: cleaned');
        const saveHook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileEditSave.ts',
            ),
            'utf8',
        );
        expect(saveHook).toContain('draftRef.current ?? draft');
        expect(saveHook).toContain('const saveResult = await enqueueProfileSave');
        const beforeExit = saveHook.slice(
            0,
            saveHook.indexOf('flushSync(() => {\n                    setIsEditing(false)'),
        );
        expect(beforeExit).toContain('await enqueueProfileSave');
        const persist = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/profileEditPersist.ts',
            ),
            'utf8',
        );
        expect(persist).toContain('result.profile ?? toSave');
        expect(persist).toContain('result.cloudSynced === true');
        const store = fs.readFileSync(path.join(root, 'src/app/services/SecureStoreService.ts'), 'utf8');
        expect(store).toContain('waitForAllPendingPersist');
        expect(store).toContain('queueDurableSetItem');
        const fixtures = fs.readFileSync(path.join(root, 'e2e/helpers/profileFixtures.ts'), 'utf8');
        expect(fixtures).toContain('export async function flushHamiPersistForE2E');
        expect(fixtures).toContain('waitForAllPendingPersist');
        const reopen = fixtures.slice(fixtures.indexOf('export async function reopenLawyerProfileFromHome'));
        expect(reopen).toContain('flushHamiPersistForE2E');
        const session = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileEditSession.ts',
            ),
            'utf8',
        );
        expect(session).toContain('draftRef: draftApi.draftRef');
    });
});
