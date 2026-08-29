import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

type UseProfileBlocksLayoutDebounceArgs = {
    customizationRef: MutableRefObject<ProfilePageCustomization>;
    previewRef: MutableRefObject<ProfilePageCustomization>;
    setPreviewCustomization: Dispatch<SetStateAction<ProfilePageCustomization>>;
    settingsOpen: boolean;
    isEditing: boolean;
    saveCustomization: (
        next: ProfilePageCustomization,
        options?: { silent?: boolean },
    ) => Promise<boolean>;
    onPreviewCustomizationSync?: (next: ProfilePageCustomization | null) => void;
};

export function useProfileBlocksLayoutDebounce({
    customizationRef,
    previewRef,
    setPreviewCustomization,
    settingsOpen,
    isEditing,
    saveCustomization,
    onPreviewCustomizationSync,
}: UseProfileBlocksLayoutDebounceArgs) {
    const layoutSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
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

    const consumePendingLayoutFlush = useCallback((): ProfilePageCustomization | null => {
        if (!layoutSaveRef.current) return null;
        clearTimeout(layoutSaveRef.current);
        layoutSaveRef.current = null;
        return {
            ...customizationRef.current,
            customBlocks: previewRef.current.customBlocks,
        };
    }, [customizationRef, previewRef]);

    const handleBlocksLayoutChange = useCallback(
        (blocks: ProfilePageCustomization['customBlocks']) => {
            if (settingsOpen || isEditing) {
                setPreviewCustomization((prev) => {
                    const next = { ...prev, customBlocks: blocks };
                    previewRef.current = next;
                    if (isEditing) onPreviewCustomizationSync?.(next);
                    return next;
                });
                return;
            }
            const next = { ...customizationRef.current, customBlocks: blocks };
            setPreviewCustomization(next);
            previewRef.current = next;
            if (layoutSaveRef.current) clearTimeout(layoutSaveRef.current);
            layoutSaveRef.current = setTimeout(() => {
                const latest = { ...customizationRef.current, customBlocks: blocks };
                void saveCustomization(latest, { silent: true });
            }, 500);
        },
        [
            settingsOpen,
            isEditing,
            saveCustomization,
            onPreviewCustomizationSync,
            customizationRef,
            previewRef,
            setPreviewCustomization,
        ],
    );

    return {
        consumePendingLayoutFlush,
        handleBlocksLayoutChange,
    };
}
