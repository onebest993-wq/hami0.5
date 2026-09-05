import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('settings mobile close honesty', () => {
    it('الطبقة تقفل التمرير وتتبع overlay-safe وإيماءة الحافة', () => {
        const host = read('src/app/components/lawyer/HamiSettings/HamiSettingsHost.tsx');
        expect(host).toContain('useBodyScrollLock(layerOpen)');
        expect(host).toContain('adoptSettingsOverlayHostNode');
        expect(host).toContain('syncSettingsOverlayHostAppearance');
        const constants = read('src/app/runtime/settingsInstantPaintConstants.ts');
        expect(constants).toContain('h-[100dvh]');
        expect(constants).toContain('overscroll-none');
        const adopt = read('src/app/runtime/settingsInstantPaintHostAdopt.ts');
        expect(adopt).toContain('data-hami-overlay-safe');
        const edge = read('src/app/runtime/overlayEdgeBackGesture.ts');
        expect(edge).toContain("'data-hami-settings-open'");
        const trap = read(
            'src/app/components/lawyer/HamiSettings/hooks/useSettingsShellFocusTrap.ts',
        );
        expect(trap).toContain('registerNativeBackHandler');
        const header = read('src/app/components/lawyer/HamiSettings/SettingsShellHeader.tsx');
        expect(header).toContain('min-h-[44px]');
        expect(header).toContain('min-w-[44px]');
        expect(header).toContain('safe-area-inset-top');
        expect(header).toContain("touchAction: 'manipulation'");
    });

    it('لوحة المفاتيح والخمول الأصلي وتقليل الحركة', () => {
        const keyboard = read(
            'src/app/components/lawyer/HamiSettings/hooks/useSettingsOverlayKeyboard.ts',
        );
        expect(keyboard).toContain('useMobileKeyboardInset');
        expect(keyboard).toContain('isHamiNativeShell');
        const shell = read('src/app/components/lawyer/HamiSettings/SettingsShell.tsx');
        expect(shell).toContain('useReduceMotion');
        expect(shell).toContain('useSettingsOverlayKeyboard');
        expect(shell).toContain('useSettingsMobileSuspend');
        expect(shell).toContain('safe-area-inset-bottom');
        const suspend = read(
            'src/app/components/lawyer/HamiSettings/hooks/useSettingsMobileSuspend.ts',
        );
        expect(suspend).toContain('HAMI_APP_STATE_EVENT');
        expect(suspend).toContain('pagehide');
        const css = read('src/app/components/lawyer/HamiSettings/settingsInstantChrome.css');
        expect(css).toContain('safe-area-inset-left');
        expect(css).toContain('safe-area-inset-right');
        expect(css).toContain('min-height: 44px');
    });
});
