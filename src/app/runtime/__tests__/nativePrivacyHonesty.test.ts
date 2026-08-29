import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('native privacy + biometric honesty', () => {
    it('الجسر لا يعطّل PrivacyScreen عند فحص الجاهزية', () => {
        const bridge = read('src/app/runtime/nativeBridgeReady.ts');
        expect(bridge).toContain('App.getState()');
        expect(bridge).not.toMatch(/await PrivacyScreen\.disable/);
        expect(bridge).toContain('لا يستدعي PrivacyScreen.disable');
    });

    it('MainActivity يغطّي شاشة المهام أصلياً قبل JS', () => {
        const main = read('scripts/native-ready/android/java/MainActivity.java');
        expect(main).toContain('HamiPrivacyPlugin');
        expect(main).toContain('HamiPrivacyGuard.attach');
        expect(main).toContain('onUserLeaveHint');
        expect(main).toContain('HamiPrivacyGuard.onLeaving');
        expect(fs.existsSync(path.join(root, 'scripts/native-ready/android/java/privacy/HamiPrivacyGuard.kt'))).toBe(
            true,
        );
        const guard = read('scripts/native-ready/android/java/privacy/HamiPrivacyGuard.kt');
        expect(guard).toContain('FLAG_SECURE');
        expect(guard).toContain('fun onLeaving');
        expect(guard).toContain('hami_privacy_recents_cover');
    });

    it('ضبابية الخصوصية تربط الغطاء الأصلي ولا تعلن العجز عن شاشة المهام', () => {
        const runtime = read('src/app/runtime/privacyBlurRuntime.ts');
        expect(runtime).toContain('applyNativePrivacyGuard');
        expect(runtime).not.toContain('setTimeout');
        const section = read('src/app/components/lawyer/HamiSettings/security/SecuritySection.tsx');
        expect(section).not.toContain('لا تغطي شاشة المهام');
        expect(section).toContain('تغطية شاشة المهام');
        const toggles = read('src/app/components/lawyer/HamiSettings/security/securitySectionToggles.ts');
        expect(toggles).toContain('applyNativePrivacyGuard');
        expect(toggles).not.toContain('تبقى خارج سيطرة التطبيق');
    });

    it('القفل البيومتري يعزل نافذة المصادقة عن قفل الخلفية', () => {
        const bridge = read('src/app/runtime/nativeBiometricBridge.ts');
        expect(bridge).toContain('withNativeSensitivePrompt');
        expect(bridge).toContain('waitUntilAppInteractive');
        const lock = read('src/app/hooks/useAppLock.ts');
        expect(lock).toContain('isNativeSensitivePromptActive');
        const overlay = read('src/app/components/lawyer/AppLockOverlay.tsx');
        expect(overlay).toContain('HAMI_APP_STATE_EVENT');
        expect(overlay).toContain('visibilitychange');
    });
});
