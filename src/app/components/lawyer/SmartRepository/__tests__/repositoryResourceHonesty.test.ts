import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

function walkTsFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === '__tests__') continue;
            walkTsFiles(full, acc);
            continue;
        }
        if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full);
    }
    return acc;
}

describe('repository resource honesty', () => {
    it('الخلاصة لا تُركَّب والمستودع مغلق — لا RAM/CPU لتغذية مخفية', () => {
        const modal = read('src/app/components/lawyer/SmartRepositoryModal.tsx');
        expect(modal).toContain('{overlayVisible ? (');
        expect(modal).toContain('<SmartRepositoryUnifiedFeed');
        expect(modal).toContain("from './SmartRepository/SmartRepositoryUnifiedFeed'");
        expect(modal).not.toContain("import('./SmartRepository/SmartRepositoryUnifiedFeed')");
        expect(modal).not.toContain('RepositoryFeedBootFallback');
        expect(modal).not.toContain('repository-feed-boot');
        expect(modal).not.toContain('Suspense');
        expect(modal).not.toContain('lazy(');
        expect(modal).toContain(') : null}');
        const boot = read(
            'src/app/components/lawyer/SmartRepository/repositoryBootFallbacks.tsx',
        );
        expect(boot).not.toContain('data-testid="repository-feed-boot"');
        expect(boot).toContain('data-testid="repository-classification-boot"');
        expect(boot).toContain('min-h-[44px]');
        const hub = read(
            'src/app/components/lawyer/SmartVaultModal/VaultSearchFilterHub.tsx',
        );
        expect(hub).toContain('RepositoryClassificationBootFallback');
        expect(hub).not.toContain('fallback={null}');
        const paint = read('src/app/runtime/repositoryInstantChromeMarkup.ts');
        expect(paint).toContain('المستودع');
        expect(paint).not.toContain('بحث في المستودع');
        expect(paint).not.toContain('repository-instant-toolbar');
        expect(paint).toContain('repository-instant-close');
        expect(paint).toContain('z-[219]');
        expect(paint).not.toContain('z-[220]');
        expect(paint).toContain('pointer-events-none');
        expect(paint).toContain('pointer-events-auto');
        expect(paint).not.toContain('hami-repo-card');
        const paintRuntime = read('src/app/runtime/repositoryInstantPaint.ts');
        expect(paintRuntime).toContain('mountRepositoryInstantChromeOnBody');
        expect(paintRuntime).toContain('MutationObserver');
        expect(paintRuntime).toContain('styleRepositoryInstantChromeHitThrough');
        expect(paintRuntime).toContain("setProperty('pointer-events', 'none', 'important')");
        expect(paintRuntime).not.toContain('armHubLayerEnter');
        expect(paintRuntime).not.toContain('getHamiOverlayPortalRoot');
        const critical = read('src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css');
        expect(critical).not.toMatch(
            /\[data-testid='smart-repository-modal'\],\s*html\[data-hami-repository-open='1'\] #hami-repository-instant-chrome/,
        );
        expect(critical).toMatch(
            /html\[data-hami-repository-open='1'\] #hami-repository-instant-chrome \{\s*pointer-events: none !important;/,
        );
        expect(critical).toContain(
            "#hami-repository-instant-chrome [data-testid='repository-instant-close']",
        );
        expect(modal).toContain('useBodyScrollLock(isOpen)');
        expect(modal).toContain('useOpaqueFeatureSurface(isOpen)');
        const host = read('src/app/components/lawyer/SmartRepository/SmartRepositoryHost.tsx');
        expect(host).toContain('if (!isOpen) return;');
        expect(host).toContain('if (!isOpen && !keepAlive)');
    });

    it('لا setInterval في محرّك المستودع — لا استطلاع يفرّغ البطارية', () => {
        const files = walkTsFiles(join(root, 'src/app/components/lawyer/SmartRepository'));
        expect(files.length).toBeGreaterThan(10);
        for (const file of files) {
            const src = readFileSync(file, 'utf8');
            expect(src).not.toMatch(/\bsetInterval\s*\(/);
        }
    });

    it('الكاميرا تُوقف عند الخلفية ويُحدّ طلب العدسة لتوفير البطارية', () => {
        const camera = read('src/app/components/lawyer/SmartVaultModal/scannerCamera.ts');
        expect(camera).toContain("facingMode: { ideal: 'environment' }");
        expect(camera).toContain('width: { ideal: 1280 }');
        expect(camera).toContain('height: { ideal: 720 }');
        expect(camera).not.toContain('width: { ideal: 1920 }');
        expect(camera).toContain('SCANNER_CAPTURE_MAX_EDGE = 1_600');
        expect(camera).toContain('subscribeScannerCameraBackgroundRelease');
        const hook = read('src/app/components/lawyer/SmartVaultModal/useSmartVaultScanner.ts');
        expect(hook).toContain('stream?.getTracks().forEach((t) => t.stop())');
        expect(hook).toContain('subscribeScannerCameraBackgroundRelease');
        expect(hook).toContain("setPhase('idle')");
    });

    it('التسخين الخلفي يحترم lite/توفير البيانات ويُحرَّر keepAlive بعد الخمول', () => {
        const idle = read('src/app/hooks/lawyerDashboard/repositoryIntentWarm.ts');
        expect(idle).toContain('isSectionBackgroundPrefetchAllowed');
        expect(idle).toContain('if (!isSectionBackgroundPrefetchAllowed()) return;');
        const dash = read('src/app/hooks/lawyerDashboard/useLawyerDashboardRepository.ts');
        expect(dash).toContain('useKeepAliveIdleRelease(isRepositoryOpen');
        expect(dash).toContain('setRepositoryHostMounted(false)');
        expect(dash).toContain('if (isSectionBackgroundPrefetchAllowed())');
        const warmBlock = dash.match(/const scheduleWarm = \(\) => \{[\s\S]*?\n        \};/)?.[0];
        expect(warmBlock).toBeTruthy();
        expect(warmBlock).toContain('if (isSectionBackgroundPrefetchAllowed())');
        expect(warmBlock).toContain('prefetchRepositoryHubModule()');
        expect(warmBlock).toContain('prefetchRepositoryAfterBootReveal');
        const chrome = read(
            'src/app/components/lawyer/SmartRepository/repositoryChrome.css',
        );
        expect(chrome).toContain('content-visibility: hidden');
        expect(chrome).toContain('content-visibility: visible');
        const host = read('src/app/components/lawyer/SmartRepository/SmartRepositoryHost.tsx');
        expect(host).toContain('prefetchVaultBlobStore');
        expect(host).toContain('prefetchRepositoryDialogs');
        expect(host).toContain('scheduleIdleWork');
        expect(host).not.toContain("import('./SmartRepositoryUnifiedFeed')");
        expect(host).toContain('if (!isOpen) return;');
        expect(host).not.toContain('VoiceRecorderModal');
        expect(host).not.toContain('SmartVaultScannerPanel');
        expect(host).not.toContain('DossierLawArticleRichEditor');
        const addMenu = read('src/app/components/lawyer/SmartRepository/RepositoryAddMenu.tsx');
        expect(addMenu).toContain('VoiceRecorderModal');
        expect(addMenu).toContain('SmartVaultScannerPanel');
        expect(addMenu).toContain('VaultUploadMetaSheet');
        expect(addMenu).toContain('RepositoryComposePanel');
        expect(addMenu).toContain('RepositoryVaultOverlays');
        const unified = read(
            'src/app/components/lawyer/SmartRepository/SmartRepositoryUnifiedFeed.tsx',
        );
        expect(unified).toContain("import('./RepositoryComposePanel')");
        expect(unified).toContain("import('./RepositoryVaultOverlays')");
        expect(unified).not.toContain("from './RepositoryComposePanel'");
        expect(unified).not.toContain("from './RepositoryVaultOverlays'");
        expect(unified).toContain('overlaysLive');
        const rail = read('src/app/components/lawyer/SmartRepository/RepositoryFiltersRail.tsx');
        expect(rail).toContain("import('./RepositoryRoomsGallery')");
        expect(rail).not.toContain("from './RepositoryRoomsGallery'");
        const hub = read('src/app/components/lawyer/SmartVaultModal/VaultSearchFilterHub.tsx');
        expect(hub).toContain('repositoryActionChips');
        expect(hub).toContain('RepositoryClassificationDeck');
        expect(hub).not.toContain(
            "from '@/app/components/lawyer/SmartRepository/RepositoryClassificationDeck'",
        );
        const compose = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryCompose.ts',
        );
        expect(compose).toContain("await import('@/app/services/vaultUploadService')");
        expect(compose).not.toContain("from '@/app/services/vaultUploadService'");
        expect(compose).toContain("import('../legalRichTextEditorUtils')");
        expect(compose).not.toContain("from '../legalRichTextEditorUtils'");
        expect(compose).toContain("import('./buildRepositoryComposeNote')");
        expect(compose).not.toContain("from './buildRepositoryComposeNote'");
        const layout = read('src/app/components/lawyer/SmartRepository/RepositoryEntryContentLayout.tsx');
        expect(layout).toContain('stripRepositoryHtml');
        expect(layout).not.toContain('dangerouslySetInnerHTML');
        expect(layout).not.toContain('legalRichTextEditorUtils');
        expect(layout).not.toContain("from 'dompurify'");
        const edit = read(
            'src/app/components/lawyer/SmartRepository/entryCards/useUniversalEntryCardEdit.ts',
        );
        expect(edit).toContain("import('../legalRichTextEditorUtils')");
        expect(edit).not.toContain("from '../legalRichTextEditorUtils'");
        const upload = read('src/app/components/lawyer/hooks/smartVault/useSmartVaultUpload.ts');
        expect(upload).toContain("await import('@/app/services/vaultUploadService')");
        expect(upload).not.toContain("from '@/app/services/vaultUploadService'");
        const model = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryUnifiedFeedModel.ts',
        );
        expect(model).not.toContain('requestIdleCallback');
        expect(model).not.toContain('prefetchVoiceRecorderModal');
    });

    it('الطبقة المغلقة inert؛ الميكروفون يُوقف عند الخلفية مثل الكاميرا', () => {
        const paint = read('src/app/runtime/repositoryInstantPaint.ts');
        expect(paint).toContain("root.setAttribute('inert', '')");
        expect(paint).toContain("root.removeAttribute('inert')");
        expect(paint).toContain('blurFocusWithin');
        const modal = read('src/app/components/lawyer/SmartRepositoryModal.tsx');
        expect(modal).toContain('inertProps(!overlayVisible)');
        expect(modal).toContain("role={overlayVisible ? 'dialog' : undefined}");
        const capture = read('src/app/services/platform/mediaCaptureBackgroundRelease.ts');
        expect(capture).toContain('subscribeAppForeground');
        expect(capture).toContain('onSuspend: onRelease');
        const mic = read('src/app/services/platform/microphoneSession.ts');
        expect(mic).toContain('subscribeCaptureBackgroundRelease');
        const voice = read('src/app/components/lawyer/ActionModals/useVoiceRecorderController.ts');
        expect(voice).toContain('subscribeCaptureBackgroundRelease');
        expect(voice).toContain('clearPendingMicrophoneStream');
    });
});
