import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { uploadProfileMedia, profileMediaErrorMessage } from '@/app/services/profileMediaService';
import { discardUnsavedMediaPath } from '@/app/services/profile/editDraftMediaPaths';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    shouldApplyProfileBlockUpload,
    type ProfileBlockUploadGate,
} from '@/app/components/lawyer/RoyalLawyerProfile/hooks/profileBlockUploadFlow';

export async function uploadProfileCanvasBackground(args: {
    userId: string;
    file: File;
    blockId: string;
    previousPath: string | undefined;
    committedPath: string | undefined;
    gate: Omit<ProfileBlockUploadGate, 'draftBlocks'> & {
        getDraftBlocks: () => ProfileCustomBlock[];
    };
    apply: (displayUrl: string, storagePath?: string) => void;
}): Promise<void> {
    const { userId, file, blockId, previousPath, committedPath, gate, apply } = args;
    try {
        const res = await uploadProfileMedia(userId, file, { variant: 'canvasBg' });
        if (
            !shouldApplyProfileBlockUpload(
                { ...gate, draftBlocks: gate.getDraftBlocks() },
                blockId,
                res.storagePath,
            )
        ) {
            return;
        }
        apply(res.displayUrl, res.storagePath);
        discardUnsavedMediaPath(previousPath, committedPath);
        SmartToast.success('تم رفع خلفية اللوحة');
    } catch (err) {
        if (gate.uploadGen === gate.genRef.current) {
            SmartToast.error(profileMediaErrorMessage(err));
        }
    }
}
