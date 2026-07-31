import type { Dispatch, SetStateAction } from 'react';
import type { ShapeKey, ThemeKey } from '@/app/types/common';
import type { AppSettingsState } from '@/app/services/settings/types';

export type LawyerSettingsContextValue = {
    settings: AppSettingsState;
    setSettings: Dispatch<SetStateAction<AppSettingsState>>;
    patchSettings: (patch: Partial<AppSettingsState> | ((prev: AppSettingsState) => AppSettingsState)) => void;
    currentTheme: ThemeKey;
    currentShape: ShapeKey;
    setCurrentTheme: (t: ThemeKey) => void;
    setCurrentShape: (s: ShapeKey) => void;
    pushAllowed: boolean;
    resetToDefaults: () => void;
};

export type LawyerSettingsActionsValue = {
    setSettings: Dispatch<SetStateAction<AppSettingsState>>;
    patchSettings: (patch: Partial<AppSettingsState> | ((prev: AppSettingsState) => AppSettingsState)) => void;
    setCurrentTheme: (t: ThemeKey) => void;
    setCurrentShape: (s: ShapeKey) => void;
    resetToDefaults: () => void;
};
