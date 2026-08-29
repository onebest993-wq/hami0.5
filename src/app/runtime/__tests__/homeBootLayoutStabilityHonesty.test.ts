import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const dash = join(root, 'src/app/components/lawyer/dashboard');

describe('home boot layout stability', () => {
    it('هيكل الإقلاع يشارك هندسة التبويب النهائية', () => {
        const shell = readFileSync(join(dash, 'HomeTabPaintShell.tsx'), 'utf8');
        const wrap = readFileSync(join(dash, 'LawyerDashboardHomeTab.tsx'), 'utf8');
        expect(shell).toContain('hami-below-lawyer-header');
        expect(shell).toContain('HomeLayoutScrollRoot');
        expect(shell).toContain('data-testid="lawyer-home-tab"');
        expect(wrap).toContain('HomeTabPaintShell');
        expect(wrap).toContain('HomeMainGridFirstPaint');
    });

    it('يكشف الغطاء من الشبكة الحية بعد اكتمال الكروم؛ FirstPaint يبقى تحت الغطاء', () => {
        const wrap = readFileSync(join(dash, 'LawyerDashboardHomeTab.tsx'), 'utf8');
        expect(wrap).toContain('getHomeTabContentSync');
        expect(wrap).not.toContain('getCommandHubTilesSync');
        expect(wrap).not.toContain('subscribeCommandHubTiles');
        expect(wrap).not.toContain('loadCommandHubTiles');
        expect(wrap).toContain('subscribeHomeBootChrome');
        expect(wrap).toContain('isHomeBootChromeReady');
        expect(wrap).toContain('return content ? content : null');
        expect(wrap).not.toContain('content && tiles ? content : null');
        const firstPaint = readFileSync(join(dash, 'HomeMainGridFirstPaint.tsx'), 'utf8');
        expect(firstPaint).toContain('announcePaint={false}');
        expect(firstPaint).toContain('data-hami-home-first-paint-layer');
        expect(firstPaint).toContain('بلاطات حقيقية');
        const screenCss = readFileSync(join(root, 'src/styles/app-screen.css'), 'utf8');
        expect(screenCss).toContain(":not([data-hami-boot-revealed='1']) .hami-app-screen");
        const gate = readFileSync(join(root, 'src/app/bootstrap/homeMainGridPaintGate.ts'), 'utf8');
        expect(gate).toContain('removeStaticBootShell()');
        expect(gate).not.toContain("removeStaticBootShell({ instant: true })");
        expect(gate).toContain('markBootRevealDone');
        expect(gate).toContain('idempotent');
        const announce = readFileSync(join(root, 'src/app/bootstrap/homeMainGridPaintAnnounce.ts'), 'utf8');
        expect(announce).toContain('isHomeGridRevealReady');
        expect(announce).toContain('isLiveHubPaintWorthy');
        expect(announce).toContain('isHubChromePaintWorthy');
        expect(announce).toContain("from '@/app/bootstrap/bootWorthySurface'");
        expect(announce).not.toContain('if (!live && !skeleton) return true');
        expect(announce).toContain('bindHomeIdentityChromeReady');
        expect(announce).toContain('hasIncompleteHomeWidgetSlots');
        expect(announce).toContain('data-identity-settled');
        expect(announce).not.toContain("querySelector('img')");
        expect(announce).not.toContain('data-avatar-expected');
        const worthy = readFileSync(join(root, 'src/app/bootstrap/bootWorthySurface.ts'), 'utf8');
        expect(worthy).toContain('isLiveHubPaintWorthy');
        expect(worthy).toContain('isHubChromePaintWorthy');
        expect(worthy).toContain('hasLiveCommandTiles');
        expect(worthy).toContain('hasIncompleteHomeWidgetSlots');
        expect(worthy).toContain('home-hub-skeleton-empty-copy');
        expect(worthy).toContain('data-identity-settled');
        expect(worthy).not.toContain("querySelector('img')");
        expect(announce).not.toContain("from '@/app/bootstrap/homeBootChrome'");
        expect(announce).not.toMatch(/revealReady \|\| attempts >= MAX_GRID_PAINT_ATTEMPTS/);
        expect(announce).toContain('canUncoverLiveHubAfterPaintBudget');
        expect(gate).toContain('watchDashboardSurfaceUncover');
        expect(gate).toContain('MutationObserver');
        expect(gate).toContain('setTimeout(tick, 0)');
        expect(gate).not.toContain('setTimeout(tick, 50)');
        expect(gate).toContain('BOOT_UNCOVER_WATCHDOG_MS');
        expect(gate).toContain('isWorthyBootSurface');
        expect(gate).toContain('findLiveHomeMainGrid');
        expect(gate).toContain('isHomeGridRevealReady');
        expect(gate).toContain("from '@/app/bootstrap/bootWorthySurface'");
        const preamble = readFileSync(join(root, 'src/boot/bootEntryPreamble.ts'), 'utf8');
        expect(preamble).toContain('prepareHomeBootChrome');
        expect(preamble).toContain('warmBootLawyerProfile');
        expect(preamble).not.toMatch(/await Promise\.race\(\[\s*profileWarm/);
        expect(preamble.indexOf("import('@/app/bootstrap/homeBootChrome')")).toBeLessThan(
            preamble.indexOf("import('@/app/services/settings/apply')"),
        );
        const reveal = readFileSync(join(root, 'src/app/bootstrap/useBootReveal.ts'), 'utf8');
        expect(reveal).not.toContain('removeStaticBootShell');
        expect(reveal).not.toContain('force: true');
        expect(reveal).toContain('طبقة React فقط');
        const peek = readFileSync(join(dash, 'peekForumFirstPaintChrome.ts'), 'utf8');
        expect(peek).toContain('resolveForumTileProfileChrome');
        expect(peek).not.toContain('hydrateProfileWarmCachePeekSync');
        const chromeState = readFileSync(join(root, 'src/app/bootstrap/homeBootChromeState.ts'), 'utf8');
        expect(chromeState).toContain('bindHomeIdentityChromeReady');
        expect(chromeState).toContain("from '@/app/bootstrap/homeMainGridPaintAnnounce'");
        const chrome = readFileSync(join(root, 'src/app/bootstrap/homeBootChrome.ts'), 'utf8');
        expect(chrome).toContain('markPrepared()');
        expect(chrome).toContain('prepareCriticalUiFonts');
        expect(chrome).toContain('fonts.load');
        expect(chrome).toContain('setTimeout(resolve, 180)');
        expect(chrome).toContain('prepareIdentityChrome()');
        expect(chrome).toContain('publishUserIdentityUiState');
        expect(chrome).not.toContain('if (!settledName)');
        expect(chrome).toContain("settledName || 'م'");
        expect(chrome).not.toContain("displayName.trim() || 'المحامي'");
        expect(chrome).toContain('waitWhileLocalProfileUnread');
        expect(chrome).toContain('isLawyerProfileLocalUnread');
        expect(chrome).toContain('prepareLiveHomeModules()');
        const chromePrepare = chrome.slice(chrome.indexOf('export function prepareHomeBootChrome'));
        const liveModulesCall = chromePrepare.indexOf('prepareLiveHomeModules()');
        const profileWaitCall = chromePrepare.indexOf('waitWhileProfileWarmPending');
        expect(liveModulesCall).toBeGreaterThan(-1);
        expect(profileWaitCall).toBeGreaterThan(-1);
        expect(liveModulesCall).toBeLessThan(profileWaitCall);
        expect(chromePrepare).toMatch(
            /Promise\.all\(\[\s*prepareIdentityChrome\(\),\s*prepareCriticalUiFonts\(\),\s*liveModules,/,
        );
        expect(chrome).not.toContain('void prepareLiveHomeModules()');
        expect(chrome).not.toContain('loadForumTileProfileQuarterModule');
        expect(chrome).toContain('loadHomeTabContent');
        expect(chrome).toContain('loadCommandHubTiles');
        expect(chrome).toContain('loadLawyerHomeHubCardModule');
        expect(chrome).toContain('kickHomeHubRadarWarm()');
        expect(chrome).not.toContain('await kickHomeHubRadarWarm');
        expect(chrome).not.toContain('kickHomeHubCardModule');
        expect(chrome).toMatch(
            /Promise\.all\(\[\s*loadHomeTabContent\(\)\.catch\(\(\) => undefined\),\s*loadCommandHubTiles\(\)\.catch\(\(\) => undefined\),\s*loadLawyerHomeHubCardModule/,
        );
        expect(chrome).toContain("import('@/app/services/profile/resolveProfileAvatarDisplaySrc')");
        expect(chrome).not.toContain('await avatarMod.resolveProfileAvatarDisplaySrc');
        expect(chromePrepare).toContain('Promise.all([');
        expect(chromePrepare).toContain('waitWhileProfileWarmPending');
        expect(chromePrepare).toContain('waitWhileLocalProfileUnread');
        expect(chrome).not.toMatch(/from '@\/app\/services\/profile\/resolveProfileAvatarDisplaySrc'/);
        expect(wrap).toContain("from '@/app/bootstrap/homeBootChromeState'");
        expect(wrap).not.toMatch(/from '@\/app\/bootstrap\/homeBootChrome['"]/);
    });

    it('أول طلاء يسبق تحميل الهاب والبلاطات؛ الهيكل يحجز أثر الهاب الحي', () => {
        const firstPaint = readFileSync(join(dash, 'HomeMainGridFirstPaint.tsx'), 'utf8');
        const skeleton = readFileSync(join(dash, 'HomeWidgetSlotSkeleton.tsx'), 'utf8');
        const css = readFileSync(join(dash, 'lawyerHomeFx-critical.css'), 'utf8');
        expect(firstPaint).not.toContain('prefetchHomeTabContent');
        expect(firstPaint).not.toContain('prefetchCommandHubTiles');
        expect(firstPaint).not.toContain('prefetchLawyerHomeHubCardModule');
        expect(firstPaint).toContain('onActivateWidget');
        const wrap = readFileSync(join(dash, 'LawyerDashboardHomeTab.tsx'), 'utf8');
        expect(wrap).toContain('activateHomeFirstPaintWidget');
        expect(skeleton).toContain('HUB_HALF_TILE_MIN_CLASS');
        expect(skeleton).toContain('hami-hub-tile-face');
        expect(skeleton).toContain('hami-hub-title-mark');
        expect(skeleton).toContain('hami-forum-profile-shell');
        expect(skeleton).toContain('peekForumFirstPaintChrome');
        expect(skeleton).toContain('skipGlassPaint: true');
        expect(skeleton).toContain("import { HomeBlockPatternOverlay } from './HomeBlockPatternOverlay'");
        expect(skeleton).toContain('<HomeBlockPatternOverlay');
        const route = readFileSync(join(dash, 'commandHub/RouteTile.tsx'), 'utf8');
        const forum = readFileSync(join(dash, 'commandHub/ForumTile.tsx'), 'utf8');
        const forumFace = readFileSync(join(dash, 'commandHub/ForumTileMainFace.tsx'), 'utf8');
        expect(route).toContain('HomeBlockPatternOverlay');
        expect(forum).toContain('ForumTileMainFace');
        expect(forumFace).toContain('HomeBlockPatternOverlay');
        expect(css).toContain("[data-testid='home-main-grid'] [data-hami-block]");
        expect(css).toContain('backdrop-filter: none !important');
        expect(skeleton).toContain('HUB_HALF_TILE_BASE_PX');
        expect(css).toMatch(
            /\[data-testid='home-hub-card-skeleton'\]\s*\{[^}]*min-height:\s*var\(--hami-home-hub-empty-slot-h\)/s,
        );
        expect(css).toMatch(
            /\[data-hub-boot-settling='1'\]\s*\{[^}]*min-height:\s*var\(--hami-home-hub-empty-slot-h\)/s,
        );
        expect(css).not.toMatch(
            /section\[data-testid='home-hub-card'\],\s*\[data-testid='home-hub-card-skeleton'\]\s*\{[^}]*min-height:\s*240px/s,
        );
    });

    it('هيكل الهاب لا يسحب شجرة البطاقة الحية؛ الاسم يُسخَّن قبل Frame-1', () => {
        const skeleton = readFileSync(join(dash, 'HomeHubCardSkeleton.tsx'), 'utf8');
        const preamble = readFileSync(join(root, 'src/boot/bootEntryPreamble.ts'), 'utf8');
        const hydrate = readFileSync(
            join(root, 'src/app/services/profile/profileWarmCache.ts'),
            'utf8',
        );
        expect(skeleton).not.toContain('LawyerHomeHubCard');
        expect(skeleton).toContain("from './HomeHubEmptyState'");
        expect(preamble).toContain('warmBootLawyerProfile');
        expect(preamble).toContain('BOOT_PROFILE_WARM_BUDGET_MS');
        expect(hydrate).toContain('readLocalProfileSync');
        expect(hydrate).toContain("from '@/app/services/profile/lawyerProfileLocalRead'");
        expect(hydrate).not.toMatch(/from '@\/app\/services\/cloud\/lawyerProfileCloud'/);
        expect(hydrate).toContain("import('@/app/services/cloud/lawyerProfileCloud')");
        expect(hydrate).toContain('preferRicherLawyerDisplayName');
        expect(hydrate).toContain('isLawyerProfileBootWarmPending');
        expect(hydrate).toContain('isLawyerProfileLocalUnread');
        expect(hydrate).toContain('lawyerProfileLocalRecordExists');
        expect(hydrate).toContain('resolveFirstPaintLawyerDisplayName');
    });

    it('إقلاع E2E يعيد التحميل مرة واحدة إذا غابت جاهزية اللوحة', () => {
        const boot = readFileSync(join(root, 'e2e/helpers/bootFixtures.ts'), 'utf8');
        const dock = readFileSync(join(root, 'e2e/helpers/homeDockFixtures.ts'), 'utf8');
        expect(boot).toContain('export async function waitForLawyerDashboardReady');
        expect(boot).toContain("gotoAppPath(page, '/')");
        expect(boot).toContain('await waitForLawyerDashboardReady(page)');
        expect(boot).not.toMatch(
            /await expect\(lawyerDashboardReady\(page\)\)\.toBeVisible\(\{ timeout: 60_000 \}\)/,
        );
        expect(boot).toContain("document.querySelectorAll('vite-error-overlay')");
        expect(dock).toContain('waitForLawyerDashboardReady');
        expect(dock).not.toContain("await expect(lawyerDashboardReady(page)).toBeVisible({ timeout: 60_000 })");
    });

    it('الدوك والرئيسية: سطح التقويم بلا .or() صارم؛ المنتدى يقبل بوابة الضيف', () => {
        const dock = readFileSync(join(root, 'e2e/helpers/homeDockFixtures.ts'), 'utf8');
        const forum = readFileSync(join(root, 'e2e/helpers/forumFixtures.ts'), 'utf8');
        const chrome = readFileSync(join(root, 'e2e/home-dock-chrome.spec.ts'), 'utf8');
        const main = readFileSync(join(root, 'e2e/home-main-interface.spec.ts'), 'utf8');
        const homeMain = readFileSync(join(root, 'e2e/helpers/homeMainFixtures.ts'), 'utf8');
        expect(dock).toContain('export async function expectScheduleSurfaceVisible');
        expect(dock).toContain('.first()');
        expect(chrome).toContain('expectScheduleSurfaceVisible');
        expect(chrome).not.toContain("getByTestId('smart-legal-radar').or(");
        expect(main).toContain('expectScheduleSurfaceVisible');
        expect(main).not.toContain("getByTestId('smart-legal-radar').or(");
        expect(forum).toContain('forum-access-denied');
        expect(forum).toContain('export function forumOpenSurface');
        expect(forum).toContain('waitForLawyerDashboardReady');
        expect(forum).toContain('forum-screen-shell');
        expect(forum).toContain('__HAMI_E2E_FORUM__');
        expect(forum).not.toContain('-auth-token');
        expect(homeMain).toContain("getByTestId('home-dock-forum')");
    });
});
