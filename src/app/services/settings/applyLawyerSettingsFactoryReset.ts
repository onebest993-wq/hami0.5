import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import {
    applyHomeLayoutOverridesToDom,
    applySettingsToDom,
    persistWallpaper,
} from '@/app/services/settings/apply';
import type { AppSettingsState } from '@/app/services/settings/types';
import { cloneLawyerSettingsV2Defaults } from '@/app/services/settings/defaults';
import { applySettingsSecurityRuntime } from '@/app/services/settings/settingsSecurityRuntime';
import { armLocalOnlyNetworkIsolation } from '@/app/services/settings/localOnlyNetworkIsolation';
import {
    invalidateLawyerSettingsCache,
    publishLawyerSettingsLive,
} from '@/app/services/settings/settingsSnapshot';
import { clearBiometricSessionEnrollment } from '@/app/services/security/biometricSessionService';

/**
 * يعيد تفضيلات المحامي إلى المصنع ويطبّقها على القرص والـ DOM والحماية.
 * لا يمس ملفات القضايا المحلية.
 */
export function persistLawyerSettingsFactoryReset(next: AppSettingsState): void {
    persistWallpaper(undefined);
    const stripped = next.appearance.wallpaper
        ? { ...next, appearance: { ...next.appearance, wallpaper: undefined } }
        : next;
    persistenceRepository.save('lawyer_settings', stripped);
    persistenceRepository.save('lawyer_theme', next.appearance.theme);
    persistenceRepository.save('lawyer_shape', next.appearance.shape);
    persistenceRepository.flushPending('lawyer_settings');
    persistenceRepository.flushPending('lawyer_theme');
    persistenceRepository.flushPending('lawyer_shape');
    invalidateLawyerSettingsCache();
    publishLawyerSettingsLive(next);
    armLocalOnlyNetworkIsolation(Boolean(next.security.localOnlyMode));
    applySettingsToDom(next);
    applyHomeLayoutOverridesToDom(next);
    void applySettingsSecurityRuntime(next.security);
    void import('@/app/runtime/nativePrivacyGuard')
        .then((m) => m.syncNativePrivacyGuardFromSettings(next.security))
        .catch(() => undefined);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hami:settings-updated', { detail: next }));
    }
}

export function createLawyerSettingsFactoryResetSnapshot(): AppSettingsState {
    clearBiometricSessionEnrollment();
    return cloneLawyerSettingsV2Defaults();
}
