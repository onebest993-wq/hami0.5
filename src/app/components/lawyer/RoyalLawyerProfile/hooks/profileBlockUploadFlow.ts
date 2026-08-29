import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { resolveProfileBlockKind } from '@/app/services/profile/profilePageLayout';
import { uploadProfileMedia, profileMediaErrorMessage } from '@/app/services/profileMediaService';
import { discardUnsavedMediaPath } from '@/app/services/profile/editDraftMediaPaths';
import { SmartToast } from '@/app/components/ui/SmartToast';

export type ProfileBlockUploadGate = {
    uploadGen: number;
    genRef: { current: number };
    requestUserId: string;
    userIdRef: { current: string };
    openRef: { current: boolean };
    isOwnProfileRef: { current: boolean };
    draftBlocks: ProfileCustomBlock[];
};

/** بعد اكتمال الرفع: هل ما زالت الجلسة صالحة لتطبيق النتيجة؟ */
export function shouldApplyProfileBlockUpload(
    gate: ProfileBlockUploadGate,
    blockId: string,
    storagePath: string | undefined,
): boolean {
    if (
        gate.uploadGen !== gate.genRef.current ||
        gate.requestUserId !== gate.userIdRef.current ||
        !gate.openRef.current ||
        !gate.isOwnProfileRef.current
    ) {
        if (storagePath) discardUnsavedMediaPath(storagePath, undefined);
        return false;
    }
    if (!gate.draftBlocks.some((b) => b.id === blockId)) {
        if (storagePath) discardUnsavedMediaPath(storagePath, undefined);
        return false;
    }
    return true;
}

/** هدف رفع صورة الكتلة: المعلّق من الزر، وإلا الكتلة المفتوحة إن كانت صورة */
export function resolveProfileBlockImageUploadTarget(
    pendingId: string | null,
    expandedId: string | null,
    blocks: ProfileCustomBlock[],
): string | null {
    if (pendingId && blocks.some((block) => block.id === pendingId)) return pendingId;
    if (!expandedId) return null;
    const expanded = blocks.find((block) => block.id === expandedId);
    if (!expanded || resolveProfileBlockKind(expanded) !== 'image') return null;
    return expandedId;
}

export async function uploadProfileBlockImage(args: {
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
        const res = await uploadProfileMedia(userId, file);
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
        SmartToast.success('تم رفع الصورة');
    } catch (err) {
        if (gate.uploadGen === gate.genRef.current) {
            SmartToast.error(profileMediaErrorMessage(err));
        }
    }
}

export function validateCanvasBackgroundFile(file: File): string | null {
    const mime = (file.type || '').toLowerCase();
    if (!mime.startsWith('image/') || mime.includes('svg')) {
        return 'يرجى اختيار صورة JPG أو PNG أو WebP';
    }
    if (file.size > 12 * 1024 * 1024) {
        return 'الصورة كبيرة جداً — الحد 12 ميغابايت';
    }
    return null;
}
