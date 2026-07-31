import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    open: boolean;
    saving?: boolean;
    draft: ProfilePageCustomization;
    /** التخصيص المحفوظ — لا نحذف مساراته حتى الحفظ النهائي */
    baseline: ProfilePageCustomization;
    setDraft: React.Dispatch<React.SetStateAction<ProfilePageCustomization>>;
    setTab: (tab: ProfileSettingsTab) => void;
};

function discardUnsavedMediaPath(path: string | undefined, committedPath: string | undefined) {
    const next = path?.trim();
    if (!next || next === committedPath?.trim()) return;
    void import('@/app/services/profileMediaService')
        .then((m) => m.removeProfileMediaPaths([next]))
        .catch(() => undefined);
}

export function useProfileSettingsBlockOps({
    userId,
    isOwnProfile,
    open,
    saving = false,
    draft,
    baseline,
    setDraft,
    setTab,
}: BlockOpsArgs) {
    const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
    const [uploadingCanvasBlockId, setUploadingCanvasBlockId] = useState<string | null>(null);
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
    const [containerKind, setContainerKind] = useState<ContainerKindTab>('text');
    const fileRef = useRef<HTMLInputElement>(null);
    const canvasFileRef = useRef<HTMLInputElement>(null);
    const pendingBlockIdRef = useRef<string | null>(null);
    const pendingCanvasBlockIdRef = useRef<string | null>(null);
    /** عدّادان منفصلان — رفع صورة الكتلة لا يُبطل رفع خلفية اللوحة والعكس */
    const imageUploadGenRef = useRef(0);
    const canvasUploadGenRef = useRef(0);
    const uploadingBlockIdRef = useRef<string | null>(null);
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
            imageUploadGenRef.current += 1;
            canvasUploadGenRef.current += 1;
            uploadingBlockIdRef.current = null;
            uploadingCanvasBlockIdRef.current = null;
            setUploadingBlockId(null);
            setUploadingCanvasBlockId(null);
            pendingBlockIdRef.current = null;
            pendingCanvasBlockIdRef.current = null;
        }
    }, [open, saving]);

    const updateBlock = useCallback(
        (id: string, patch: Partial<ProfileCustomBlock>) => {
            if (saving) return;
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
        [setDraft, saving],
    );

    const addBlock = useCallback(
        (kind: ProfileBlockKind) => {
            if (saving) return;
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
        [setDraft, setTab, saving],
    );

    const removeBlock = useCallback(
        (id: string) => {
            if (pendingBlockIdRef.current === id) pendingBlockIdRef.current = null;
            if (pendingCanvasBlockIdRef.current === id) pendingCanvasBlockIdRef.current = null;
            if (uploadingBlockIdRef.current === id) {
                imageUploadGenRef.current += 1;
                uploadingBlockIdRef.current = null;
                setUploadingBlockId(null);
            }
            if (uploadingCanvasBlockIdRef.current === id) {
                canvasUploadGenRef.current += 1;
                uploadingCanvasBlockIdRef.current = null;
                setUploadingCanvasBlockId(null);
            }
            setDraft((prev) => {
                const block = prev.customBlocks.find((b) => b.id === id);
                if (block) {
                    const committed = baseline.customBlocks.find((b) => b.id === id);
                    /* يسقط بدائل الجلسة فقط؛ المسار المثبت يُنظَّف بعد نجاح الحفظ */
                    discardUnsavedMediaPath(block.imageStoragePath, committed?.imageStoragePath);
                    discardUnsavedMediaPath(
                        block.canvasStyle?.backgroundStoragePath,
                        committed?.canvasStyle?.backgroundStoragePath,
                    );
                }
                return {
                    ...prev,
                    customBlocks: prev.customBlocks.filter((b) => b.id !== id),
                };
            });
            setExpandedBlockId((current) => (current === id ? null : current));
        },
        [setDraft, baseline],
    );

    const triggerBlockImage = useCallback((blockId: string) => {
        pendingBlockIdRef.current = blockId;
        fileRef.current?.click();
    }, []);

    const onBlockImageSelected = useCallback(
        async (file: File) => {
            if (!isOwnProfile || !openRef.current || saving) return;
            const blockId = pendingBlockIdRef.current;
            if (!blockId) return;
            /* امسح الطلب فوراً حتى لا يُمسح طلب لاحق في finally */
            pendingBlockIdRef.current = null;
            const requestUserId = userId;
            const uploadGen = ++imageUploadGenRef.current;
            uploadingBlockIdRef.current = blockId;
            setUploadingBlockId(blockId);
            try {
                const previousPath = draft.customBlocks
                    .find((b) => b.id === blockId)
                    ?.imageStoragePath?.trim();
                const committedPath = baseline.customBlocks
                    .find((b) => b.id === blockId)
                    ?.imageStoragePath?.trim();
                const res = await uploadProfileMedia(requestUserId, file);
                if (
                    uploadGen !== imageUploadGenRef.current ||
                    requestUserId !== userIdRef.current ||
                    !openRef.current ||
                    !isOwnProfileRef.current
                ) {
                    if (res.storagePath) {
                        discardUnsavedMediaPath(res.storagePath, undefined);
                    }
                    return;
                }
                if (!draftRef.current.customBlocks.some((b) => b.id === blockId)) {
                    if (res.storagePath) {
                        discardUnsavedMediaPath(res.storagePath, undefined);
                    }
                    return;
                }
                updateBlock(blockId, {
                    imageUrl: res.displayUrl,
                    imageStoragePath: res.storagePath,
                });
                discardUnsavedMediaPath(previousPath, committedPath);
                SmartToast.success('تم رفع الصورة');
            } catch (err) {
                if (uploadGen === imageUploadGenRef.current) {
                    SmartToast.error(profileMediaErrorMessage(err));
                }
            } finally {
                if (uploadGen === imageUploadGenRef.current) {
                    uploadingBlockIdRef.current = null;
                    setUploadingBlockId(null);
                }
            }
        },
        [isOwnProfile, userId, updateBlock, draft.customBlocks, baseline.customBlocks, saving],
    );

    const triggerCanvasBg = useCallback((blockId: string) => {
        pendingCanvasBlockIdRef.current = blockId;
        canvasFileRef.current?.click();
    }, []);

    const onCanvasBgSelected = useCallback(
        async (file: File) => {
            if (!isOwnProfile || !openRef.current || saving) return;
            const blockId = pendingCanvasBlockIdRef.current;
            if (!blockId) return;
            pendingCanvasBlockIdRef.current = null;
            const requestUserId = userId;
            const uploadGen = ++canvasUploadGenRef.current;
            uploadingCanvasBlockIdRef.current = blockId;
            setUploadingCanvasBlockId(blockId);
            try {
                const previousPath = draft.customBlocks
                    .find((b) => b.id === blockId)
                    ?.canvasStyle?.backgroundStoragePath?.trim();
                const committedPath = baseline.customBlocks
                    .find((b) => b.id === blockId)
                    ?.canvasStyle?.backgroundStoragePath?.trim();
                const res = await uploadProfileMedia(requestUserId, file, { variant: 'canvasBg' });
                if (
                    uploadGen !== canvasUploadGenRef.current ||
                    requestUserId !== userIdRef.current ||
                    !openRef.current ||
                    !isOwnProfileRef.current
                ) {
                    if (res.storagePath) {
                        discardUnsavedMediaPath(res.storagePath, undefined);
                    }
                    return;
                }
                if (!draftRef.current.customBlocks.some((b) => b.id === blockId)) {
                    if (res.storagePath) {
                        discardUnsavedMediaPath(res.storagePath, undefined);
                    }
                    return;
                }
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
                                      backgroundStoragePath: res.storagePath,
                                  },
                              }
                            : b,
                    ),
                }));
                discardUnsavedMediaPath(previousPath, committedPath);
                SmartToast.success('تم رفع خلفية اللوحة');
            } catch (err) {
                if (uploadGen === canvasUploadGenRef.current) {
                    SmartToast.error(profileMediaErrorMessage(err));
                }
            } finally {
                if (uploadGen === canvasUploadGenRef.current) {
                    uploadingCanvasBlockIdRef.current = null;
                    setUploadingCanvasBlockId(null);
                }
            }
        },
        [isOwnProfile, userId, setDraft, draft.customBlocks, baseline.customBlocks, saving],
    );

    const clearBlockImage = useCallback(
        (blockId: string) => {
            setDraft((prev) => {
                const target = prev.customBlocks.find((b) => b.id === blockId);
                const previousPath = target?.imageStoragePath?.trim();
                const committedPath = baseline.customBlocks
                    .find((b) => b.id === blockId)
                    ?.imageStoragePath?.trim();
                discardUnsavedMediaPath(previousPath, committedPath);
                return {
                    ...prev,
                    customBlocks: prev.customBlocks.map((b) =>
                        b.id === blockId
                            ? { ...b, imageUrl: undefined, imageStoragePath: undefined }
                            : b,
                    ),
                };
            });
        },
        [setDraft, baseline.customBlocks],
    );

    const clearCanvasBackground = useCallback(
        (blockId: string) => {
            setDraft((prev) => {
                const target = prev.customBlocks.find((b) => b.id === blockId);
                const previousPath = target?.canvasStyle?.backgroundStoragePath?.trim();
                const committedPath = baseline.customBlocks
                    .find((b) => b.id === blockId)
                    ?.canvasStyle?.backgroundStoragePath?.trim();
                discardUnsavedMediaPath(previousPath, committedPath);
                return {
                    ...prev,
                    customBlocks: prev.customBlocks.map((b) =>
                        b.id === blockId
                            ? {
                                  ...b,
                                  canvasStyle: {
                                      ...defaultTextCanvasStyle(),
                                      ...b.canvasStyle,
                                      backgroundImage: undefined,
                                      backgroundStoragePath: undefined,
                                  },
                              }
                            : b,
                    ),
                };
            });
        },
        [setDraft, baseline.customBlocks],
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
        clearBlockImage,
        clearCanvasBackground,
    };
}
