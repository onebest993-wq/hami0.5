import { useCallback, useRef, useState, startTransition } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { applyProfileRootTheme } from '@/app/services/profile/profileThemeRuntime';
import {
    appearanceKey,
    blocksStructureKey,
    privacyDiff,
    resolveDisplayCustomization,
} from '@/app/services/profile/profileDisplayCustomizationKeys';
import { useProfileBlocksLayoutDebounce } from './useProfileBlocksLayoutDebounce';
import { useProfileDisplayPreviewSync } from './useProfileDisplayPreviewSync';

type UseProfileDisplayCustomizationArgs = {
    customization: ProfilePageCustomization;
    isEditing: boolean;
    settingsOpen: boolean;
    saveCustomization: (
        next: ProfilePageCustomization,
        options?: { silent?: boolean },
    ) => Promise<boolean>;
    onPreviewCustomizationSync?: (next: ProfilePageCustomization | null) => void;
};

export function useProfileDisplayCustomization({
    customization,
    isEditing,
    settingsOpen,
    saveCustomization,
    onPreviewCustomizationSync,
}: UseProfileDisplayCustomizationArgs) {
    const [previewCustomization, setPreviewCustomization] = useState(customization);
    const lastThemeKeyRef = useRef<string | null>(null);
    const customizationRef = useRef(customization);
    customizationRef.current = customization;
    /** آخر مظهر من مسودة الاستوديو — يُحفظ حتى لو تخطّينا setState للمظهر فقط */
    const studioAppearanceRef = useRef(customization.appearance);
    const previewRef = useRef(previewCustomization);
    previewRef.current = previewCustomization;

    const displayCustomization = resolveDisplayCustomization({
        customization,
        previewCustomization,
        isEditing,
        settingsOpen,
    });

    const applyTheme = useCallback((appearance: ProfilePageCustomization['appearance']) => {
        const key = appearanceKey(appearance);
        if (lastThemeKeyRef.current === key) return;
        lastThemeKeyRef.current = key;
        applyProfileRootTheme(appearance);
    }, []);

    const { consumePendingLayoutFlush, handleBlocksLayoutChange } = useProfileBlocksLayoutDebounce({
        customizationRef,
        previewRef,
        setPreviewCustomization,
        settingsOpen,
        isEditing,
        saveCustomization,
        onPreviewCustomizationSync,
    });

    useProfileDisplayPreviewSync({
        customization,
        isEditing,
        settingsOpen,
        customizationRef,
        previewRef,
        studioAppearanceRef,
        setPreviewCustomization,
        applyTheme,
        saveCustomization,
        onPreviewCustomizationSync,
        consumePendingLayoutFlush,
    });

    const handleSettingsDraftChange = useCallback(
        (nextDraft: ProfilePageCustomization) => {
            studioAppearanceRef.current = nextDraft.appearance;
            const nextKey = appearanceKey(nextDraft.appearance);
            if (lastThemeKeyRef.current !== nextKey) {
                lastThemeKeyRef.current = nextKey;
                applyProfileRootTheme(nextDraft.appearance);
            }

            if (!settingsOpen) {
                setPreviewCustomization(nextDraft);
                return;
            }

            const prev = previewRef.current;
            const appearanceChanged = appearanceKey(prev.appearance) !== nextKey;
            const privacyChangedNow = privacyDiff(prev, nextDraft);
            const structureChanged =
                blocksStructureKey(prev.customBlocks) !== blocksStructureKey(nextDraft.customBlocks);

            /* مظهر فقط → ثيم DOM + مزامنة appearance في React (ornate/إطار يعتمد على state) */
            if (appearanceChanged && !privacyChangedNow && !structureChanged) {
                startTransition(() => {
                    setPreviewCustomization({
                        ...prev,
                        appearance: nextDraft.appearance,
                    });
                });
                return;
            }

            if (!appearanceChanged && !privacyChangedNow && !structureChanged) return;

            startTransition(() => {
                setPreviewCustomization({
                    ...prev,
                    appearance: nextDraft.appearance,
                    privacy: nextDraft.privacy,
                    ...(structureChanged ? { customBlocks: nextDraft.customBlocks } : null),
                });
            });
        },
        [settingsOpen],
    );

    const handleSettingsSave = useCallback(
        async (
            next: ProfilePageCustomization,
            options?: { silent?: boolean },
        ): Promise<boolean> => {
            const merged: ProfilePageCustomization = {
                ...next,
                appearance: next.appearance ?? studioAppearanceRef.current,
            };
            setPreviewCustomization(merged);
            applyTheme(merged.appearance);
            return saveCustomization(merged, options);
        },
        [saveCustomization, applyTheme],
    );

    return {
        displayCustomization,
        previewCustomization,
        handleSettingsDraftChange,
        handleSettingsSave,
        handleBlocksLayoutChange,
    };
}
