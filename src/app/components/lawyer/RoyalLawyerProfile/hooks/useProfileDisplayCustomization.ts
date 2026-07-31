import { useCallback, useEffect, useLayoutEffect, useRef, useState, startTransition } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { applyProfileRootTheme } from '@/app/services/profile/profileThemeRuntime';

type UseProfileDisplayCustomizationArgs = {
    customization: ProfilePageCustomization;
    isEditing: boolean;
    settingsOpen: boolean;
    saveCustomization: (next: ProfilePageCustomization, options?: { silent?: boolean }) => Promise<boolean>;
    onPreviewCustomizationSync?: (next: ProfilePageCustomization | null) => void;
};

function appearanceKey(appearance: ProfilePageCustomization['appearance']): string {
    return [
        appearance.accentColor,
        appearance.material,
        appearance.portraitFrame ?? 'classic',
    ].join('|');
}

/** بصمة هيكل الكتل فقط — بلا محتوى النص (حتى لا نعيد رسم الملف عند كل حرف) */
function blocksStructureKey(blocks: ProfilePageCustomization['customBlocks']): string {
    return blocks.map((b) => `${b.id}:${b.kind ?? ''}`).join('|');
}

function privacyDiff(prev: ProfilePageCustomization, next: ProfilePageCustomization): boolean {
    return (
        prev.privacy.pageAccess !== next.privacy.pageAccess ||
        prev.privacy.showContactChannels !== next.privacy.showContactChannels ||
        prev.privacy.showGallery !== next.privacy.showGallery ||
        prev.privacy.showCustomBlocks !== next.privacy.showCustomBlocks ||
        prev.privacy.showPhoneMeta !== next.privacy.showPhoneMeta ||
        prev.privacy.showCityMeta !== next.privacy.showCityMeta ||
        prev.privacy.showSyndicate !== next.privacy.showSyndicate ||
        prev.privacy.hiddenContactIds.join('|') !== next.privacy.hiddenContactIds.join('|')
    );
}

export function useProfileDisplayCustomization({
    customization,
    isEditing,
    settingsOpen,
    saveCustomization,
    onPreviewCustomizationSync,
}: UseProfileDisplayCustomizationArgs) {
    const [previewCustomization, setPreviewCustomization] = useState(customization);
    const layoutSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wasEditingRef = useRef(isEditing);
    const wasSettingsOpenRef = useRef(settingsOpen);
    const lastThemeKeyRef = useRef<string | null>(null);
    const customizationRef = useRef(customization);
    customizationRef.current = customization;
    /** آخر مظهر من مسودة الاستوديو — يُحفظ حتى لو تخطّينا setState للمظهر فقط */
    const studioAppearanceRef = useRef(customization.appearance);
    const previewRef = useRef(previewCustomization);
    previewRef.current = previewCustomization;

    /**
     * التعديل: الهيكل/المظهر المحفوظ + تخطيط الكتل من المعاينة (السحب).
     * الاستوديو: معاينة كاملة.
     */
    const displayCustomization =
        settingsOpen
            ? previewCustomization
            : isEditing
              ? {
                    ...customization,
                    customBlocks: previewCustomization.customBlocks,
                }
              : customization;

    const applyTheme = useCallback((appearance: ProfilePageCustomization['appearance']) => {
        const key = appearanceKey(appearance);
        if (lastThemeKeyRef.current === key) return;
        lastThemeKeyRef.current = key;
        applyProfileRootTheme(appearance);
    }, []);

    useLayoutEffect(() => {
        if (isEditing && !wasEditingRef.current) {
            /* افرغ debounce التخطيط قبل الدخول للتحرير حتى لا تُفقد المواضع */
            if (layoutSaveRef.current) {
                clearTimeout(layoutSaveRef.current);
                layoutSaveRef.current = null;
                const flushed = {
                    ...customizationRef.current,
                    customBlocks: previewRef.current.customBlocks,
                };
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
    }, [isEditing, applyTheme, saveCustomization, onPreviewCustomizationSync]);

    useLayoutEffect(() => {
        if (!settingsOpen && wasSettingsOpenRef.current) {
            const committed = customizationRef.current;
            setPreviewCustomization(committed);
            studioAppearanceRef.current = committed.appearance;
            applyTheme(committed.appearance);
        }
        if (settingsOpen && !wasSettingsOpenRef.current) {
            /* افرغ debounce التخطيط قبل فتح الاستوديو حتى لا تُفقد المواضع */
            if (layoutSaveRef.current) {
                clearTimeout(layoutSaveRef.current);
                layoutSaveRef.current = null;
                const flushed = {
                    ...customizationRef.current,
                    customBlocks: previewRef.current.customBlocks,
                };
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
    }, [settingsOpen, applyTheme, saveCustomization]);

    useEffect(() => {
        if (settingsOpen || isEditing) return;
        setPreviewCustomization(customization);
        studioAppearanceRef.current = customization.appearance;
        applyTheme(customization.appearance);
    }, [customization, settingsOpen, isEditing, applyTheme]);

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
        [settingsOpen, isEditing, saveCustomization, onPreviewCustomizationSync],
    );

    return {
        displayCustomization,
        previewCustomization,
        handleSettingsDraftChange,
        handleSettingsSave,
        handleBlocksLayoutChange,
    };
}
