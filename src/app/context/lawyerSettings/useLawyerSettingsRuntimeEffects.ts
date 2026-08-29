import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AppSettingsState } from '@/app/services/settings/types';
import { useLawyerSettingsDomSync } from './useLawyerSettingsDomSync';
import { useLawyerSettingsPersistBroadcast } from './useLawyerSettingsPersistBroadcast';
import { useLawyerSettingsSecurityBindings } from './useLawyerSettingsSecurityBindings';

type RuntimeParams = {
    settings: AppSettingsState;
    setSettings: Dispatch<SetStateAction<AppSettingsState>>;
    settingsHydrated: boolean;
    settingsRef: MutableRefObject<AppSettingsState>;
    autoSaveOn: boolean;
};

export function useLawyerSettingsRuntimeEffects({
    settings,
    setSettings,
    settingsHydrated,
    settingsRef,
    autoSaveOn,
}: RuntimeParams) {
    useLawyerSettingsPersistBroadcast(settings, setSettings, settingsHydrated, autoSaveOn);
    useLawyerSettingsDomSync(settings, settingsHydrated, settingsRef);
    useLawyerSettingsSecurityBindings(settings, setSettings, settingsHydrated);
}
