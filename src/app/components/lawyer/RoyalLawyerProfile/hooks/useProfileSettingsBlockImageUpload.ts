import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import {
    resolveProfileBlockImageUploadTarget,
    uploadProfileBlockImage,
} from '@/app/components/lawyer/RoyalLawyerProfile/hooks/profileBlockUploadFlow';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';

type Args = {
    userId: string;
    isOwnProfile: boolean;
    open: boolean;
    saving?: boolean;
    draft: ProfilePageCustomization;
    baseline: ProfilePageCustomization;
    updateBlock: (id: string, patch: Partial<ProfileCustomBlock>) => void;
    getExpandedBlockId?: () => string | null;
};

/** رفع صورة كتلة مخصصة فقط */
export function useProfileSettingsBlockImageUpload({
    userId,
    isOwnProfile,
    open,
    saving = false,
    draft,
    baseline,
    updateBlock,
    getExpandedBlockId,
}: Args) {
    const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const pendingBlockIdRef = useRef<string | null>(null);
    const getExpandedBlockIdRef = useRef(getExpandedBlockId);
    getExpandedBlockIdRef.current = getExpandedBlockId;
    const imageUploadGenRef = useRef(0);
    const uploadingBlockIdRef = useRef<string | null>(null);
    const openRef = useRef(open);
    const userIdRef = useRef(userId);
    const isOwnProfileRef = useRef(isOwnProfile);
    const draftRef = useRef(draft);
    openRef.current = open;
    userIdRef.current = userId;
    isOwnProfileRef.current = isOwnProfile;
    draftRef.current = draft;

    useEffect(() => {
        if (!open || saving) {
            imageUploadGenRef.current += 1;
            uploadingBlockIdRef.current = null;
            setUploadingBlockId(null);
            pendingBlockIdRef.current = null;
        }
    }, [open, saving]);

    const invalidateImageUploadForBlock = useCallback((id: string) => {
        if (pendingBlockIdRef.current === id) pendingBlockIdRef.current = null;
        if (uploadingBlockIdRef.current === id) {
            imageUploadGenRef.current += 1;
            uploadingBlockIdRef.current = null;
            setUploadingBlockId(null);
        }
    }, []);

    const triggerBlockImage = useCallback((blockId: string) => {
        pendingBlockIdRef.current = blockId;
        fileRef.current?.click();
    }, []);

    const onBlockImageSelected = useCallback(
        async (file: File) => {
            if (!isOwnProfile || !openRef.current || saving) return;
            const blockId = resolveProfileBlockImageUploadTarget(
                pendingBlockIdRef.current,
                getExpandedBlockIdRef.current?.() ?? null,
                draftRef.current.customBlocks,
            );
            if (!blockId) return;
            pendingBlockIdRef.current = null;
            const requestUserId = userId;
            const uploadGen = ++imageUploadGenRef.current;
            uploadingBlockIdRef.current = blockId;
            setUploadingBlockId(blockId);
            const previousPath = draftRef.current.customBlocks
                .find((b) => b.id === blockId)
                ?.imageStoragePath?.trim();
            const committedPath = baseline.customBlocks
                .find((b) => b.id === blockId)
                ?.imageStoragePath?.trim();
            try {
                await uploadProfileBlockImage({
                    userId: requestUserId,
                    file,
                    blockId,
                    previousPath,
                    committedPath,
                    gate: {
                        uploadGen,
                        genRef: imageUploadGenRef,
                        requestUserId,
                        userIdRef,
                        openRef,
                        isOwnProfileRef,
                        getDraftBlocks: () => draftRef.current.customBlocks,
                    },
                    apply: (displayUrl, storagePath) =>
                        updateBlock(blockId, { imageUrl: displayUrl, imageStoragePath: storagePath }),
                });
            } finally {
                if (uploadGen === imageUploadGenRef.current) {
                    uploadingBlockIdRef.current = null;
                    setUploadingBlockId(null);
                }
            }
        },
        [isOwnProfile, userId, updateBlock, draft.customBlocks, baseline.customBlocks, saving],
    );

    return {
        uploadingBlockId,
        fileRef,
        triggerBlockImage,
        onBlockImageSelected,
        invalidateImageUploadForBlock,
    };
}
