import { useEffect, useLayoutEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { scheduleProfileRootTheme } from '@/app/services/profile/profileThemeRuntime';

type UseProfileDisplayPreviewSyncArgs = {
    customization: ProfilePageCustomization;
    isEditing: boolean;
    settingsOpen: boolean;
    customizationRef: MutableRefObject<ProfilePageCustomization>;
    previewRef: MutableRefObject<ProfilePageCustomization>;
    studioAppearanceRef: MutableRefObject<ProfilePageCustomization['appearance']>;
    setPreviewCustomization: Dispatch<SetStateAction<ProfilePageCustomization>>;
    applyTheme: (appearance: ProfilePageCustomization['appearance']) => void;
    saveCustomization: (
        next: ProfilePageCustomization,
        options?: { silent?: boolean },
    ) => Promise<boolean>;
    onPreviewCustomizationSync?: (next: ProfilePageCustomization | null) => void;
    consumePendingLayoutFlush: () => ProfilePageCustomization | null;
};

export function useProfileDisplayPreviewSync({
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
}: UseProfileDisplayPreviewSyncArgs) {
    const wasEditingRef = useRef(isEditing);
    const wasSettingsOpenRef = useRef(settingsOpen);

    useLayoutEffect(() => {
        if (isEditing && !wasEditingRef.current) {
            /* افرغ debounce التخطيط قبل الدخول للتحرير حتى لا تُفقد المواضع */
            const flushed = consumePendingLayoutFlush();
            if (flushed) {
                setPreviewCustomization(flushed);
                previewRef.current = flushed;
                onPreviewCustomizationSync?.(flushed);
                void saveCustomization(flushed, { silent: true });
            } else {
                const committed = customizationRef.current;
                setPreviewCustomization(committed);
                studioAppearanceRef.current = committed.appearance;
                applyTheme(committed.appearance);
                onPreviewCustomizationSync?.(committed);
            }
        }
        if (!isEditing && wasEditingRef.current) {
            onPreviewCustomizationSync?.(null);
        }
        wasEditingRef.current = isEditing;
    }, [
        isEditing,
        applyTheme,
        saveCustomization,
        onPreviewCustomizationSync,
        consumePendingLayoutFlush,
        customizationRef,
        previewRef,
        studioAppearanceRef,
        setPreviewCustomization,
    ]);

    useLayoutEffect(() => {
        if (!settingsOpen && wasSettingsOpenRef.current) {
            const committed = customizationRef.current;
            setPreviewCustomization(committed);
            studioAppearanceRef.current = committed.appearance;
            scheduleProfileRootTheme(committed.appearance);
        }
        if (settingsOpen && !wasSettingsOpenRef.current) {
            /* افرغ debounce التخطيط قبل فتح الاستوديو حتى لا تُفقد المواضع */
            const flushed = consumePendingLayoutFlush();
            if (flushed) {
                setPreviewCustomization(flushed);
                previewRef.current = flushed;
                studioAppearanceRef.current = flushed.appearance;
                applyTheme(flushed.appearance);
                void saveCustomization(flushed, { silent: true });
            } else {
                const committed = customizationRef.current;
                setPreviewCustomization(committed);
                studioAppearanceRef.current = committed.appearance;
                applyTheme(committed.appearance);
            }
        }
        wasSettingsOpenRef.current = settingsOpen;
    }, [
        settingsOpen,
        applyTheme,
        saveCustomization,
        consumePendingLayoutFlush,
        customizationRef,
        previewRef,
        studioAppearanceRef,
        setPreviewCustomization,
    ]);

    useEffect(() => {
        if (settingsOpen || isEditing) return;
        setPreviewCustomization(customization);
        studioAppearanceRef.current = customization.appearance;
        applyTheme(customization.appearance);
    }, [
        customization,
        settingsOpen,
        isEditing,
        applyTheme,
        setPreviewCustomization,
        studioAppearanceRef,
    ]);
}
