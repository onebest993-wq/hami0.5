import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

export function appearanceKey(appearance: ProfilePageCustomization['appearance']): string {
    return [
        appearance.accentColor,
        appearance.material,
        appearance.portraitFrame ?? 'classic',
    ].join('|');
}

/** بصمة هيكل الكتل فقط — بلا محتوى النص (حتى لا نعيد رسم الملف عند كل حرف) */
export function blocksStructureKey(blocks: ProfilePageCustomization['customBlocks']): string {
    return blocks.map((b) => `${b.id}:${b.kind ?? ''}`).join('|');
}

export function privacyDiff(prev: ProfilePageCustomization, next: ProfilePageCustomization): boolean {
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

export function resolveDisplayCustomization(args: {
    customization: ProfilePageCustomization;
    previewCustomization: ProfilePageCustomization;
    isEditing: boolean;
    settingsOpen: boolean;
}): ProfilePageCustomization {
    const { customization, previewCustomization, isEditing, settingsOpen } = args;
    if (settingsOpen) return previewCustomization;
    if (isEditing) {
        return {
            ...customization,
            customBlocks: previewCustomization.customBlocks,
        };
    }
    return customization;
}
