import { useRef } from 'react';
import type { ProfileSettingsTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import type {
    ProfileCustomBlock,
    ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import { useProfileSettingsBlockMutation } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsBlockMutation';
import { useProfileSettingsBlockUploads } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsBlockUploads';

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

/** واجهة عمليات الكتل في ورقة الإعدادات — تركيب mutation + uploads */
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
    const updateBlockRef = useRef<(id: string, patch: Partial<ProfileCustomBlock>) => void>(
        () => undefined,
    );
    const expandedBlockIdRef = useRef<string | null>(null);

    const uploads = useProfileSettingsBlockUploads({
        userId,
        isOwnProfile,
        open,
        saving,
        draft,
        baseline,
        setDraft,
        updateBlock: (id, patch) => updateBlockRef.current(id, patch),
        getExpandedBlockId: () => expandedBlockIdRef.current,
    });

    const mutation = useProfileSettingsBlockMutation({
        saving,
        draft,
        baseline,
        setDraft,
        setTab,
        onBlockRemoved: uploads.invalidateUploadsForBlock,
    });

    updateBlockRef.current = mutation.updateBlock;
    expandedBlockIdRef.current = mutation.expandedBlockId;

    return {
        containerKind: mutation.containerKind,
        setContainerKind: mutation.setContainerKind,
        expandedBlockId: mutation.expandedBlockId,
        setExpandedBlockId: mutation.setExpandedBlockId,
        uploadingBlockId: uploads.uploadingBlockId,
        uploadingCanvasBlockId: uploads.uploadingCanvasBlockId,
        fileRef: uploads.fileRef,
        canvasFileRef: uploads.canvasFileRef,
        textBlocks: mutation.textBlocks,
        imageBlocks: mutation.imageBlocks,
        addBlock: mutation.addBlock,
        updateBlock: mutation.updateBlock,
        removeBlock: mutation.removeBlock,
        triggerBlockImage: uploads.triggerBlockImage,
        onBlockImageSelected: uploads.onBlockImageSelected,
        triggerCanvasBg: uploads.triggerCanvasBg,
        onCanvasBgSelected: uploads.onCanvasBgSelected,
        canvasBgEditor: uploads.canvasBgEditor,
        cancelCanvasBgEditor: uploads.cancelCanvasBgEditor,
        confirmCanvasBgEditor: uploads.confirmCanvasBgEditor,
        clearBlockImage: mutation.clearBlockImage,
        clearCanvasBackground: mutation.clearCanvasBackground,
    };
}
