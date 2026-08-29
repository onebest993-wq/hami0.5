import React, { memo } from 'react';
import { Eye } from '@/app/components/ui/icons/Eye';
import { EyeOff } from '@/app/components/ui/icons/EyeOff';
import { Fingerprint } from '@/app/components/ui/icons/Fingerprint';
import { WifiOff } from '@/app/components/ui/icons/WifiOff';
import { AUTO_LOCK_OPTIONS } from '@/app/services/settings';
import { SettingCard, SettingRow, SelectRow } from '../settings-ui/index';
import { AsyncSettingToggle } from '../AsyncSettingToggle';
import { useSecuritySection } from './useSecuritySection';

export const SecuritySection = memo(function SecuritySection() {
    const vm = useSecuritySection();

    return (
        <div data-testid="settings-section-security" data-settings-interactive="true">

            {vm.security.localOnlyMode ? (
                <div
                    className="mb-2.5 px-3.5 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.08]"
                    data-testid="settings-local-only-banner"
                >
                    <p className="text-[13px] font-medium text-amber-100/90">قطع الاتصال مفعّل</p>
                    <p className="text-[11px] text-amber-100/55 mt-0.5">كل العمل محلي — لا مزامنة ولا اتصال خارجي</p>
                </div>
            ) : null}

            <SettingCard>
                <SettingRow
                    icon={WifiOff}
                    label="قطع الاتصال"
                    action={
                        <AsyncSettingToggle
                            testId="settings-toggle-security-localOnlyMode"
                            checked={vm.security.localOnlyMode}
                            onCommit={vm.toggleLocalOnly}
                        />
                    }
                />
                <SettingRow
                    icon={Fingerprint}
                    label="قفل بيومتري"
                    subLabel={vm.biometricSubLabel}
                    action={
                        <AsyncSettingToggle
                            testId="settings-toggle-security-biometricLock"
                            checked={vm.security.biometricLock}
                            onCommit={vm.toggleBiometric}
                        />
                    }
                />
                <SelectRow
                    label="قفل تلقائي بعد"
                    value={String(vm.security.autoLockMinutes)}
                    options={AUTO_LOCK_OPTIONS.map((o) => ({
                        value: String(o.value),
                        label: o.label,
                        testId: `settings-auto-lock-${o.value}`,
                    }))}
                    onChange={vm.setAutoLockMinutes}
                />
                <SettingRow
                    icon={EyeOff}
                    label="ضبابية الخصوصية"
                    subLabel="تمويه عند الإخفاء وتغطية شاشة المهام على الهاتف"
                    action={
                        <AsyncSettingToggle
                            label="ضبابية الخصوصية"
                            testId="settings-toggle-security-privacyBlur"
                            checked={vm.security.privacyBlur}
                            onCommit={vm.togglePrivacyBlur}
                        />
                    }
                />
                <SettingRow
                    icon={Eye}
                    label="حماية لقطة الشاشة"
                    isLast
                    action={
                        <AsyncSettingToggle
                            label="حماية لقطة الشاشة"
                            testId="settings-toggle-security-screenshotDeterrent"
                            checked={vm.security.screenshotDeterrent}
                            onCommit={vm.toggleScreenshotDeterrent}
                        />
                    }
                />
            </SettingCard>
        </div>
    );
});
