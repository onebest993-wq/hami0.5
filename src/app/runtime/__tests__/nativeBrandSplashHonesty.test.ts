import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('native brand splash honesty', () => {
    it('لا يستخدم تأخيراً اصطناعياً ولا أسوداً خاماً', () => {
        const main = read('android/app/src/main/java/iq/hami/legal/MainActivity.java');
        const colors = read('android/app/src/main/res/values/colors.xml');
        const cap = read('capacitor.config.ts');
        const reveal = read('src/app/bootstrap/bootReveal.ts');
        expect(main).not.toContain('Thread.sleep');
        expect(main).not.toContain('SystemClock.sleep');
        expect(main).toMatch(/BOOT_OVERLAY_FADE_MS\s*=\s*150/);
        expect(main).toContain('#0A0F1C');
        expect(colors).toContain('splash_background">#0A0F1C');
        expect(colors).not.toContain('splash_background">#000000');
        expect(cap).toContain("backgroundColor: '#0A0F1C'");
        expect(cap).toContain("androidScaleType: 'FIT_CENTER'");
        expect(reveal).toMatch(/export function getBootRevealMinMs\(\)[\s\S]*?return 0;/);
    });

    it('مورد Capacitor splash هو XML فقط — بلا splash.png مكرر', () => {
        const splashXml = path.join(root, 'android/app/src/main/res/drawable/splash.xml');
        const splashPng = path.join(root, 'android/app/src/main/res/drawable/splash.png');
        expect(fs.existsSync(splashXml)).toBe(true);
        expect(fs.existsSync(splashPng)).toBe(false);
        const apply = read('scripts/apply-android-native-ready.mjs');
        const verify = read('scripts/verify-android-native.mjs');
        expect(apply).toContain('removeCapacitorSplashPngs');
        expect(verify).toContain('listCapacitorSplashPngs');
        const pkg = read('package.json');
        expect(pkg).toContain('"capacitor:copy:after"');
        expect(pkg).toContain('strip-android-splash-pngs.mjs');
        expect(read('scripts/strip-android-splash-pngs.mjs')).toContain('removeCapacitorSplashPngs');
        expect(read('android/app/src/main/res/drawable/splash.xml')).toContain('@drawable/splash_screen');
    });

    it('أيقونة Android 12+ داخل قالب 288dp مع شعار محشور للدائرة', () => {
        const icon = read('android/app/src/main/res/drawable/splash_icon.xml');
        const blank = read('android/app/src/main/res/drawable/splash_icon_blank.xml');
        const overlay = read('android/app/src/main/res/layout/hami_boot_overlay.xml');
        expect(blank).toContain('288dp');
        expect(icon).toContain('hami_splash_logo_padded');
        expect(overlay).toContain('android:scaleType="fitCenter"');
        expect(overlay).toContain('288dp');
        expect(overlay).toContain('3dp');
        expect(fs.existsSync(path.join(root, 'android/app/src/main/res/drawable-nodpi/hami_splash_logo_padded.webp'))).toBe(
            true,
        );
        const padded = fs.statSync(
            path.join(root, 'android/app/src/main/res/drawable-nodpi/hami_splash_logo_padded.webp'),
        );
        const logo = fs.statSync(path.join(root, 'android/app/src/main/res/drawable-nodpi/hami_splash_logo.webp'));
        expect(padded.size).toBeLessThanOrEqual(30 * 1024);
        expect(logo.size).toBeLessThanOrEqual(30 * 1024);
    });

    it('الشريط الأصلي برمجي بالكامل بلا صور شريط', () => {
        const progress = read('android/app/src/main/java/iq/hami/legal/boot/HamiBootProgressView.kt');
        expect(progress).toContain('ValueAnimator');
        expect(progress).toContain('drawRoundRect');
        expect(progress).not.toContain('R.drawable');
        expect(progress).not.toContain('.png');
        expect(progress).not.toContain('.webp');
    });

    it('iOS LaunchScreen يقفل النسبة على سطح الهوية', () => {
        const story = read('scripts/native-ready/ios/LaunchScreen.storyboard');
        const overlay = read('scripts/native-ready/ios/HamiBootOverlayView.swift');
        expect(story).toContain('scaleAspectFit');
        expect(story).toContain('0.0392156862745098');
        expect(overlay).toContain('scaleAspectFit');
        expect(overlay).toContain('fadeMs');
        expect(overlay).toContain('0.15');
        expect(overlay).not.toContain('sleep');
        expect(overlay).not.toContain('asyncAfter');
    });

    it('الويب يعرض الشعار بنسبة مقفولة وشريط برمجي — بلا كلمة', () => {
        const html = read('index.html');
        const boot = read('public/hami-boot.js');
        expect(html).toContain('data-hami-boot-mode="silent-canvas"');
        expect(html).toContain('hami-boot-progress');
        expect(html).toContain('hami-boot-progress-fill');
        expect(html).toContain('hami-splash-logo.webp');
        expect(html).not.toMatch(/rel=["']preload["'][^>]*hami-splash-logo/);
        expect(boot).toContain('if (!coverDoc)');
        expect(boot).toContain("splashPreload.as = 'image'");
        expect(boot).toContain("splashPreload.href = '/hami-splash-logo.webp'");
        expect(html).toContain('object-fit: contain');
        expect(html).not.toContain('hami-boot-wordmark');
        expect(boot).toContain('startHamiBootProgressMotion');
        expect(boot).toContain('hami-boot-progress-fill');
        expect(boot).toContain('setInterval');
        expect(boot).toContain("el.style.left");
        expect(boot).not.toContain('requestPaintGateUncoverIfSplashStuck');
        expect(boot).not.toMatch(/__hamiHomeMainGridPainted__\s*=\s*true/);
        expect(boot).not.toMatch(/setTimeout\(requestPaintGateUncoverIfSplashStuck/);
        expect(boot).not.toContain('stripStaticBootWhenUiReady');
        expect(boot).not.toContain('childElementCount');
        expect(fs.existsSync(path.join(root, 'public/hami-splash-logo.webp'))).toBe(true);
        expect(fs.statSync(path.join(root, 'public/hami-splash-logo.webp')).size).toBeLessThanOrEqual(30 * 1024);
    });

    it('حارس الإقلاع لا يزيل الطبقة عند المهلة ولا يتجاهل Vite', () => {
        const boot = read('public/hami-boot.js');
        const guard = boot.slice(boot.indexOf('window.setTimeout(function ()'));
        expect(guard).toContain('isViteDevPage');
        expect(guard).not.toContain('shell.parentNode.removeChild(shell)');
        expect(boot).toContain("port === '8080'");
        expect(boot).toMatch(/if \(isViteDevPage\(\)\) return 120000;/);
        expect(boot).toMatch(/if \(isNativeShell\(\)\) return 22000;/);
    });
});
