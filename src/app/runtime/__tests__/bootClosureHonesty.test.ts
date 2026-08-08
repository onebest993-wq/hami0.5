import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { injectCriticalModulePreloads } from '@/vite-plugins/hamiBootScriptOrder';

const root = process.cwd();

describe('boot closure honesty', () => {
    it('index يبدأ kickoffBootCriticalPreload قبل mountApplication', () => {
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain('kickoffBootCriticalPreload');
        const kickIdx = index.indexOf('kickoffBootCriticalPreload');
        const mountIdx = index.indexOf("import('@/boot/mountApplication')");
        expect(kickIdx).toBeGreaterThan(-1);
        expect(mountIdx).toBeGreaterThan(kickIdx);
    });

    it('bootCriticalPreload يوازي React و AppRuntimeShell و dashboard chunk', () => {
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain("import('react')");
        expect(preload).toContain("import('react-dom/client')");
        expect(preload).toContain("import('@/boot/appModule')");
        expect(preload).toContain("import('@/app/AppRuntimeShell')");
        expect(preload).toContain('preloadLawyerDashboardChunk');
        expect(preload).toContain('kickoffBootHeavyPreload');
        expect(preload).toContain('requestAnimationFrame');
    });

    it('mountApplication لا يحجب createRoot على clientEnv', () => {
        const mount = fs.readFileSync(path.join(root, 'src/boot/mountApplication.ts'), 'utf8');
        expect(mount).toContain('clientEnvPromise');
        expect(mount).toContain('void clientEnvPromise.catch');
        const allBlock = mount.match(/Promise\.all\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
        expect(allBlock).not.toContain('assertClientEnvOrThrow');
    });

    it('nativeBridgeReady لا يشترط PrivacyScreen للجسر', () => {
        const bridge = fs.readFileSync(path.join(root, 'src/app/runtime/nativeBridgeReady.ts'), 'utf8');
        expect(bridge).toContain('App.getState()');
        expect(bridge).toContain('PrivacyScreen');
        expect(bridge).not.toMatch(/if \(!Capacitor\.isPluginAvailable\('PrivacyScreen'\)\) return false/);
    });

    it('MainActivity يبقي splash حتى إشارة JS', () => {
        const main = fs.readFileSync(
            path.join(root, 'scripts/native-ready/android/java/MainActivity.java'),
            'utf8',
        );
        expect(main).toContain('pollBootRevealed[0]');
        expect(main).toContain('hamiBootRevealed');
        expect(main).toContain('hamiAppRuntimeReady');
        expect(main).toContain('evaluateJavascript');
    });

    it('injectCriticalModulePreloads يضيف boot-runtime و vendor-react', () => {
        const html = '<html><head></head><body><script type="module" src="/assets/index-x.js"></script></body></html>';
        const patched = injectCriticalModulePreloads(html, [
            'boot-runtime-abc.js',
            'vendor-react-def.js',
            'vendor-ui-ghi.js',
        ]);
        expect(patched).toContain('modulepreload');
        expect(patched).toContain('/assets/boot-runtime-abc.js');
        expect(patched).toContain('/assets/vendor-react-def.js');
    });

    it('vite modulePreload يسمح vendor-react و boot-runtime', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toMatch(/vendor-react\|boot-runtime/);
    });

    it('hami-boot.js لا يزيل static shell على جلسة دافئة', () => {
        const boot = fs.readFileSync(path.join(root, 'public/hami-boot.js'), 'utf8');
        expect(boot).toContain('hami_boot_complete');
        expect(boot).not.toMatch(/warmShell\.parentNode\.removeChild/);
    });

    it('AppResolvedRuntime يعلن الجاهزية في useLayoutEffect', () => {
        const runtime = fs.readFileSync(path.join(root, 'src/app/AppResolvedRuntime.tsx'), 'utf8');
        expect(runtime).toContain('useLayoutEffect');
        expect(runtime).toContain('hamiAppRuntimeReady');
    });
});
