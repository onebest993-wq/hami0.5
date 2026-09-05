import React from 'react';
import { SettingsStemSvg, type SettingsStemIconProps } from './settingsStemIconsCore';

/** أيقونات المنظر/البيانات/الحساب — خارج جذع الفتح */
export function SettingsLayersIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
            <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
            <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
        </SettingsStemSvg>
    );
}

export function SettingsPauseIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <rect x="14" y="4" width="4" height="16" rx="1" />
            <rect x="6" y="4" width="4" height="16" rx="1" />
        </SettingsStemSvg>
    );
}

export function SettingsChevronLeftIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="m15 18-6-6 6-6" />
        </SettingsStemSvg>
    );
}

export function SettingsChevronRightIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="m9 18 6-6-6-6" />
        </SettingsStemSvg>
    );
}

export function SettingsChevronDownIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="m6 9 6 6 6-6" />
        </SettingsStemSvg>
    );
}

export function SettingsCheckIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="M20 6 9 17l-5-5" />
        </SettingsStemSvg>
    );
}

export function SettingsRotateCcwIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </SettingsStemSvg>
    );
}

export function SettingsCloudIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </SettingsStemSvg>
    );
}

export function SettingsMoveIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="M12 2v20" />
            <path d="m15 19-3 3-3-3" />
            <path d="m19 9 3 3-3 3" />
            <path d="M2 12h20" />
            <path d="m5 9-3 3 3 3" />
            <path d="m9 5 3-3 3 3" />
        </SettingsStemSvg>
    );
}

export function SettingsZoomInIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <path d="M11 8v6" />
            <path d="M8 11h6" />
        </SettingsStemSvg>
    );
}

export function SettingsLogInIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="m10 17 5-5-5-5" />
            <path d="M15 12H3" />
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        </SettingsStemSvg>
    );
}

export function SettingsLogOutIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="M9 21H5a2 2 0 0 1 2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
        </SettingsStemSvg>
    );
}

export function SettingsScrollTextIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="M15 12h-5" />
            <path d="M15 8h-5" />
            <path d="M19 17V5a2 2 0 0 0-2-2H4" />
            <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
        </SettingsStemSvg>
    );
}

export function SettingsUserXIcon(props: SettingsStemIconProps) {
    return (
        <SettingsStemSvg {...props}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="m17 8 5 5" />
            <path d="m22 8-5 5" />
        </SettingsStemSvg>
    );
}
