import type { ProfileSettingsTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';

/** منفصل عن مكوّن التبويب حتى لا يكسر Vite Fast Refresh */
export const PROFILE_SETTINGS_TAB_IDS: ProfileSettingsTab[] = ['appearance', 'containers'];
