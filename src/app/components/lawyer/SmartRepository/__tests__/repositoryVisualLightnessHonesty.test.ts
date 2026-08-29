import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(process.cwd(), 'src/app/components/lawyer/SmartRepository');

function readChrome(): string {
    return ['repositoryChrome.css', 'repositoryChromeFilters.css', 'repositoryChromeCards.css']
        .map((file) => readFileSync(join(dir, file), 'utf8'))
        .join('\n');
}

describe('repository visual lightness honesty', () => {
    it('اللوحة كحلية مسطحة بلا تدرج ذهبي وبلا شبكة زخرفية', () => {
        const css = readChrome();
        const modal = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/SmartRepositoryModal.tsx'),
            'utf8',
        );
        expect(css).toContain('background-color: #0a0f1c');
        expect(css).not.toContain('#070b14');
        expect(css).not.toContain('radial-gradient(ellipse');
        expect(css).not.toContain('hami-repository-ambient');
        expect(modal).not.toContain('hami-repository-ambient');
        expect(css).toMatch(/\.hami-repository-header\s*\{[^}]*background:\s*#0a0f1c/s);
        expect(css).not.toContain('backdrop-filter: blur(');
    });

    it('بطاقات الشبكة/القائمة: هوية نوع بشريط بداية، بلا ضباب', () => {
        const cards = readFileSync(join(dir, 'repositoryChromeCards.css'), 'utf8');
        expect(cards).toContain('.hami-repo-card--manuscript');
        expect(cards).toContain('.hami-repo-card--voice');
        expect(cards).toContain('.hami-repo-card--dossier');
        expect(cards).toContain('.hami-repo-card--media');
        expect(cards).toContain('.hami-repo-card--document');
        expect(cards).toContain('border-inline-start: 2px solid');
        expect(cards).not.toMatch(/\.hami-repo-card--manuscript\s*\{[^}]*border-inline-start:\s*0/s);
        expect(cards).not.toContain('backdrop-filter: blur(');
        expect(cards).toContain('hami-repo-card-list-main');
        expect(cards).toContain('hover: hover');
        const theme = readFileSync(join(dir, 'smartRepositoryTheme.ts'), 'utf8');
        expect(theme).toContain('hami-repo-card-title');
        expect(theme).toContain('text-sm');
        const vaultCard = readFileSync(join(dir, 'entryCards/VaultEntryCard.tsx'), 'utf8');
        expect(vaultCard).toContain('hami-repo-card-list-main');
        const frame = readFileSync(join(dir, 'RepositoryCardFrame.tsx'), 'utf8');
        expect(frame).toContain('hami-repo-card-list-main');
    });

    it('الحالة الفارغة سطر واحد بلا إرشاد للأزرار', () => {
        const panel = readFileSync(join(dir, 'RepositoryFeedPanel.tsx'), 'utf8');
        expect(panel).toContain("return 'المستودع فارغ'");
        expect(panel).not.toContain('استخدم أزرار الإضافة أعلاه');
    });

    it('ثيم الأزرار والرقائق بلا ضباب', () => {
        const theme = readFileSync(join(dir, 'smartRepositoryTheme.ts'), 'utf8');
        expect(theme).not.toContain('backdrop-blur');
        expect(theme).toContain("rounded-full bg-transparent border-0");
        expect(theme).not.toContain('REPO_EMPTY_CTA');
        expect(theme).toContain('min-h-[44px]');
        expect(theme).not.toContain('min-h-[40px]');
    });

    it('بلاطة المستودع: عنوان بلا ظل نص', () => {
        const homeCss = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
            'utf8',
        );
        expect(homeCss).toContain("[data-hami-block='dockRepository'] .hami-hub-title-crystal");
        const block = homeCss.slice(
            homeCss.indexOf("[data-hami-block='dockRepository'] .hami-hub-title-crystal"),
        );
        expect(block).toContain('text-shadow: none');
    });

    it('فلاتر الغرف والتصنيف: أهداف لمس 44px لا 40/36', () => {
        const rail = readFileSync(join(dir, 'RepositoryFiltersRail.tsx'), 'utf8');
        expect(rail).not.toContain('min-h-[40px]');
        expect(rail).not.toContain('min-w-[40px]');
        expect(rail).not.toContain('min-h-[36px]');
        expect(rail).not.toContain('min-w-[36px]');
    });

    it('مسجّل الصوت من المستودع: إغلاق وإعادة محاولة 44px', () => {
        const modal = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/ActionModals/VoiceRecorderModal.tsx'),
            'utf8',
        );
        expect(modal).toContain('useVoiceRecorderController');
        expect(modal).toContain('VoiceRecorderModalView');
        const hook = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/ActionModals/useVoiceRecorderController.ts'),
            'utf8',
        );
        expect(hook).toContain("from './voiceRecorderMedia'");
        expect(hook).toContain('registerNativeBackHandler');
        const recorder = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/ActionModals/VoiceRecorderModalView.tsx'),
            'utf8',
        );
        const closeIdx = recorder.indexOf('data-testid="voice-recorder-close"');
        expect(closeIdx).toBeGreaterThan(0);
        expect(recorder.slice(closeIdx, closeIdx + 520)).toContain('min-h-[44px]');
        expect(recorder.slice(closeIdx, closeIdx + 520)).toContain('min-w-[44px]');
        const retryIdx = recorder.indexOf('data-testid="voice-recorder-permission-retry"');
        expect(retryIdx).toBeGreaterThan(0);
        expect(recorder.slice(retryIdx - 280, retryIdx)).toContain('min-h-[44px]');
        const resetIdx = recorder.indexOf('data-testid="voice-recorder-reset"');
        expect(resetIdx).toBeGreaterThan(0);
        expect(recorder.slice(resetIdx, resetIdx + 420)).toContain('min-h-[44px]');
        expect(recorder).not.toContain('min-h-[40px]');
    });

    it('قائمة الفلاتر بلا ظل نصب', () => {
        const css = readChrome();
        expect(css).toContain('box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22)');
        expect(css).not.toContain('box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28)');
        expect(css).not.toContain('box-shadow: 0 0 0 3px rgba(230, 198, 115, 0.22)');
    });

    it('الكروم مقسوم: مدخل واحد يستورد الفلاتر والبطاقات', () => {
        const main = readFileSync(join(dir, 'repositoryChrome.css'), 'utf8');
        expect(main).toContain("@import './repositoryChromeFilters.css'");
        expect(main).toContain("@import './repositoryChromeCards.css'");
        expect(main).not.toContain('.hami-repo-card {');
        expect(readFileSync(join(dir, 'repositoryChromeCards.css'), 'utf8')).toContain('.hami-repo-card {');
        expect(readFileSync(join(dir, 'repositoryChromeFilters.css'), 'utf8')).toContain(
            '.hami-repository-filter-popover',
        );
    });

    it('لوحة التصنيف مستخرجة ولا رقائق ميتة 36px في المستودع', () => {
        const hub = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/SmartVaultModal/VaultSearchFilterHub.tsx'),
            'utf8',
        );
        expect(hub).toContain('RepositoryClassificationDeck');
        expect(hub).not.toContain('classificationChips');
        expect(hub).not.toContain('repoChipBase');
        expect(hub).not.toContain('searchOnly');
        expect(hub).not.toContain('onAISearch');
        expect(hub).not.toContain('VAULT_TRAVERTINE_HUB');
        expect(hub).not.toContain('VAULT_CHIP_ACTIVE');
        expect(hub).not.toContain('min-h-[36px]');
        expect(hub).not.toContain('min-h-[40px]');
        expect(hub).toContain('min-h-[44px]');
        const deck = readFileSync(join(dir, 'RepositoryClassificationDeck.tsx'), 'utf8');
        expect(deck).toContain('min-h-[44px]');
        expect(deck).not.toContain('min-h-[36px]');
        const rail = readFileSync(join(dir, 'RepositoryFiltersRail.tsx'), 'utf8');
        expect(rail).toContain('RepositoryRoomMenu');
        expect(rail).toContain('useRepositoryRoomMenu');
        expect(rail).not.toContain('computeMenuPos');
        expect(rail).not.toContain('computeRepositoryRoomMenuPos');
        const scanner = [
            readFileSync(
                join(process.cwd(), 'src/app/components/lawyer/SmartVaultModal/SmartVaultScannerPanel.tsx'),
                'utf8',
            ),
            readFileSync(
                join(process.cwd(), 'src/app/components/lawyer/SmartVaultModal/SmartVaultScannerPhases.tsx'),
                'utf8',
            ),
        ].join('\n');
        const scannerHook = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/SmartVaultModal/useSmartVaultScanner.ts'),
            'utf8',
        );
        const scannerCamera = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/SmartVaultModal/scannerCamera.ts'),
            'utf8',
        );
        expect(scanner).toContain("from './useSmartVaultScanner'");
        expect(scanner).toContain('SmartVaultScannerPhases');
        expect(scannerHook).toContain("from './scannerCamera'");
        expect(scannerHook).toContain('paintScannerCaptureCanvas');
        expect(scannerHook).toContain('requestScannerCameraStream');
        expect(scannerHook).toContain('isE2eScannerCameraBypassEnabled');
        expect(scannerHook).toContain('canvasToJpegBlob');
        expect(scannerCamera).toContain('resolveScannerCaptureSize');
        expect(scannerCamera).toContain('paintScannerCaptureCanvas');
        expect(scanner).not.toContain("from '@/app/motion/overlayMotionRuntime'");
        expect(scannerHook).not.toContain("from '@/app/motion/overlayMotionRuntime'");
        expect(scannerHook).not.toContain("sessionStorage.getItem('hami:e2e-camera'");
        expect(scannerHook).not.toContain('function cameraErrorName');
        const captureIdx = scanner.indexOf('data-testid="vault-scanner-capture"');
        expect(captureIdx).toBeGreaterThan(0);
        expect(scanner.slice(captureIdx, captureIdx + 420)).toContain('min-h-[44px]');
        const saveIdx = scanner.indexOf('data-testid="vault-scanner-save"');
        expect(saveIdx).toBeGreaterThan(0);
        expect(scanner.slice(saveIdx, saveIdx + 420)).toContain('min-h-[44px]');
        const retakeIdx = scanner.indexOf('data-testid="vault-scanner-retake"');
        expect(retakeIdx).toBeGreaterThan(0);
        expect(scanner.slice(retakeIdx, retakeIdx + 420)).toContain('min-h-[44px]');
        expect(scanner).not.toContain('min-h-[40px]');
        expect(scanner).not.toContain('min-h-[32px]');
    });

    it('مسودة المرفق: رقاقة وإزالة 44px لا 32', () => {
        const compose = readFileSync(join(dir, 'RepositoryComposePanel.tsx'), 'utf8');
        const theme = readFileSync(join(dir, 'smartRepositoryTheme.ts'), 'utf8');
        expect(theme).toContain('REPO_COMPOSE_ATTACH_CHIP');
        expect(theme).toMatch(/REPO_COMPOSE_ATTACH_CHIP[\s\S]*min-h-\[44px\]/);
        expect(theme).not.toContain('min-h-[32px]');
        const removeIdx = compose.indexOf('data-testid="repository-compose-attach-remove"');
        expect(removeIdx).toBeGreaterThan(0);
        expect(compose.slice(removeIdx - 280, removeIdx)).toContain('min-h-[44px]');
        expect(compose.slice(removeIdx - 280, removeIdx)).toContain('min-w-[44px]');
        expect(compose).toContain('data-testid="repository-compose-attach-input"');
        expect(compose).not.toContain('min-h-[32px]');
        const upload = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/SmartVaultModal/VaultUploadMetaSheet.tsx'),
            'utf8',
        );
        const cancelIcon = upload.indexOf('data-testid="vault-upload-cancel-icon"');
        expect(cancelIcon).toBeGreaterThan(0);
        expect(upload.slice(cancelIcon, cancelIcon + 420)).toContain('min-h-[44px]');
        expect(upload.slice(cancelIcon, cancelIcon + 420)).toContain('min-w-[44px]');
        expect(upload).toContain('data-testid="vault-upload-confirm"');
        const vaultTheme = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/SmartVaultModal/vaultDustyRoseTheme.ts'),
            'utf8',
        );
        expect(vaultTheme).toMatch(/VAULT_BTN_SAVE[\s\S]*min-h-\[44px\]/);
        expect(vaultTheme).toMatch(/VAULT_BTN_CANCEL[\s\S]*min-h-\[44px\]/);
    });
});
