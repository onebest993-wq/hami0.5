import { useCallback, useMemo, useState } from 'react';
import type { ProfileSettingsTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import type { ContainerKindTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import type {
    ProfileBlockKind,
    ProfileCustomBlock,
    ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import {
    resolveProfileBlockKind,
    sortProfileCustomBlocks,
} from '@/app/services/profile/profilePageCustomization';
import { discardUnsavedMediaPath } from '@/app/services/profile/editDraftMediaPaths';
import { createProfileCustomBlock } from '@/app/services/profile/createProfileCustomBlock';
import {
    clearBlockImageFields,
    clearCanvasBackgroundOnBlock,
    mergeProfileCustomBlockPatch,
} from '@/app/services/profile/profileCustomBlockMutations';

type UseProfileSettingsBlockMutationArgs = {
    saving?: boolean;
    draft: ProfilePageCustomization;
    baseline: ProfilePageCustomization;
    setDraft: React.Dispatch<React.SetStateAction<ProfilePageCustomization>>;
    setTab: (tab: ProfileSettingsTab) => void;
    /** يُستدعى عند حذف كتلة لإبطال رفع معلّق عليها */
    onBlockRemoved?: (id: string) => void;
};

/** CRUD الكتل + قوائم النص/الصورة — بلا رفع وسائط */
export function useProfileSettingsBlockMutation({
    saving = false,
    draft,
    baseline,
    setDraft,
    setTab,
    onBlockRemoved,
}: UseProfileSettingsBlockMutationArgs) {
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
    const [containerKind, setContainerKind] = useState<ContainerKindTab>('text');

    const updateBlock = useCallback(
        (id: string, patch: Partial<ProfileCustomBlock>) => {
            if (saving) return;
            setDraft((prev) => ({
                ...prev,
                customBlocks: prev.customBlocks.map((b) =>
                    b.id === id ? mergeProfileCustomBlockPatch(b, patch) : b,
                ),
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
                return {
                    ...prev,
                    customBlocks: [...prev.customBlocks, createProfileCustomBlock(kind, order, newId)],
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
            onBlockRemoved?.(id);
            setDraft((prev) => {
                const block = prev.customBlocks.find((b) => b.id === id);
                if (block) {
                    const committed = baseline.customBlocks.find((b) => b.id === id);
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
        [setDraft, baseline, onBlockRemoved],
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
                        b.id === blockId ? clearBlockImageFields(b) : b,
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
                        b.id === blockId ? clearCanvasBackgroundOnBlock(b) : b,
                    ),
                };
            });
        },
        [setDraft, baseline.customBlocks],
    );

    const sortedBlocks = useMemo(
        () => sortProfileCustomBlocks(draft.customBlocks),
        [draft.customBlocks],
    );
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
        textBlocks,
        imageBlocks,
        addBlock,
        updateBlock,
        removeBlock,
        clearBlockImage,
        clearCanvasBackground,
    };
}
