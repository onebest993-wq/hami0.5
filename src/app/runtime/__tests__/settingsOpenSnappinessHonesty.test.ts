import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('settings open snappiness honesty', () => {
    /**
     * الإعدادات كسولة من FullBootPath عبر Portal؛ الطلاء الفوري في DOM يغطي الانتظار.
     * MainView لا يسحب Entry/InstantShell حتى لا يدخل HamiSettings مقطع المنزل.
     * Host يضم HamiSettingsApp sync — بلا hop ثانٍ بعد وصول المقطع.
     */
    it('FullBootPath: Settings Portal كسول؛ InstantShell ليس ساكناً على FullBoot', () => {
        const full = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardFullBootPath.tsx'),
            'utf8',
        );
        expect(full).toContain('LawyerDashboardSettingsOverlayPortal');
        expect(full).not.toContain('SettingsInstantShell');
        expect(full).not.toContain('LazySettingsOverlayEntry');
        expect(full).toContain('settingsFeature');
        const portal = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardSettingsOverlayPortal.tsx'),
            'utf8',
        );
        expect(portal).toContain('LazySettingsOverlayEntry');
        expect(portal).toContain('loadSettingsOverlayEntry');
        expect(portal).not.toContain('SettingsInstantShell');
        expect(full).not.toContain('settingsWarmHost');
        expect(full).not.toMatch(
            /import \{ LawyerDashboardSettingsOverlayEntry \} from/,
        );

        const main = readLawyerDashboardMainViewSurface();
        expect(main).not.toContain('LazySettingsOverlayEntry');
        expect(main).not.toContain('SettingsInstantShell');
        expect(main).not.toContain('loadSettingsOverlayEntry');
        expect(main).not.toMatch(
            /import \{ LawyerDashboardSettingsOverlayEntry \} from/,
        );
        expect(main).toContain('warmOverlayEntryChunks');
        expect(main).not.toContain('LazyFallback');

        const chunks = fs.readFileSync(
            path.join(root, 'src/app/runtime/overlayEntryChunks.ts'),
            'utf8',
        );
        expect(chunks).toContain('prefetchSettingsOverlayEntry');
        const idleCallIdx = chunks.indexOf('return scheduleIdleWork');
        const settingsCallIdx = chunks.indexOf('prefetchSettingsOverlayEntry();');
        expect(idleCallIdx).toBeGreaterThan(-1);
        expect(settingsCallIdx).toBeGreaterThan(idleCallIdx);
        expect(chunks).not.toContain('prefetchGlobalSearchOverlayChunk');
        expect(chunks.indexOf('prefetchOverlayMotion();')).toBeGreaterThan(idleCallIdx);

        const runtime = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardSettingsProfileRuntime.tsx',
            ),
            'utf8',
        );
        expect(runtime).toContain('useLawyerDashboardSettings(shellAuthUserId)');
        expect(runtime).toContain('settings.showSettings');
        expect(runtime).toContain('profile.profileHostMounted');
        expect(runtime).not.toMatch(/\}, \[profile, settings\]\);/);
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
        expect(orch).toContain('createBootChromeFeatureStubs');
        expect(orch).toContain('settingsFeature');
        expect(orch).toContain('return prev');
        expect(orch).not.toMatch(
            /import \{ useLawyerDashboardSettings \} from/,
        );
        const stubs = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/createDeferredFeatureStubs.ts'),
            'utf8',
        );
        expect(stubs).not.toContain("requestArm('settings')");
        expect(stubs).not.toContain('openSettings:');
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/HamiSettingsHost.tsx'),
            'utf8',
        );
        expect(host).toContain('HamiSettingsApp');
        expect(host).not.toContain('useHamiSettingsHostModule');
        expect(host).not.toContain('SettingsInstantShell');
        expect(host).toContain('dismissSettingsInstantBridgeIfHostReady');
        expect(host).not.toContain('useOpaqueFeatureSurface');
        expect(host).toContain('scheduleSettingsOverlayInteractionArm');
    });

    it('SettingsShell يغلق فوراً بعد تسليح التفاعل', () => {
        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/SettingsShell.tsx'),
            'utf8',
        );
        const closeGuard = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/hooks/useSettingsShellCloseGuard.ts'),
            'utf8',
        );
        const header = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/SettingsShellHeader.tsx'),
            'utf8',
        );
        expect(closeGuard).toContain('isSettingsOverlayInteractionArmed');
        expect(closeGuard).toContain('isSettingsCloseGuarded');
        expect(closeGuard).toContain('isSettingsOpenGestureBlockingClose');
        expect(closeGuard).not.toContain('SETTINGS_INTERACT_ARM_MS');
        expect(header).toContain('onPointerDown');
        expect(shell).toContain('requestCloseGuarded');
        expect(shell).not.toContain('requestCloseInstant');
        expect(closeGuard).not.toContain('requestCloseInstant');
        expect(header).not.toContain('requestCloseInstant');
    });

    it('الأمن sync؛ المنظر/البيانات/الحساب كسولة خارج جذع فتح المركز', () => {
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/HamiSettings/settingsSectionRegistry.ts'),
            ),
        ).toBe(false);
        const app = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/HamiSettingsApp.tsx'),
            'utf8',
        );
        expect(app).not.toContain('panelsLive');
        expect(app).not.toContain('settings-panels-deferred');
        expect(app).toContain('useSettingsSectionWarm');
        expect(app).toContain('useSettingsActiveSection');
        expect(app).not.toContain('SETTINGS_DEFAULT_SECTION');
        expect(app).not.toContain('setActiveSection');
        expect(app).toContain('open || keepAlive');
        expect(app).not.toContain('ensureSettingsDialogsReady');
        const router = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/SettingsSectionRouter.tsx'),
            'utf8',
        );
        expect(router).toMatch(/import \{ SecuritySection \} from '\.\/security\/SecuritySection'/);
        expect(router).not.toMatch(/import \{ AppearanceSection \} from/);
        expect(router).not.toMatch(/import \{ DataSection \} from/);
        expect(router).not.toMatch(/import \{ AccountSection \} from/);
        expect(router).toContain('lazy(');
        expect(router).not.toContain('settings-section-loading');
        expect(router).not.toContain('settingsSectionRegistry');
        const load = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/settingsSectionLoad.ts'),
            'utf8',
        );
        expect(load).toContain("import('./appearance/AppearanceSection')");
        expect(load).toContain("import('./data/DataSection')");
        expect(load).toContain("import('./account/AccountSection')");
        const header = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/SettingsShellHeader.tsx'),
            'utf8',
        );
        expect(header).toContain('prefetchSettingsSection');
        const warm = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/hooks/useSettingsSectionWarm.ts'),
            'utf8',
        );
        expect(warm).toContain('prefetchSecondarySettingsSections');
        expect(warm).toContain('scheduleIdleWork');
        expect(warm).not.toContain('setTimeout');
        expect(warm).not.toContain('isHamiNativeShell');
    });

    it('وثيقة الشروط ومحرك النسخ مؤجّلان عن جذع فتح المركز', () => {
        const sheetLoad = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/account/accountLegalContentLoad.ts'),
            'utf8',
        );
        expect(sheetLoad).toContain("import('./accountLegalContent')");
        const customizeLoad = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/HamiSettings/appearance/appearanceCustomizeSheetLoad.ts',
            ),
            'utf8',
        );
        expect(customizeLoad).toContain("import('./AppearanceBlockCustomizeSheet')");
        const appearance = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/appearance/AppearanceSection.tsx'),
            'utf8',
        );
        expect(appearance).toContain('prefetchAppearanceCustomizeSheet');
        expect(appearance).toContain('lazy(');
        expect(appearance).not.toMatch(
            /import \{ AppearanceBlockCustomizeSheet \} from/,
        );
        const sheet = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/account/AccountLegalDocumentSheet.tsx'),
            'utf8',
        );
        expect(sheet).not.toMatch(/import\s*\{[^}]*ACCOUNT_LEGAL_DOCUMENTS/);
        expect(sheet).toContain('loadAccountLegalDocuments');
        const gate = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/lawyerAuth/LegalTermsConsentGate.tsx'),
            'utf8',
        );
        expect(gate).not.toMatch(/import\s*\{[^}]*ACCOUNT_LEGAL_DOCUMENTS/);
        expect(gate).toContain('loadAccountLegalDocuments');
        expect(gate).toContain('prefetchAccountLegalDocuments');
        const backup = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/hooks/useBusinessBackup.ts'),
            'utf8',
        );
        expect(backup.includes("from '@/app/services/settings/businessBackup'")).toBe(false);
        expect(backup).toContain('businessBackupEngine');
        const exportFlow = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/hooks/businessBackupExportFlow.ts'),
            'utf8',
        );
        const importFlow = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/hooks/businessBackupImportFlow.ts'),
            'utf8',
        );
        expect(exportFlow.includes("from '@/app/services/settings/businessBackup'")).toBe(false);
        expect(importFlow.includes("from '@/app/services/settings/businessBackup'")).toBe(false);
        expect(exportFlow).toContain('loadBusinessBackupEngine');
        expect(importFlow).toContain('loadBusinessBackupEngine');
        const engine = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/hooks/businessBackupEngine.ts'),
            'utf8',
        );
        expect(engine).toContain("import('@/app/services/settings/businessBackup')");
        expect(engine).toContain("import('@/app/services/settings/businessBackupSecurity')");
    });

    it('ثابت كبح إعادة الفتح مُصدَّر وقصير للتبديل السريع', () => {
        const paintDir = path.join(root, 'src/app/runtime');
        const paint = [
            'settingsInstantPaint.ts',
            'settingsInstantPaintReopen.ts',
            'settingsInstantPaintBridge.ts',
            'settingsInstantPaintConstants.ts',
            'settingsInstantPaintChrome.ts',
            'settingsInstantPaintInteract.ts',
            'settingsInstantPaintDom.ts',
        ]
            .map((file) => fs.readFileSync(path.join(paintDir, file), 'utf8'))
            .join('\n');
        expect(paint).toContain('export const SETTINGS_REOPEN_SUPPRESS_MS');
        expect(paint).toContain('blurFocusWithin');
        expect(paint).toContain('releaseSettingsOverlayFocus');
        expect(paint).toContain('restoreSettingsTriggerFocus');
        expect(paint).toContain('restoreTrigger');
        expect(paint).toMatch(/SETTINGS_REOPEN_SUPPRESS_MS\s*=\s*90/);
        expect(paint).toContain('applySettingsOpaqueChrome');
        expect(paint).toContain('applyDashboardMask');
        expect(paint).not.toContain('isHamiNativeShell');
        expect(paint).toContain('ensureSettingsInstantChromeBridge');
        expect(paint).toContain('مركز الإعدادات');
        expect(paint).toContain('scheduleSettingsChromeHandoff');
        expect(paint).toContain("pointerEvents: 'none'");
        expect(paint).toContain('dismissSettingsInstantBridgeIfHostReady');
        expect(paint).not.toContain('registerSettingsInstantCloseHandler');
        const fixtures = fs.readFileSync(
            path.join(root, 'e2e/helpers/settingsFixtures.ts'),
            'utf8',
        );
        expect(fixtures).toContain('SETTINGS_PERF_BUDGET');
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/HamiSettingsHost.tsx'),
            'utf8',
        );
        expect(host).not.toContain('hydrateSettingsShellForInstantOpen');
        expect(host).not.toContain('warmSettingsOnOpen');
        expect(host).not.toContain('useHamiSettingsHostModule');
        expect(host).not.toContain('SettingsInstantShell');
        expect(host).not.toContain('SettingsModuleLoadFallback');
        expect(host).toContain('HamiSettingsApp');
        expect(host).not.toContain("from '@/app/components/lawyer/HamiSettings/index'");
        const loader = fs.readFileSync(
            path.join(root, 'src/app/runtime/hamiSettingsLoader.ts'),
            'utf8',
        );
        expect(loader).toContain('settingsModulePromise = null');
        expect(loader).toContain('getCachedHamiSettingsComponent');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/HamiSettings/SettingsInstantShell.tsx'),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/HamiSettings/SettingsInstantShellHeader.tsx'),
            ),
        ).toBe(false);
        const constantsGone = fs.existsSync(
            path.join(root, 'src/app/components/lawyer/LawyerDashboardParts/constants.ts'),
        );
        expect(constantsGone).toBe(false);
        const lazyFallback = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerDashboardParts/LawyerLazyFallback.tsx'),
            'utf8',
        );
        expect(lazyFallback).not.toContain('SETTINGS_HUB_FALLBACK');
        expect(lazyFallback).not.toContain('SettingsInstantShell');
        const chromeCss = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/settingsChrome.css'),
            'utf8',
        );
        expect(chromeCss).toContain("@import './settingsInstantChrome.css'");
        expect(chromeCss).toContain("@import './settingsChromeOverlay.css'");
        expect(chromeCss).toContain("@import './settingsChromeCards.css'");
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/HamiSettings/settings-ui.tsx'),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/HamiSettings/settingsSectionPersistence.ts'),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/HamiSettings/settings-ui/index.ts'),
            ),
        ).toBe(true);
        expect(
            fs.readFileSync(
                path.join(root, 'src/app/components/lawyer/HamiSettings/security/SecuritySection.tsx'),
                'utf8',
            ),
        ).toContain("from '../settings-ui/index'");
    });
});
