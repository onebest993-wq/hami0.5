import React, { memo } from 'react';
import {
    SettingsEyeIcon,
    SettingsFingerprintIcon,
    SettingsTimerIcon,
    SettingsWifiOffIcon,
} from '../settingsStemIconsSecurity';
import { AUTO_LOCK_OPTIONS } from '@/app/services/settings/nav';
import { SettingCard, SettingRow, SelectRow } from '../settings-ui/index';
import { AsyncSettingToggle } from '../AsyncSettingToggle';
import { useSecuritySection } from './useSecuritySection';

export const SecuritySection = memo(function SecuritySection() {
    const vm = useSecuritySection();

    return (
        <div data-testid="settings-section-security" data-settings-interactive="true">
            {vm.security.localOnlyMode ? (
                <div
                    className="mb-2 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.08]"
                    data-testid="settings-local-only-banner"
                >
                    <p className="text-[12px] font-medium text-amber-100/90">قطع الاتصال مفعّل</p>
                    <p className="text-[11px] text-amber-100/55 mt-0.5">كل العمل محلي — لا مزامنة ولا اتصال خارجي</p>
                </div>
            ) : null}

            <SettingCard>
                <SettingRow
                    icon={SettingsWifiOffIcon}
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
                    icon={SettingsFingerprintIcon}
                    label="قفل بيومتري"
                    subLabel={vm.biometricSubLabel}
                    reserveSubLabel
                    action={
                        <AsyncSettingToggle
                            testId="settings-toggle-security-biometricLock"
                            checked={vm.security.biometricLock}
                            onCommit={vm.toggleBiometric}
                        />
                    }
                />
                <SelectRow
                    icon={SettingsTimerIcon}
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
                    icon={SettingsEyeIcon}
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
