import { useCallback, useMemo, useRef, useState } from 'react';
import type { ProfileSettingsTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import type { ContainerKindTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import type {
    ProfileBlockKind,
    ProfileCustomBlock,
    ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import {
    defaultBlockLayout,
    defaultImageFrameStyle,
    defaultTextCanvasStyle,
    resolveProfileBlockKind,
    sortProfileCustomBlocks,
} from '@/app/services/profile/profilePageCustomization';
import { uploadProfileMedia, profileMediaErrorMessage } from '@/app/services/profileMediaService';
import { SmartToast } from '@/app/components/ui/SmartToast';

type BlockOpsArgs = {
    userId: string;
    isOwnProfile: boolean;
    draft: ProfilePageCustomization;
    setDraft: React.Dispatch<React.SetStateAction<ProfilePageCustomization>>;
    setTab: (tab: ProfileSettingsTab) => void;
};

export function useProfileSettingsBlockOps({ userId, isOwnProfile, draft, setDraft, setTab }: BlockOpsArgs) {
    const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
    const [uploadingCanvasBlockId, setUploadingCanvasBlockId] = useState<string | null>(null);
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
    const [containerKind, setContainerKind] = useState<ContainerKindTab>('text');
    const fileRef = useRef<HTMLInputElement>(null);
    const canvasFileRef = useRef<HTMLInputElement>(null);
    const pendingBlockIdRef = useRef<string | null>(null);
    const pendingCanvasBlockIdRef = useRef<string | null>(null);

    const updateBlock = useCallback(
        (id: string, patch: Partial<ProfileCustomBlock>) => {
            setDraft((prev) => ({
                ...prev,
                customBlocks: prev.customBlocks.map((b) => {
                    if (b.id !== id) return b;
                    const next: ProfileCustomBlock = { ...b, ...patch };
                    if (patch.imageFrameStyle) {
                        next.imageFrameStyle = {
                            ...b.imageFrameStyle,
                            ...patch.imageFrameStyle,
                        };
                    }
                    if (patch.canvasStyle) {
                        next.canvasStyle = { ...b.canvasStyle, ...patch.canvasStyle };
                    }
                    return next;
                }),
            }));
        },
        [setDraft],
    );

    const addBlock = useCallback(
        (kind: ProfileBlockKind) => {
            const newId = `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            setDraft((prev) => {
                const order = prev.customBlocks.length;
                const layout = defaultBlockLayout(order, kind);
                return {
                    ...prev,
                    customBlocks: [
                        ...prev.customBlocks,
                        {
                            id: newId,
                            kind,
                            title: kind === 'image' ? 'صورة' : 'نص حر',
                            shape: 'rounded',
                            width: kind === 'image' ? 'half' : 'full',
                            minHeightPx: kind === 'image' ? 120 : 80,
                            order,
                            mediaTemplate: kind === 'image' ? 'lens' : undefined,
                            imageHeightPx: 168,
                            imageFocusX: 50,
                            imageFocusY: 50,
                            imageZoom: 100,
                            imageFrameStyle: kind === 'image' ? defaultImageFrameStyle() : undefined,
                            posX: layout.posX,
                            posY: layout.posY,
                            blockWidthPct: layout.blockWidthPct,
                            body: kind === 'text' ? '' : undefined,
                            bodyStyle:
                                kind === 'text'
                                    ? {
                                          fontSize: 'lg',
                                          effect: 'none',
                                          align: 'right',
                                          color: '#ffffff',
                                          fontFamily: 'literary',
                                          lineHeight: 1.85,
                                          letterSpacing: 0.3,
                                      }
                                    : { fontSize: 'xs', effect: 'none', align: 'center', color: '#ffffff' },
                            lineStyles: kind === 'text' ? [] : undefined,
                            textSpans: kind === 'text' ? [] : undefined,
                            canvasStyle: kind === 'text' ? defaultTextCanvasStyle() : undefined,
                        },
                    ],
                };
            });
            setExpandedBlockId(newId);
            setContainerKind(kind);
            setTab('containers');
        },
        [setDraft, setTab],
    );

    const removeBlock = useCallback(
        (id: string) => {
            setDraft((prev) => ({
                ...prev,
                customBlocks: prev.customBlocks.filter((b) => b.id !== id),
            }));
            setExpandedBlockId((current) => (current === id ? null : current));
        },
        [setDraft],
    );

    const triggerBlockImage = useCallback((blockId: string) => {
        pendingBlockIdRef.current = blockId;
        fileRef.current?.click();
    }, []);

    const onBlockImageSelected = useCallback(
        async (file: File) => {
            if (!isOwnProfile) return;
            const blockId = pendingBlockIdRef.current;
            if (!blockId) return;
            setUploadingBlockId(blockId);
            try {
                const res = await uploadProfileMedia(userId, file);
                updateBlock(blockId, { imageUrl: res.displayUrl });
                SmartToast.success('تم رفع الصورة');
            } catch (err) {
                SmartToast.error(profileMediaErrorMessage(err));
            } finally {
                setUploadingBlockId(null);
                pendingBlockIdRef.current = null;
            }
        },
        [isOwnProfile, userId, updateBlock],
    );

    const triggerCanvasBg = useCallback((blockId: string) => {
        pendingCanvasBlockIdRef.current = blockId;
        canvasFileRef.current?.click();
    }, []);

    const onCanvasBgSelected = useCallback(
        async (file: File) => {
            if (!isOwnProfile) return;
            const blockId = pendingCanvasBlockIdRef.current;
            if (!blockId) return;
            setUploadingCanvasBlockId(blockId);
            try {
                const res = await uploadProfileMedia(userId, file, { variant: 'canvasBg' });
                setDraft((prev) => ({
                    ...prev,
                    customBlocks: prev.customBlocks.map((b) =>
                        b.id === blockId
                            ? {
                                  ...b,
                                  canvasStyle: {
                                      ...defaultTextCanvasStyle(),
                                      ...b.canvasStyle,
                                      enabled: true,
                                      backgroundImage: res.displayUrl,
                                  },
                              }
                            : b,
                    ),
                }));
                SmartToast.success('تم رفع خلفية اللوحة');
            } catch (err) {
                SmartToast.error(profileMediaErrorMessage(err));
            } finally {
                setUploadingCanvasBlockId(null);
                pendingCanvasBlockIdRef.current = null;
            }
        },
        [isOwnProfile, userId, setDraft],
    );

    const sortedBlocks = useMemo(() => sortProfileCustomBlocks(draft.customBlocks), [draft.customBlocks]);
    const textBlocks = useMemo(
        () => sortedBlocks.filter((block) => resolveProfileBlockKind(block) === 'text'),
        [sortedBlocks],
    );
    const imageBlocks = useMemo(
        () => sortedBlocks.filter((block) => resolveProfileBlockKind(block) === 'image'),
        [sortedBlocks],
    );

    return {
        containerKind,
        setContainerKind,
        expandedBlockId,
        setExpandedBlockId,
        uploadingBlockId,
        uploadingCanvasBlockId,
        fileRef,
        canvasFileRef,
        textBlocks,
        imageBlocks,
        addBlock,
        updateBlock,
        removeBlock,
        triggerBlockImage,
        onBlockImageSelected,
        triggerCanvasBg,
        onCanvasBgSelected,
    };
}
