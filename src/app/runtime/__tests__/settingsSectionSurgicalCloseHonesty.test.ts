import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('settings section surgical close honesty', () => {
    it('orchestration لا يستخدم useLawyerSettingsFromSlices (يمنع homeLayout fan-out)', () => {
        const orch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
            'utf8',
        );
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
    });

    it('privacyBlur يتخطى CSS على Capacitor', () => {
        const provider = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/LawyerSettingsProvider.tsx'),
            'utf8',
        );
        expect(provider).toContain('isCapacitorNativePlatform');
        expect(provider).toContain('settings.security.privacyBlur');
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
