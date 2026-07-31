import { useEffect, useState } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { useProfileSettingsDraft } from './useProfileSettingsDraft';
import { useProfileSettingsBlockOps } from './useProfileSettingsBlockOps';

export type ProfileSettingsTab = 'appearance' | 'containers';
export type ContainerKindTab = 'text' | 'image';

export function useProfileSettingsSheetState(
    open: boolean,
    customization: ProfilePageCustomization,
    userId: string,
    onDraftChange?: (draft: ProfilePageCustomization) => void,
    options?: { isOwnProfile?: boolean; saving?: boolean },
) {
    const isOwnProfile = options?.isOwnProfile !== false;
    const saving = options?.saving === true;
    const [tab, setTab] = useState<ProfileSettingsTab>('appearance');
    const { draft, setDraft, patchDraft } = useProfileSettingsDraft(open, customization, onDraftChange);
    const blockOps = useProfileSettingsBlockOps({
        userId,
        isOwnProfile,
        open,
        saving,
        draft,
        baseline: customization,
        setDraft,
        setTab,
    });
    const { setExpandedBlockId } = blockOps;

    useEffect(() => {
        if (!open) return;
        setTab('appearance');
        setExpandedBlockId(null);
    }, [open, setExpandedBlockId]);

    return {
        tab,
        setTab,
        draft,
        setDraft,
        patchDraft,
        ...blockOps,
    };
}
