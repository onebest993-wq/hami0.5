import React, { memo } from 'react';
import { Eye, Fingerprint, Shield, WifiOff } from 'lucide-react';
import { settingWiringHint } from '@/app/services/settings/settingsCapabilities';
import { AUTO_LOCK_OPTIONS } from '@/app/services/settings';
import { SectionHeader, SettingCard, SettingRow, Toggle, SelectRow } from '../settings-ui';
import { useSecuritySection } from './useSecuritySection';

export const SecuritySection = memo(function SecuritySection() {
    const vm = useSecuritySection();

    return (
        <div data-testid="settings-section-security">
            <SectionHeader title="الأمان والخصوصية" subtitle="حماية بيانات الموكلين والمكتب" icon={Shield} />

            {vm.security.localOnlyMode ? (
                <div
                    className="mb-4 px-4 py-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 text-center"
                    data-testid="settings-local-only-banner"
                >
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
                            testId="settings-toggle-security-localOnlyMode"
                            checked={vm.security.localOnlyMode}
                            onChange={(v) => void vm.toggleLocalOnly(v)}
                        />
                    }
                />
                <SettingRow
                    icon={Shield}
                    label="تمويه عند الخروج"
                    subLabel={settingWiringHint('security.privacyBlur')}
                    action={
                        <Toggle
                            testId="settings-toggle-security-privacyBlur"
                            checked={vm.security.privacyBlur}
                            onChange={(v) => vm.patchSecurity({ privacyBlur: v })}
                        />
                    }
                />
                <SettingRow
                    icon={Fingerprint}
                    label="قفل بيومتري"
                    subLabel={settingWiringHint('security.biometricLock')}
                    action={
                        <Toggle checked={vm.security.biometricLock} onChange={vm.toggleBiometric} />
                    }
                />
                <SelectRow
                    label="قفل تلقائي بعد"
                    hint={settingWiringHint('security.autoLockMinutes')}
                    value={String(vm.security.autoLockMinutes)}
                    options={AUTO_LOCK_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                    onChange={vm.setAutoLockMinutes}
                />
                <SettingRow
                    icon={Eye}
                    label="حماية لقطة الشاشة"
                    subLabel={settingWiringHint('security.screenshotDeterrent')}
                    isLast
                    action={
                        <Toggle
                            testId="settings-toggle-security-screenshotDeterrent"
                            checked={vm.security.screenshotDeterrent}
                            onChange={(v) => vm.patchSecurity({ screenshotDeterrent: v })}
                        />
                    }
                />
            </SettingCard>
        </div>
    );
});
