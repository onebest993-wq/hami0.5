import React from 'react';
import { Eye, Fingerprint, Shield, WifiOff } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import {
    clearStoredBiometricCredential,
    isWebAuthnLockSupported,
    registerBiometricCredential,
} from '@/app/services/security/webAuthnLock';
import { settingWiringHint } from '@/app/services/settings/settingsCapabilities';
import { AUTO_LOCK_OPTIONS, type AppSettingsState } from '@/app/services/settings';
import { SectionHeader, SettingCard, SettingRow, Toggle, SelectRow } from './settings-ui';
import { useSettingsPatches } from './hooks/useSettingsPatches';

export function SecuritySection() {
    const { settings } = useLawyerSettings();
    const { patchSecurity, patchData } = useSettingsPatches();

    const toggleLocalOnly = async (enabled: boolean) => {
        if (enabled) {
            const ok = await SmartDialog.confirm(
                'لن يتصل التطبيق بالإنترنت أو السحابة. تبقى القضايا والملاحظات والتنفيذ على هذا الجهاز فقط. يمكنك إلغاء ذلك لاحقاً.',
                { title: 'تفعيل قطع الاتصال؟' },
            );
            if (!ok) return;
            patchSecurity({ localOnlyMode: true });
            patchData({
                cloudSync: false,
                syncNotes: false,
                syncFiles: false,
                syncExecution: false,
            });
            SmartToast.success('قطع الاتصال — العمل محلياً بالكامل');
            return;
        }
        patchSecurity({ localOnlyMode: false });
        SmartToast.info('تم استعادة إمكانية الاتصال');
    };

    const toggleBiometric = async (checked: boolean) => {
        if (!checked) {
            clearStoredBiometricCredential();
            patchSecurity({ biometricLock: false });
            SmartToast.success('تم إيقاف القفل البيومتري');
            return;
        }
        if (!isWebAuthnLockSupported()) {
            SmartToast.info('القفل البيومتري يتطلب جهازاً يدعم البصمة أو Face ID');
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

            {settings.security.localOnlyMode ? (
                <div className="mb-4 px-4 py-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 text-center">
                    <p className="text-xs font-bold text-amber-200/95">قطع الاتصال مفعّل</p>
                    <p className="text-[10px] text-amber-100/70 mt-1">كل العمل محلي — لا مزامنة ولا اتصال خارجي</p>
                </div>
            ) : null}

            <SettingCard>
                <SettingRow
                    icon={WifiOff}
                    label="قطع الاتصال"
                    subLabel={settingWiringHint('security.localOnlyMode')}
                    action={
                        <Toggle
                            checked={settings.security.localOnlyMode}
                            onChange={(v) => void toggleLocalOnly(v)}
                        />
                    }
                />
                <SettingRow
                    icon={Shield}
                    label="تمويه عند الخروج"
                    subLabel={settingWiringHint('security.privacyBlur')}
                    action={<Toggle checked={settings.security.privacyBlur} onChange={(v) => patchSecurity({ privacyBlur: v })} />}
                />
                <SettingRow
                    icon={Fingerprint}
                    label="قفل بيومتري"
                    subLabel={settingWiringHint('security.biometricLock')}
                    action={<Toggle checked={settings.security.biometricLock} onChange={toggleBiometric} />}
                />
                <SelectRow
                    label="قفل تلقائي بعد"
                    hint={settingWiringHint('security.autoLockMinutes')}
                    value={String(settings.security.autoLockMinutes)}
                    options={AUTO_LOCK_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                    onChange={(v) =>
                        patchSecurity({ autoLockMinutes: Number(v) as AppSettingsState['security']['autoLockMinutes'] })
                    }
                />
                <SettingRow
                    icon={Eye}
                    label="حماية لقطة الشاشة"
                    subLabel={settingWiringHint('security.screenshotDeterrent')}
                    isLast
                    action={
                        <Toggle
                            checked={settings.security.screenshotDeterrent}
                            onChange={(v) => patchSecurity({ screenshotDeterrent: v })}
                        />
                    }
                />
            </SettingCard>
        </>
    );
}
