import { useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { useLawyerDashboardSettings } from '@/app/hooks/lawyerDashboard/useLawyerDashboardSettings';
import { useLawyerDashboardProfileTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type {
    LawyerDashboardProfileFeature,
    LawyerDashboardSettingsFeature,
} from '@/app/components/lawyer/dashboard/createBootChromeFeatureStubs';

type LawyerDashboardSettingsProfileRuntimeProps = {
    shellAuthUserId: string | null;
    activeTab: LawyerDashboardTab;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    setShowCommunity: (open: boolean) => void;
    onReady: (next: {
        settings: LawyerDashboardSettingsFeature;
        profile: LawyerDashboardProfileFeature;
    }) => void;
};

/**
 * خطافا الإعدادات/الملف — خارج مقطع المنزل؛ يُركَّبان بعد first-tab.
 */
export function LawyerDashboardSettingsProfileRuntime({
    shellAuthUserId,
    activeTab,
    setActiveTab,
    setShowCommunity,
    onReady,
}: LawyerDashboardSettingsProfileRuntimeProps) {
    const settings = useLawyerDashboardSettings(shellAuthUserId);
    const profile = useLawyerDashboardProfileTab({
        userId: shellAuthUserId,
        activeTab,
        setActiveTab,
        setShowCommunity,
        closeSettings: settings.closeSettings,
    });
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;

    useLayoutEffect(() => {
        onReadyRef.current({ settings, profile });
    }, [
        profile.profileHostMounted,
        profile.profileOpenEpoch,
        settings.settingsHostMounted,
        settings.settingsSessionKey,
        settings.showSettings,
    ]);

    return null;
}
