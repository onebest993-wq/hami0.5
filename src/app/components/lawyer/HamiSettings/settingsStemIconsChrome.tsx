import React from 'react';
import { SettingsStemSvg, type SettingsStemIconProps } from './settingsStemIconsCore';
import {
    SETTINGS_CLOSE_ICON_INNER,
    SETTINGS_NAV_ICON_INNER,
} from '@/app/services/settings/settingsNavIconInner';

export type { SettingsStemIcon, SettingsStemIconProps } from './settingsStemIconsCore';

/** أيقونات هيدر المركز — جذع الفتح فقط؛ المسارات من settingsNavIconInner */
export function SettingsPaletteIcon(props: SettingsStemIconProps) {
    return <SettingsStemSvg {...props} html={SETTINGS_NAV_ICON_INNER.appearance} />;
}

export function SettingsShieldIcon(props: SettingsStemIconProps) {
    return <SettingsStemSvg {...props} html={SETTINGS_NAV_ICON_INNER.security} />;
}

export function SettingsDatabaseIcon(props: SettingsStemIconProps) {
    return <SettingsStemSvg {...props} html={SETTINGS_NAV_ICON_INNER.data} />;
}

export function SettingsUserIcon(props: SettingsStemIconProps) {
    return <SettingsStemSvg {...props} html={SETTINGS_NAV_ICON_INNER.account} />;
}

export function SettingsXIcon(props: SettingsStemIconProps) {
    return <SettingsStemSvg {...props} html={SETTINGS_CLOSE_ICON_INNER} />;
}
