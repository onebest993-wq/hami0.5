import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('settings section surgical close honesty', () => {
    it('orchestration لا يستخدم useLawyerSettingsFromSlices (يمنع homeLayout fan-out)', () => {
        const orch = [
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts'),
                'utf8',
            ),
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
                'utf8',
            ),
        ].join('\n');
        expect(orch).not.toContain('useLawyerSettingsFromSlices');
        expect(orch).toContain('useLawyerSettingsPerformance');
        expect(orch).toContain('LAWYER_SETTINGS_V2_DEFAULTS.homeLayout');
    });

    it('SecuritySection يعرض biometricSubLabel ويضع testId للقفل البيومتري', () => {
        const sec = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/security/SecuritySection.tsx'),
            'utf8',
        );
        expect(sec).toContain('biometricSubLabel');
        expect(sec).toContain('settings-toggle-security-biometricLock');
        expect(sec).toContain('settings-toggle-security-privacyBlur');
        expect(sec).toContain('togglePrivacyBlur');
    });

    it('privacyBlur يتخطى CSS على Capacitor', () => {
        const runtime = fs.readFileSync(
            path.join(root, 'src/app/runtime/privacyBlurRuntime.ts'),
            'utf8',
        );
        expect(runtime).toContain('isCapacitorNativePlatform');
        expect(runtime).toContain('bindWebPrivacyBlur');
        expect(runtime).toContain('bindNativePrivacyBlur');
        const provider = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/LawyerSettingsProvider.tsx'),
            'utf8',
        );
        const runtimeEffects = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/useLawyerSettingsRuntimeEffects.ts'),
            'utf8',
        );
        const bindings = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/useLawyerSettingsSecurityBindings.ts'),
            'utf8',
        );
        expect(provider).toContain('useLawyerSettingsRuntimeEffects');
        expect(runtimeEffects).toContain('useLawyerSettingsSecurityBindings');
        expect(bindings).toContain('settings.security.privacyBlur');
        expect(bindings).toContain('privacyBlurRuntime');
    });

    it('مسار فتح الإعدادات من الهيدر ما زال عبر HeaderSettingsTrigger', () => {
        const trigger = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerDashboardParts/components/HeaderSettingsTrigger.tsx',
            ),
            'utf8',
        );
        expect(trigger).toContain('header-settings-trigger');
        expect(trigger).toContain('الإعدادات');
    });
});
