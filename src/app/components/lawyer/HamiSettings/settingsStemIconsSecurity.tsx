import React from 'react';
import { SettingsStemSvg, type SettingsStemIconProps } from './settingsStemIconsCore';

/** أيقونات تبويب الأمن — sync على جذع الفتح، بلا أيقونات المنظر/الحساب */
export function SettingsWifiOffIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="M12 20h.01" />
            <path d="M8.5 16.429a5 5 0 0 1 7 0" />
            <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
            <path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
            <path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
            <path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
            <path d="m2 2 20 20" />
        </SettingsStemSvg>
    );
}

export function SettingsFingerprintIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
            <path d="M2 12a10 10 0 0 1 18-6" />
            <path d="M2 16h.01" />
            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
            <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
        </SettingsStemSvg>
    );
}

export function SettingsEyeIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
            <circle cx="12" cy="12" r="3" />
        </SettingsStemSvg>
    );
}

export function SettingsTimerIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </SettingsStemSvg>
    );
}
