import { useCallback, useEffect, useRef, useState } from 'react';
import {
    defaultProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';

export function useProfileSettingsDraft(
    open: boolean,
    customization: ProfilePageCustomization,
    onDraftChange?: (draft: ProfilePageCustomization) => void,
) {
    const [draft, setDraft] = useState<ProfilePageCustomization>(defaultProfilePageCustomization());
    const skipDraftNotifyRef = useRef(false);
    const customizationRef = useRef(customization);
    customizationRef.current = customization;

    useEffect(() => {
        if (!open) return;
        const nextCustomization = customizationRef.current;
        skipDraftNotifyRef.current = true;
        setDraft({
            ...nextCustomization,
            privacy: {
                ...nextCustomization.privacy,
                hiddenContactIds: [...nextCustomization.privacy.hiddenContactIds],
            },
            customBlocks: nextCustomization.customBlocks.map((b) => ({ ...b })),
        });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (skipDraftNotifyRef.current) {
            skipDraftNotifyRef.current = false;
            return;
        }
        onDraftChange?.(draft);
    }, [draft, open, onDraftChange]);

    const patchDraft = useCallback(
        (updater: (prev: ProfilePageCustomization) => ProfilePageCustomization) => {
            setDraft(updater);
        },
        [],
    );

    const toggleContactVisibility = useCallback((actionId: string, hidden: boolean) => {
        setDraft((prev) => {
            const hiddenSet = new Set(prev.privacy.hiddenContactIds);
            if (hidden) hiddenSet.delete(actionId);
            else hiddenSet.add(actionId);
            return {
                ...prev,
                privacy: { ...prev.privacy, hiddenContactIds: [...hiddenSet] },
            };
        });
    }, []);

    return { draft, setDraft, patchDraft, toggleContactVisibility };
}
