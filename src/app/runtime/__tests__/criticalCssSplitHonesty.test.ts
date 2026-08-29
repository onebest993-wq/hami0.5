import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('critical CSS split honesty', () => {
    it('ويب الحرج بلا Android FX؛ البوابة native/dev فقط', () => {
        const shell = src('src/styles/critical-shell.css');
        const deferred = src('src/styles/deferred-app.css');
        const nativeCss = src('src/styles/critical-native-android.css');
        const plugin = src('src/vite-plugins/hamiCriticalNativeAndroidCss.ts');
        const index = src('src/index.tsx');

        expect(shell).not.toContain('lawyerHomeFx-android.css');
        expect(shell).toContain('lawyerHomeFx-critical.css');
        expect(shell).toContain('appLockOverlay.css');
        expect(shell).toContain('critical-lawyer-utils.css');
        expect(shell).toContain('app-screen.css');
        expect(shell).not.toContain('app-screen-runtime.css');

        expect(deferred).toContain('app-screen-runtime.css');
        expect(deferred).not.toContain('lawyerHomeFx-android.css');

        expect(nativeCss).toContain('lawyerHomeFx-android.css');
        expect(index).toContain("import 'virtual:hami-critical-native-android'");
        expect(plugin).toContain("command === 'serve'");
        expect(plugin).toContain('VITE_BUILD_NATIVE');
        expect(plugin).toContain('export {}');
    });

    it('حرج الإقلاع يحتفظ بهندسة CLS؛ المؤجّل بلا min-height/contain-intrinsic', () => {
        const criticalFx = src('src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css');
        const appScreen = src('src/styles/app-screen.css');
        const runtime = src('src/styles/app-screen-runtime.css');
        const utils = src('src/styles/critical-lawyer-utils.css');

        expect(criticalFx).toContain('--hami-home-hub-empty-slot-h');
        expect(criticalFx).toMatch(
            /\[data-testid='home-hub-card-skeleton'\]\s*\{[^}]*min-height:\s*var\(--hami-home-hub-empty-slot-h\)/s,
        );
        expect(criticalFx).toContain('.hami-home-scroll-root');
        expect(criticalFx).toContain('--hami-lawyer-header-offset');

        expect(appScreen).toContain('contain-intrinsic-size');
        expect(appScreen).toContain("content-visibility: visible");
        expect(appScreen).toContain("data-hami-block='alerts'");
        expect(appScreen).toContain('--hami-home-hub-empty-slot-h');
        expect(appScreen).toContain("[data-testid='home-main-grid'] [data-hami-block]");
        expect(appScreen).toContain('--hami-home-hub-row-h');
        expect(appScreen).toContain('--hami-home-forum-row-h');
        expect(appScreen).toMatch(
            /\[data-testid='home-main-grid'\] \[data-hami-block='alerts'\]\s*\{[^}]*--hami-home-hub-empty-slot-h/s,
        );
        expect(appScreen).not.toMatch(
            /\[data-hami-block='alerts'\][^{]*\{[^}]*contain-intrinsic-size:\s*auto 16rem/s,
        );
        expect(appScreen).toContain("html[data-hami-global-search-open='1']:not(:has(");
        expect(appScreen).not.toContain('hami-sovereign-aurora');
        expect(appScreen).not.toContain('data-hami-scrolling');

        expect(runtime).toContain("data-hami-jank-guard='1'");
        expect(runtime).toContain('data-hami-scrolling');
        expect(runtime).toContain("data-hami-render-idle='1'");
        expect(runtime).not.toContain('contain-intrinsic-size');
        expect(runtime).not.toContain('min-height: 240px');

        const gpu = src('src/styles/mobile-gpu-safety.css');
        expect(gpu).toContain('[data-hami-gpu-hot');
        expect(gpu).not.toContain('data-hami-render-idle');

        expect(utils).toContain('animate-pulse');
        expect(utils).toContain('.min-h-\\[240px\\]');
        expect(utils).toContain('.transition-colors');
    });
});
