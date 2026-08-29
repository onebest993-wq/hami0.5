import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'src/app/components/lawyer/LawyerHomeHubCard');
const shellCss = readFileSync(resolve(root, 'homeHubCardFx.css'), 'utf8');
const pinsCss = readFileSync(resolve(root, 'homeHubPinsFx.css'), 'utf8');
const alertsCss = readFileSync(resolve(root, 'homeHubAlertsFx.css'), 'utf8');
const overlayCss = readFileSync(resolve(root, 'homeHubOverlayFx.css'), 'utf8');
const css = `${shellCss}\n${pinsCss}\n${alertsCss}\n${overlayCss}`;

describe('homeHubGestureHonesty', () => {
    it('أهداف اللمس 44px لمحفّزات البقية والمقبض والحالة الفارغة المضغوطة', () => {
        expect(css).toMatch(/\.hami-hub-tab-more-trigger[\s\S]*min-height:\s*44px/);
        expect(css).toMatch(/\.hami-hub-radar-overlay__handle[\s\S]*min-height:\s*44px/);
        expect(shellCss).toMatch(/\.hami-hub-empty--compact[\s\S]*flex:\s*0\s+0\s+auto/);
        expect(shellCss).toMatch(/\.hami-hub-empty--compact[\s\S]*flex-shrink:\s*0/);
        expect(shellCss).toMatch(/\.hami-hub-empty--compact[\s\S]*min-height:\s*44px/);
        expect(shellCss).not.toMatch(/\.hami-hub-empty--compact\s*\{[^}]*flex:\s*0\s*;/s);
    });

    it('مناطق التمرير تستخدم pan-y و overscroll contain', () => {
        expect(css).toMatch(/\.hami-hub-radar-overlay__list[\s\S]*touch-action:\s*pan-y/);
        expect(css).toMatch(/\.hami-hub-pins-stack--overlay[\s\S]*touch-action:\s*pan-y/);
        expect(css).toMatch(/\.hami-hub-pins-panel/);
        expect(css).toContain("html[data-hami-reduce-motion='1'] .hami-hub-radar-overlay__close");
    });

    it('dvh وlite بلا blur وإيماءة الحافة على الطبقة', () => {
        expect(overlayCss).toContain('min(78dvh, 520px)');
        expect(overlayCss).toContain('overscroll-behavior: none');
        expect(overlayCss).toContain("html[data-hami-lite='1'] .hami-hub-radar-overlay__backdrop");
        const shell = readFileSync(
            resolve(root, 'components/HomeHubMoreOverlayShell.tsx'),
            'utf8',
        );
        expect(shell).toContain('data-hami-overlay-safe="1"');
        expect(shell).toContain('useMobileKeyboardInset(open)');
        const handle = readFileSync(
            resolve(root, 'components/HomeHubOverlaySheetHandle.tsx'),
            'utf8',
        );
        expect(handle).toContain('useReduceMotion');
    });

    it('مكدس الرجوع مربوط بزر الرجوع الأصلي', () => {
        const stack = readFileSync(
            resolve(
                process.cwd(),
                'src/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubOverlayBackStack.ts',
            ),
            'utf8',
        );
        expect(stack).toContain('registerNativeBackHandler');
    });
});
