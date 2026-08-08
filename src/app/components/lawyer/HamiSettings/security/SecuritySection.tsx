import React, { memo } from 'react';
import { Eye, Fingerprint, WifiOff } from '@/app/components/ui/lucideIcons';
import { AUTO_LOCK_OPTIONS } from '@/app/services/settings';
import { SettingCard, SettingRow, Toggle, SelectRow } from '../settings-ui';
import { AsyncSettingToggle } from '../AsyncSettingToggle';
import { useSecuritySection } from './useSecuritySection';

export const SecuritySection = memo(function SecuritySection() {
    const vm = useSecuritySection();

    return (
        <div data-testid="settings-section-security" data-settings-interactive="true">

            {vm.security.localOnlyMode ? (
                <div
                    className="mb-4 px-4 py-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 text-center"
                    data-testid="settings-local-only-banner"
                >
                    <p className="text-xs font-bold text-amber-200/95">قطع الاتصال مفعّل</p>
                    <p className="text-xs text-amber-100/80 mt-1">كل العمل محلي — لا مزامنة ولا اتصال خارجي</p>
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
                    icon={Eye}
                    label="حماية لقطة الشاشة"
                    subLabel="يمنع لقطة الشاشة وتسجيل الشاشة على الجهاز"
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
