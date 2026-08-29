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
        expect(modal).toContain(') : null}');
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
        const host = read('src/app/components/lawyer/SmartRepository/SmartRepositoryHost.tsx');
        expect(host).toContain('VoiceRecorderModal');
        expect(host).toContain('if (!isOpen) return;');
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
        expect(capture).toContain('visibilitychange');
        expect(capture).toContain('pagehide');
        expect(capture).toContain('appStateChange');
        const mic = read('src/app/services/platform/microphoneSession.ts');
        expect(mic).toContain('subscribeCaptureBackgroundRelease');
        const voice = read('src/app/components/lawyer/ActionModals/useVoiceRecorderController.ts');
        expect(voice).toContain('subscribeCaptureBackgroundRelease');
        expect(voice).toContain('clearPendingMicrophoneStream');
    });
});
