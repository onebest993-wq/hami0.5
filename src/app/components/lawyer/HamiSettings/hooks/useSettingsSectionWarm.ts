import { useEffect } from 'react';
import type { SettingsSectionId } from '@/app/services/settings/types';
import {
    prefetchSettingsOpenTabChunks,
    prefetchSettingsSection,
} from '@/app/components/lawyer/HamiSettings/settingsSectionLoad';

/**
 * يسخّن التبويب النشط دائماً عند التركيب.
 * عند فتح الطبقة يُحمَّل المنظر/البيانات/الحساب في الخلفية حتى لا تُفرَّغ اللوحة عند التبديل.
 * خمول keepAlive لا يسحب التبويبات الثانوية.
 */
export function useSettingsSectionWarm(
    mounted: boolean,
    activeSection: SettingsSectionId,
    overlayOpen = false,
): void {
    useEffect(() => {
        if (!mounted) return;
        prefetchSettingsSection(activeSection);
        if (overlayOpen) prefetchSettingsOpenTabChunks();
    }, [activeSection, mounted, overlayOpen]);
}
