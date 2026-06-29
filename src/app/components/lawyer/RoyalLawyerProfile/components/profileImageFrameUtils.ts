import type { ProfileCustomBlock, ProfileImageFrameStyle } from '@/app/services/profile/profilePageCustomization';
import { resolveImageFrameStyle } from '@/app/services/profile/profilePageCustomization';

export function patchImageFrameStyle(
    block: ProfileCustomBlock,
    patch: Partial<ProfileImageFrameStyle>,
    onChange: (p: Partial<ProfileCustomBlock>) => void,
) {
    onChange({
        imageFrameStyle: { ...resolveImageFrameStyle(block), ...patch },
    });
}
