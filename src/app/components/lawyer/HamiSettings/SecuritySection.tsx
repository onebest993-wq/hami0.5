import React from 'react';
import { Fingerprint, Shield, User } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    clearStoredBiometricCredential,
    isWebAuthnLockSupported,
    registerBiometricCredential,
} from '@/app/services/security/webAuthnLock';
import { settingWiringHint } from '@/app/services/settings/settingsCapabilities';
import { AUTO_LOCK_OPTIONS, type AppSettingsState } from '@/app/services/settings';
import { SectionHeader, SettingCard, SettingRow, Toggle, SelectRow } from './settings-ui';

export type SecuritySectionProps = {
    settings: AppSettingsState;
    patchSecurity: (partial: Partial<AppSettingsState['security']>) => void;
};

export function SecuritySection({ settings, patchSecurity }: SecuritySectionProps) {
    const toggleBiometric = async (checked: boolean) => {
        if (!checked) {
            clearStoredBiometricCredential();
            patchSecurity({ biometricLock: false });
            SmartToast.success('تم إيقاف القفل البيومتري');
            return;
        }
        if (!isWebAuthnLockSupported()) {
            SmartToast.info('القفل البيومتري يتطلب HTTPS وجهازاً يدعم البصمة');
            return;
        }
        try {
            const registered = await registerBiometricCredential();
            if (registered) {
                const needsAutoLock = settings.security.autoLockMinutes === 0;
                patchSecurity({
                    biometricLock: true,
                    ...(needsAutoLock ? { autoLockMinutes: 5 as const } : {}),
                });
                SmartToast.success(
                    needsAutoLock ? 'تم تفعيل البصمة مع قفل تلقائي (5 دقائق)' : 'تم تفعيل القفل البيومتري',
                );
            } else {
                SmartToast.warning('تعذر تسجيل البصمة');
            }
        } catch {
            SmartToast.warning('تعذر تفعيل البصمة على هذا الجهاز');
        }
    };

    return (
        <>
            <SectionHeader title="الأمان والخصوصية" subtitle="حماية بيانات الموكلين والمكتب" icon={Shield} />
            <SettingCard>
                <SettingRow
                    icon={Shield}
                    label="تمويه عند الخروج"
                    subLabel="ضبابية الشاشة عند تبديل التطبيق"
                    action={<Toggle checked={settings.security.privacyBlur} onChange={(v) => patchSecurity({ privacyBlur: v })} />}
                />
                <SettingRow
                    icon={Shield}
                    label="منع القائمة اليمنى"
                    subLabel={settingWiringHint('security.screenshotDeterrent')}
                    action={<Toggle checked={settings.security.screenshotDeterrent} onChange={(v) => patchSecurity({ screenshotDeterrent: v })} />}
                />
                <SettingRow
                    icon={Fingerprint}
                    label="قفل بيومتري"
                    subLabel="يُطلب عند العودة للتطبيق أو بعد مدة الخمول"
                    action={<Toggle checked={settings.security.biometricLock} onChange={toggleBiometric} />}
                />
                <SelectRow
                    label="قفل تلقائي بعد"
                    value={String(settings.security.autoLockMinutes)}
                    options={AUTO_LOCK_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                    onChange={(v) =>
                        patchSecurity({ autoLockMinutes: Number(v) as AppSettingsState['security']['autoLockMinutes'] })
                    }
                />
                <SettingRow
                    icon={Shield}
                    label="وضع الخصوصية العالي"
                    subLabel="يوقف الخدمات الشبكية (السحابة/التزامن الحي/إشعارات الدفع)"
                    action={<Toggle checked={settings.security.decoyMode} onChange={(v) => patchSecurity({ decoyMode: v })} />}
                />
                <SettingRow
                    icon={User}
                    label="إخفاء أسماء حساسة"
                    subLabel="في رأس الشاشة: «المحامي» بدل الاسم الحقيقي"
                    isLast
                    action={<Toggle checked={settings.security.maskSensitiveInPublic} onChange={(v) => patchSecurity({ maskSensitiveInPublic: v })} />}
                />
            </SettingCard>
        </>
    );
}

