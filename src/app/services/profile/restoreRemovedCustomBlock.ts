import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

/** يعيد كتلة محذوفة إلى المسودة الحالية دون مسح تعديلات متزامنة أخرى */
export function restoreRemovedCustomBlock(
    current: ProfilePageCustomization,
    previous: ProfilePageCustomization,
    blockId: string,
): ProfilePageCustomization {
    if (current.customBlocks.some((block) => block.id === blockId)) return current;
    const removed = previous.customBlocks.find((block) => block.id === blockId);
    if (!removed) return current;
    const at = previous.customBlocks.findIndex((block) => block.id === blockId);
    const customBlocks = [...current.customBlocks];
    const insertAt = Math.min(Math.max(at < 0 ? customBlocks.length : at, 0), customBlocks.length);
    customBlocks.splice(insertAt, 0, removed);
    return { ...current, customBlocks };
}
