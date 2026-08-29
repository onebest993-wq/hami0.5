import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { useProfileSettingsBlockImageUpload } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsBlockImageUpload';
import { useProfileSettingsCanvasBgUpload } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsCanvasBgUpload';
import { useCallback } from 'react';

type UseProfileSettingsBlockUploadsArgs = {
    userId: string;
    isOwnProfile: boolean;
    open: boolean;
    saving?: boolean;
    draft: ProfilePageCustomization;
    baseline: ProfilePageCustomization;
    setDraft: React.Dispatch<React.SetStateAction<ProfilePageCustomization>>;
    updateBlock: (id: string, patch: Partial<ProfileCustomBlock>) => void;
    getExpandedBlockId?: () => string | null;
};

/** تركيب رفع صورة الكتلة + خلفية اللوحة */
export function useProfileSettingsBlockUploads(args: UseProfileSettingsBlockUploadsArgs) {
    const image = useProfileSettingsBlockImageUpload(args);
    const canvas = useProfileSettingsCanvasBgUpload(args);

    const invalidateUploadsForBlock = useCallback(
        (id: string) => {
            image.invalidateImageUploadForBlock(id);
            canvas.invalidateCanvasUploadForBlock(id);
        },
        [image.invalidateImageUploadForBlock, canvas.invalidateCanvasUploadForBlock],
    );

    return {
        uploadingBlockId: image.uploadingBlockId,
        uploadingCanvasBlockId: canvas.uploadingCanvasBlockId,
        fileRef: image.fileRef,
        canvasFileRef: canvas.canvasFileRef,
        triggerBlockImage: image.triggerBlockImage,
        onBlockImageSelected: image.onBlockImageSelected,
        triggerCanvasBg: canvas.triggerCanvasBg,
        onCanvasBgSelected: canvas.onCanvasBgSelected,
        canvasBgEditor: canvas.canvasBgEditor,
        cancelCanvasBgEditor: canvas.cancelCanvasBgEditor,
        confirmCanvasBgEditor: canvas.confirmCanvasBgEditor,
        invalidateUploadsForBlock,
    };
}
