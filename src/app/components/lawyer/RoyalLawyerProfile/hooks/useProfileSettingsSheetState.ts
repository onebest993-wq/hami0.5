import { useEffect, useState } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { useProfileSettingsDraft } from './useProfileSettingsDraft';
import { useProfileSettingsRandomAppearance } from './useProfileSettingsRandomAppearance';
import { useProfileSettingsBlockOps } from './useProfileSettingsBlockOps';

export type ProfileSettingsTab = 'privacy' | 'appearance' | 'containers';
export type ContainerKindTab = 'text' | 'image';

export function useProfileSettingsSheetState(
    open: boolean,
    customization: ProfilePageCustomization,
    userId: string,
    onDraftChange?: (draft: ProfilePageCustomization) => void,
) {
    const [tab, setTab] = useState<ProfileSettingsTab>('privacy');
    const { draft, setDraft, patchDraft, toggleContactVisibility } = useProfileSettingsDraft(
        open,
        customization,
        onDraftChange,
    );
    const { randomDisabled, randomCooldownSec, handleRandomAppearance } = useProfileSettingsRandomAppearance(
        open,
        setDraft,
    );
    const blockOps = useProfileSettingsBlockOps({ userId, isOwnProfile: true, draft, setDraft, setTab });
    const { setExpandedBlockId } = blockOps;

    useEffect(() => {
        if (!open) return;
        setTab('privacy');
        setExpandedBlockId(null);
    }, [open, setExpandedBlockId]);

    return {
        tab,
        setTab,
        draft,
        patchDraft,
        toggleContactVisibility,
        randomDisabled,
        randomCooldownSec,
        handleRandomAppearance,
        ...blockOps,
    };
}
