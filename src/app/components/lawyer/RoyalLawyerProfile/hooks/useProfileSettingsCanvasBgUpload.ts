import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { applyCanvasBackgroundToBlock } from '@/app/services/profile/profileCustomBlockMutations';
import { prefetchProfileCanvasBackgroundEditor } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileCanvasBackgroundEditorChunk';
import { validateCanvasBackgroundFile } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/profileBlockUploadFlow';
import { uploadProfileCanvasBackground } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/profileCanvasBackgroundUpload';
import { SmartToast } from '@/app/components/ui/SmartToast';

type Args = {
    userId: string;
    isOwnProfile: boolean;
    open: boolean;
    saving?: boolean;
    draft: ProfilePageCustomization;
    baseline: ProfilePageCustomization;
    setDraft: React.Dispatch<React.SetStateAction<ProfilePageCustomization>>;
};

/** رفع خلفية لوحة النص + محرّر الاقتصاص */
export function useProfileSettingsCanvasBgUpload({
    userId,
    isOwnProfile,
    open,
    saving = false,
    draft,
    baseline,
    setDraft,
}: Args) {
    const [uploadingCanvasBlockId, setUploadingCanvasBlockId] = useState<string | null>(null);
    const [canvasBgEditor, setCanvasBgEditor] = useState<{ file: File; blockId: string } | null>(
        null,
    );
    const canvasFileRef = useRef<HTMLInputElement>(null);
    const pendingCanvasBlockIdRef = useRef<string | null>(null);
    const canvasUploadGenRef = useRef(0);
    const uploadingCanvasBlockIdRef = useRef<string | null>(null);
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
            canvasUploadGenRef.current += 1;
            uploadingCanvasBlockIdRef.current = null;
            setUploadingCanvasBlockId(null);
            pendingCanvasBlockIdRef.current = null;
        }
    }, [open, saving]);

    const invalidateCanvasUploadForBlock = useCallback((id: string) => {
        if (pendingCanvasBlockIdRef.current === id) pendingCanvasBlockIdRef.current = null;
        if (uploadingCanvasBlockIdRef.current === id) {
            canvasUploadGenRef.current += 1;
            uploadingCanvasBlockIdRef.current = null;
            setUploadingCanvasBlockId(null);
        }
    }, []);

    const uploadCanvasBackground = useCallback(
        async (blockId: string, file: File) => {
            if (!isOwnProfile || !openRef.current || saving) return;
            const requestUserId = userId;
            const uploadGen = ++canvasUploadGenRef.current;
            uploadingCanvasBlockIdRef.current = blockId;
            setUploadingCanvasBlockId(blockId);
            const previousPath = draft.customBlocks
                .find((b) => b.id === blockId)
                ?.canvasStyle?.backgroundStoragePath?.trim();
            const committedPath = baseline.customBlocks
                .find((b) => b.id === blockId)
                ?.canvasStyle?.backgroundStoragePath?.trim();
            try {
                await uploadProfileCanvasBackground({
                    userId: requestUserId,
                    file,
                    blockId,
                    previousPath,
                    committedPath,
                    gate: {
                        uploadGen,
                        genRef: canvasUploadGenRef,
                        requestUserId,
                        userIdRef,
                        openRef,
                        isOwnProfileRef,
                        getDraftBlocks: () => draftRef.current.customBlocks,
                    },
                    apply: (displayUrl, storagePath) => {
                        setDraft((prev) => ({
                            ...prev,
                            customBlocks: prev.customBlocks.map((b) =>
                                b.id === blockId
                                    ? applyCanvasBackgroundToBlock(b, displayUrl, storagePath)
                                    : b,
                            ),
                        }));
                    },
                });
            } finally {
                if (uploadGen === canvasUploadGenRef.current) {
                    uploadingCanvasBlockIdRef.current = null;
                    setUploadingCanvasBlockId(null);
                }
            }
        },
        [isOwnProfile, userId, setDraft, draft.customBlocks, baseline.customBlocks, saving],
    );

    const triggerCanvasBg = useCallback((blockId: string) => {
        prefetchProfileCanvasBackgroundEditor();
        pendingCanvasBlockIdRef.current = blockId;
        canvasFileRef.current?.click();
    }, []);

    const onCanvasBgSelected = useCallback(
        async (file: File) => {
            if (!isOwnProfile || !openRef.current || saving) return;
            const blockId = pendingCanvasBlockIdRef.current;
            if (!blockId) return;
            pendingCanvasBlockIdRef.current = null;
            const invalid = validateCanvasBackgroundFile(file);
            if (invalid) {
                SmartToast.warning(invalid);
                return;
            }
            setCanvasBgEditor({ file, blockId });
        },
        [isOwnProfile, saving],
    );

    const cancelCanvasBgEditor = useCallback(() => {
        setCanvasBgEditor(null);
        pendingCanvasBlockIdRef.current = null;
        if (canvasFileRef.current) canvasFileRef.current.value = '';
    }, []);

    const confirmCanvasBgEditor = useCallback(
        async (file: File) => {
            const blockId = canvasBgEditor?.blockId;
            setCanvasBgEditor(null);
            if (canvasFileRef.current) canvasFileRef.current.value = '';
            if (!blockId) return;
            await uploadCanvasBackground(blockId, file);
        },
        [canvasBgEditor?.blockId, uploadCanvasBackground],
    );

    return {
        uploadingCanvasBlockId,
        canvasFileRef,
        triggerCanvasBg,
        onCanvasBgSelected,
        canvasBgEditor,
        cancelCanvasBgEditor,
        confirmCanvasBgEditor,
        invalidateCanvasUploadForBlock,
    };
}
