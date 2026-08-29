import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const repo = join(root, 'src/app/components/lawyer/SmartRepository');
const vault = join(root, 'src/app/components/lawyer/SmartVaultModal');

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('repository mobile honesty', () => {
    it('الإيماءات: رجوع أصلي + حافة iOS/ويب + قفل التمرير + تقليل الحركة', () => {
        const escape = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryEscapeStack.ts',
        );
        expect(escape).toContain('registerNativeBackHandler');
        expect(escape).toContain('consumeBackStack');
        const edge = read('src/app/runtime/overlayEdgeBackGesture.ts');
        expect(edge).toContain("'data-hami-repository-open'");
        expect(edge).toContain('isAndroidNativeShell');
        expect(edge).toContain('fromInlineStart');
        const paint = read('src/app/runtime/repositoryInstantPaint.ts');
        expect(paint).toContain("htmlAttr: 'data-hami-repository-open'");
        const modal = read('src/app/components/lawyer/SmartRepositoryModal.tsx');
        expect(modal).toContain('useBodyScrollLock');
        expect(modal).toContain('useReduceMotion');
        expect(modal).toContain('touchAction: \'manipulation\'');
    });

    it('لوحة المفاتيح: مسودة، تحرير بطاقة، ماسح، معرض غرف', () => {
        const compose = readFileSync(join(repo, 'RepositoryComposePanel.tsx'), 'utf8');
        expect(compose).toContain('useMobileKeyboardInset');
        expect(compose).toContain('enterKeyHint="next"');
        const inline = readFileSync(join(repo, 'entryCards/EntryCardInlineEditor.tsx'), 'utf8');
        expect(inline).toContain('useMobileKeyboardInset');
        expect(inline).toContain('enterKeyHint="next"');
        const scannerPanel = readFileSync(join(vault, 'SmartVaultScannerPanel.tsx'), 'utf8');
        expect(scannerPanel).toContain('useMobileKeyboardInset(scanner.phase === \'capturing\')');
        const gallery = readFileSync(join(repo, 'RepositoryRoomsGallery.tsx'), 'utf8');
        expect(gallery).toContain('useMobileKeyboardInset(open)');
        expect(gallery).toContain('inputMode="search"');
        expect(gallery).not.toContain('!pl-3 text-xs');
    });

    it('حقول 16px وأهداف لمس 44px في شريط المحرّر المضغوط والبحث', () => {
        const theme = readFileSync(join(repo, 'smartRepositoryTheme.ts'), 'utf8');
        expect(theme).toContain("REPO_COMPOSE_TITLE =");
        expect(theme).toContain('text-base');
        expect(theme).not.toContain('text-[15px]');
        const compact = readFileSync(join(repo, 'LegalRichTextEditorCompactToolbar.tsx'), 'utf8');
        expect(compact).toContain('min-h-[44px]');
        expect(compact).toContain('min-w-[44px]');
        expect(compact).toContain('touch-pan-x');
        expect(compact).not.toContain('h-9 w-9');
        expect(compact).not.toContain('h-9 w-6');
        const editor = readFileSync(join(repo, 'LegalRichTextEditor.tsx'), 'utf8');
        expect(editor).toContain('onTouchEnd={editor.syncToolbarFromSelection}');
        expect(editor).toContain('text-base');
        expect(editor).not.toContain('text-sm');
        const hub = read('src/app/components/lawyer/SmartVaultModal/VaultSearchFilterHub.tsx');
        expect(hub).toContain('text-base');
        expect(hub).toContain('inputMode="search"');
        expect(hub).not.toContain('text-sm text-[#F4F0E8]');
        const deck = readFileSync(join(repo, 'RepositoryClassificationDeck.tsx'), 'utf8');
        expect(deck).toContain('text-base text-[#F4F0E8]');
        expect(deck).not.toContain('text-xs text-[#F4F0E8]');
        const chrome = readFileSync(join(repo, 'repositoryChromeFilters.css'), 'utf8');
        expect(chrome).toContain('min-height: 2.75rem');
        expect(chrome).toContain('min-width: 2.75rem');
    });

    it('الكاميرا: عدسة خلفية، playsInline، إيقاف عند الخلفية، رسائل إذن', () => {
        const camera = readFileSync(join(vault, 'scannerCamera.ts'), 'utf8');
        expect(camera).toContain("facingMode: { ideal: 'environment' }");
        expect(camera).toContain('subscribeScannerCameraBackgroundRelease');
        expect(camera).toContain('subscribeCaptureBackgroundRelease');
        const capture = read('src/app/services/platform/mediaCaptureBackgroundRelease.ts');
        expect(capture).toContain('visibilitychange');
        expect(capture).toContain('pagehide');
        expect(capture).toContain('appStateChange');
        expect(camera).toContain('تم رفض إذن الكاميرا');
        const hook = readFileSync(join(vault, 'useSmartVaultScanner.ts'), 'utf8');
        expect(hook).toContain('subscribeScannerCameraBackgroundRelease');
        const phases = readFileSync(join(vault, 'SmartVaultScannerPhases.tsx'), 'utf8');
        expect(phases).toContain('playsInline');
        expect(phases).toContain('enterKeyHint="done"');
        const android = read('android/app/src/main/AndroidManifest.xml');
        expect(android).toContain('android.permission.CAMERA');
    });

    it('القوائم تُعاد حسابها مع visualViewport وتُغلق باللمس خارجها', () => {
        const pos = readFileSync(join(repo, 'anchoredPopoverPos.ts'), 'utf8');
        expect(pos).toContain('subscribeVisualViewportLayout');
        expect(pos).toContain('visualViewport');
        const popover = readFileSync(join(repo, 'hooks/useVaultClassificationPopover.ts'), 'utf8');
        expect(popover).toContain('subscribeVisualViewportLayout');
        const roomMenu = readFileSync(join(repo, 'hooks/useRepositoryRoomMenu.ts'), 'utf8');
        expect(roomMenu).toContain('subscribeVisualViewportLayout');
        expect(roomMenu).toContain("document.addEventListener('touchstart'");
    });
});
