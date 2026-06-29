import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { applyProfileRootTheme } from '@/app/services/profile/profileThemeRuntime';
type UseProfileDisplayCustomizationArgs = {
    customization: ProfilePageCustomization;
    isEditing: boolean;
    settingsOpen: boolean;
    saveCustomization: (next: ProfilePageCustomization, options?: { silent?: boolean }) => Promise<boolean>;
};

export function useProfileDisplayCustomization({
    customization,
    isEditing,
    settingsOpen,
    saveCustomization,
}: UseProfileDisplayCustomizationArgs) {
    const [previewCustomization, setPreviewCustomization] = useState(customization);
    const draftDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const layoutSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wasEditingRef = useRef(isEditing);

    useEffect(() => {
        if (!settingsOpen && !isEditing) {
            setPreviewCustomization(customization);
        }
    }, [settingsOpen, isEditing, customization]);

    useEffect(() => {
        if (isEditing && !wasEditingRef.current) {
            setPreviewCustomization(customization);
        }
        if (!isEditing && wasEditingRef.current && !settingsOpen) {
            setPreviewCustomization(customization);
        }
        wasEditingRef.current = isEditing;
    }, [isEditing, customization, settingsOpen]);

    const displayCustomization = settingsOpen || isEditing ? previewCustomization : customization;

    useEffect(() => {
        applyProfileRootTheme(displayCustomization.appearance);
    }, [displayCustomization.appearance.accentColor, displayCustomization.appearance.material]);
    useEffect(
        () => () => {
            if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
            if (layoutSaveRef.current) clearTimeout(layoutSaveRef.current);
        },
        [],
    );

    useEffect(() => {
        if (isEditing || settingsOpen) {
            if (layoutSaveRef.current) {
                clearTimeout(layoutSaveRef.current);
                layoutSaveRef.current = null;
            }
        }
    }, [isEditing, settingsOpen]);

    const handleSettingsDraftChange = useCallback((nextDraft: ProfilePageCustomization) => {
        applyProfileRootTheme(nextDraft.appearance);
        if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
        draftDebounceRef.current = setTimeout(() => {
            setPreviewCustomization(nextDraft);
        }, 200);
    }, []);
    const handleSettingsSave = useCallback(
        async (next: ProfilePageCustomization): Promise<boolean> => {
            if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
            setPreviewCustomization(next);
            return saveCustomization(next);
        },
        [saveCustomization],
    );

    const handleBlocksLayoutChange = useCallback(
        (blocks: ProfilePageCustomization['customBlocks']) => {
            if (settingsOpen || isEditing) {
                setPreviewCustomization((prev) => ({ ...prev, customBlocks: blocks }));
                return;
            }
            const next = { ...customization, customBlocks: blocks };
            setPreviewCustomization(next);
            if (layoutSaveRef.current) clearTimeout(layoutSaveRef.current);
            layoutSaveRef.current = setTimeout(() => {
                void saveCustomization(next, { silent: true });
            }, 500);
        },
        [settingsOpen, isEditing, customization, saveCustomization],
    );

    return {
        displayCustomization,
        previewCustomization,
        handleSettingsDraftChange,
        handleSettingsSave,
        handleBlocksLayoutChange,
    };
}
