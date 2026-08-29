import {
    applySettingsToDom,
    type AppSettingsState,
} from '@/app/services/settings';

export function applySettingsPatch(
    prev: AppSettingsState,
    patch: Partial<AppSettingsState> | ((current: AppSettingsState) => AppSettingsState),
): AppSettingsState {
    const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
    applySettingsToDom(next);
    return next;
}
