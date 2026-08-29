import { useEffect } from 'react';
import type { AppSettingsState } from '@/app/services/settings/types';
import { isLocalOnlyModeEnabled } from '@/app/services/settings/localOnlyGuard';
import { PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';
import { isCloudSyncEnabled } from '@/lib/cloudSyncEnv.js';

type UseLawyerSettingsCloudSyncParams = {
    settings: AppSettingsState;
    settingsHydrated: boolean;
    cloudSyncEnabled: boolean;
};

/** رفع إعدادات المحامي/الثيم/الشكل إلى السحابة عند التفعيل */
export function useLawyerSettingsCloudSync({
    settings,
    settingsHydrated,
    cloudSyncEnabled,
}: UseLawyerSettingsCloudSyncParams) {
    useEffect(() => {
        if (
            !settingsHydrated ||
            !cloudSyncEnabled ||
            isLocalOnlyModeEnabled(settings) ||
            !isCloudSyncEnabled()
        ) {
            return;
        }

        const timer = window.setTimeout(() => {
            void (async () => {
                try {
                    const { saveToCloud, collectAppData, resolveCloudSyncUserKey } = await import(
                        '@/lib/syncService.js'
                    );
                    const userKey = await resolveCloudSyncUserKey();
                    if (!userKey) return;
                    await saveToCloud(collectAppData({ lawyer_settings: settings }));
                } catch {
                    /* صامت — المحلي يبقى مصدراً */
                }
            })();
        }, PERSIST_DEBOUNCE_MS.LIGHT * 2);

        return () => window.clearTimeout(timer);
    }, [cloudSyncEnabled, settings, settingsHydrated]);
}
