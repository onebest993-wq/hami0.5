import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import type { AppSettingsState } from '@/app/services/settings/types';

/** بديل بناء المقر — لقطة إعدادات محامي الهاتف ليست سطح المقر. */
export function invalidateLawyerSettingsCache(): void {
    /* HQ product excludes lawyer settings persistence */
}

export function publishLawyerSettingsLive(_next: AppSettingsState): void {
    /* HQ product excludes lawyer settings persistence */
}

export function subscribeLawyerSettingsLive(_onStoreChange: () => void): () => void {
    return () => undefined;
}

export function getLawyerSettingsStoreSnapshot(): AppSettingsState {
    return LAWYER_SETTINGS_V2_DEFAULTS;
}

export function hydrateLawyerSettingsFast(): void {
    /* HQ product excludes lawyer settings persistence */
}

export function getLawyerSettingsSnapshot(): AppSettingsState {
    return LAWYER_SETTINGS_V2_DEFAULTS;
}
