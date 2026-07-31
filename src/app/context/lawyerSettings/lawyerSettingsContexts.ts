import { createContext } from 'react';
import type {
    AppearanceSettings,
    DataSettings,
    HomeLayoutSettings,
    PerformanceSettings,
    SecuritySettings,
} from '@/app/services/settings/types';
import type { LawyerSettingsActionsValue, LawyerSettingsContextValue } from './lawyerSettingsTypes';

export const LawyerSettingsContext = createContext<LawyerSettingsContextValue | null>(null);
export const LawyerSettingsAppearanceContext = createContext<AppearanceSettings | null>(null);
export const LawyerSettingsSecurityContext = createContext<SecuritySettings | null>(null);
export const LawyerSettingsDataContext = createContext<DataSettings | null>(null);
export const LawyerSettingsPerformanceContext = createContext<PerformanceSettings | null>(null);
export const LawyerSettingsHomeLayoutContext = createContext<HomeLayoutSettings | null>(null);
export const LawyerSettingsActionsContext = createContext<LawyerSettingsActionsValue | null>(null);
