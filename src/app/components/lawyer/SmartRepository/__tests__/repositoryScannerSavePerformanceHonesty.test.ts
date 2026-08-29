import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('repository scanner save performance honesty', () => {
    it('نتيجة الماسح تُرسم قبل تحديث الخلاصة (startTransition) مع منع حفظ مكرر', () => {
        const scanner = read(
            'src/app/components/lawyer/SmartVaultModal/useSmartVaultScanner.ts',
        );
        const camera = read('src/app/components/lawyer/SmartVaultModal/scannerCamera.ts');
        const panel = read(
            'src/app/components/lawyer/SmartVaultModal/SmartVaultScannerPanel.tsx',
        );
        expect(scanner).toContain('startTransition');
        expect(scanner).toContain('saveInFlightRef');
        expect(camera).toContain('video.readyState >= 2');
        expect(scanner).toContain('canvasToJpegBlob');
        expect(scanner).toContain('capturedBlobRef');
        expect(scanner).toContain('paintScannerCaptureCanvas');
        expect(scanner).not.toContain("from '@/app/motion/overlayMotionRuntime'");
        expect(panel).not.toContain("from '@/app/motion/overlayMotionRuntime'");
        expect(scanner).not.toContain("type: 'spring'");
        expect(panel).not.toContain("type: 'spring'");
    });

    it('لا يُبدَّل فلتر المخزن عند الكل — يتجنّب إعادة تصفية الخلاصة تحت اللوحة', () => {
        const overlays = read(
            'src/app/components/lawyer/SmartRepository/RepositoryVaultOverlays.tsx',
        );
        expect(overlays).toContain('shouldSwitchVaultFilterForNewScan(vault.activeFilter, category)');
        expect(overlays).toContain('mergeScannedDocForFeed');
        expect(overlays).not.toContain('vault.setActiveFilter(category);\n                    }');
    });

    it('الخلاصة الافتراضية تعود للأعلى عند بطاقة جديدة', () => {
        const list = read(
            'src/app/components/lawyer/SmartRepository/RepositoryFeedVirtualList.tsx',
        );
        expect(list).toContain('firstItemKey');
        expect(list).toContain('root.scrollTop = 0');
        expect(list).toContain('overscan: 2');
        expect(list).toContain('offsetHeight');
        expect(list).toContain('scrollParentRef');
        expect(list).not.toContain('getBoundingClientRect');
        const unified = read(
            'src/app/components/lawyer/SmartRepository/SmartRepositoryUnifiedFeed.tsx',
        );
        expect(unified).toContain('scrollParentRef={feedScrollRef}');
        expect(unified).toContain('value={modalRoot}');
        const img = read(
            'src/app/components/lawyer/SmartRepository/VaultDocDisplayImage.tsx',
        );
        expect(img).toContain("loading={eager ? 'eager' : 'lazy'}");
        expect(img).toContain("fetchPriority={eager ? 'high' : 'low'}");
    });

    it('نقرات E2E داخل الماسح لا تنتظر توستاً غائباً 1.5ث', () => {
        const dismissSrc = read('e2e/helpers/notificationFixtures.ts');
        const start = dismissSrc.indexOf('export async function dismissBlockingOverlays');
        const end = dismissSrc.indexOf('export async function waitForNotificationE2eHooks');
        expect(start).toBeGreaterThan(0);
        expect(end).toBeGreaterThan(start);
        const body = dismissSrc.slice(start, end);
        expect(body).not.toContain('timeout: 1_500');
        expect(body).not.toContain('timeout: 500');
        expect(body).toContain('isVisible()');
        expect(body).toContain("testId === 'smart-repository-close'");

        const chrome = read('e2e/helpers/repositoryFixtures.ts');
        expect(chrome).toContain("'vault-scanner-panel'");
        expect(chrome).toContain("'repository-notepad-editor'");
        expect(chrome).toContain('fillControlledTextInput');
        const media = read('e2e/helpers/repositoryMediaFixtures.ts');
        expect(media).toContain('completeScannerCaptureAndSave');
        expect(media).toContain('fillControlledTextInput');
    });

    it('الخلاصة لا تُعاد بناؤها بـ rAF بعد كل تغيير، والطبقة المغلقة لا تُرسم', () => {
        const feed = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryFeed.ts',
        );
        expect(feed).not.toContain('requestAnimationFrame');
        expect(feed).toContain('DOSSIER_NOTES_CHANGED');
        const chrome = read(
            'src/app/components/lawyer/SmartRepository/repositoryChrome.css',
        );
        expect(chrome).toContain('content-visibility: hidden');
        const unified = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryUnifiedFeedModel.ts',
        );
        expect(unified).toContain('[feed.selectMainFilter]');
        expect(unified).not.toContain('[feed],');
    });

    it('أزرار التخطيط لا تُقصّ على iPhone ولا تنتظر استقرار transition', () => {
        const chrome = read(
            'src/app/components/lawyer/SmartRepository/repositoryChrome.css',
        );
        expect(chrome).toContain('hami-repository-controls-toolbar');
        expect(chrome).toContain('overflow: visible');
        expect(chrome).toContain('contain: style');
        expect(chrome).not.toContain('contain: layout style');

        const filters = read(
            'src/app/components/lawyer/SmartRepository/repositoryChromeFilters.css',
        );
        expect(filters).toContain('transition: none');
        expect(filters).not.toContain('background-color 0.15s ease');

        const vaultSpec = read('e2e/smart-vault.spec.ts');
        const layoutStart = vaultSpec.indexOf("test('يُبدّل تخطيط عرض البطاقات'");
        const layoutEnd = vaultSpec.indexOf("test('يضيف تصنيفاً", layoutStart);
        const layoutBlock = vaultSpec.slice(layoutStart, layoutEnd);
        expect(layoutBlock).toContain('clickRepositoryChrome');
        expect(layoutBlock).toContain('visibleRepositoryModal');
        expect(layoutBlock).not.toContain('.click()');
        expect(vaultSpec).toContain("clickRepositoryChrome(modal.getByTestId('smart-repository-close'))");
        const modalSrc = read('src/app/components/lawyer/SmartRepositoryModal.tsx');
        const closeIdx = modalSrc.indexOf('data-testid="smart-repository-close"');
        expect(closeIdx).toBeGreaterThan(0);
        expect(modalSrc.slice(closeIdx - 280, closeIdx + 220)).toContain('requestClose');
        expect(modalSrc.slice(closeIdx - 280, closeIdx + 220)).not.toContain('event.preventDefault();');

        const fixtures = read('e2e/helpers/repositoryFixtures.ts');
        expect(fixtures).toContain('clickRepositoryChrome');
        expect(fixtures).toContain('visibleRepositoryModal');
        expect(fixtures).toContain(':not([aria-hidden="true"])');
        expect(fixtures).toContain('force: true');
        expect(fixtures).toContain('{ timeout: 8_000 }');
        expect(fixtures).toContain("data-hami-repository-open");
        expect(fixtures).toContain('closeNotificationsPanelForE2E');
        expect(fixtures).toContain('feedAlreadyOpen');
        expect(fixtures).toContain('openRepositoryAddMenu');
        expect(fixtures).toContain('repository feed still loading');
        expect(fixtures).toContain('repository chrome evaluate timeout');
        expect(fixtures).toContain('elementHandle');
        expect(fixtures).toContain('/* قبل dismiss الإنتاجي — «إغلاق» يطابق زر المستودع ويُسقط الطبقة */');

        const notify = read('e2e/helpers/notificationFixtures.ts');
        const dismissStart = notify.indexOf('export async function dismissBlockingOverlays');
        const dismissBody = notify.slice(dismissStart, notify.indexOf('export async function waitForNotificationE2eHooks'));
        expect(dismissBody).toContain("data-hami-repository-open");
        expect(dismissBody).toContain('if (repositoryOpen) return;');

        const boot = read('e2e/helpers/bootFixtures.ts');
        expect(boot).toContain('export async function gotoAppPath');
        expect(boot).toContain('interrupted by another navigation');
        const vault = read('e2e/helpers/vaultFixtures.ts');
        expect(vault).toContain('gotoAppPath');

        const e2eRunner = read('scripts/run-repository-e2e.mjs');
        expect(e2eRunner).toContain("existsSync('dist/index.html')");
        expect(e2eRunner).toContain('E2E_FORCE_DEV');
        expect(e2eRunner).toContain("distReady ? '1'");
        expect(e2eRunner).not.toContain("skipBuild ? '0' : '1'");
        expect(e2eRunner).not.toContain('process.env.E2E_USE_PREVIEW ?? (distReady');
        expect(e2eRunner).toContain('quoteWinArg');

        const roomMenu = read(
            'src/app/components/lawyer/SmartRepository/RepositoryRoomMenu.tsx',
        );
        expect(roomMenu).toContain('event.stopPropagation()');
        const host = read(
            'src/app/components/lawyer/SmartRepository/SmartRepositoryHost.tsx',
        );
        expect(host).toContain('VaultUploadMetaSheet');
        const uploadHook = read(
            'src/app/components/lawyer/hooks/smartVault/useSmartVaultUpload.ts',
        );
        expect(uploadHook).toContain('VaultUploadMetaSheet');
        const mediaSpec = read('e2e/repository-media.spec.ts');
        expect(mediaSpec).toContain('assignRepositoryOsPickerFile');
        const mediaFixtures = read('e2e/helpers/repositoryMediaFixtures.ts');
        expect(mediaFixtures).toContain('input.setInputFiles');
        expect(mediaFixtures).toContain("getByTestId('vault-upload-meta-overlay')");
        expect(mediaFixtures).toContain("(el as HTMLInputElement).value = ''");
        expect(mediaFixtures).toContain('{ timeout: 4_000 }');
        const repoSpec = read('e2e/smart-repository.spec.ts');
        expect(repoSpec).toContain('await expect(modal).toBeVisible({ timeout: 8_000 })');
    });
});
