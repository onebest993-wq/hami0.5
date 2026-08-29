import React, { useMemo } from 'react';
import { Image as ImageIcon } from '@/app/components/ui/icons/Image';
import { Type } from '@/app/components/ui/icons/Type';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import type { ContainerKindTab } from '../../hooks/useProfileSettingsSheetState';
import {
    prefetchProfileStudioEditor,
    useProfileStudioEditorChunk,
} from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioEditorChunk';
import { ProfileSettingsBlockCard } from './ProfileSettingsBlockCard';

type ProfileSettingsContainersTabProps = {
    containerKind: ContainerKindTab;
    setContainerKind: (kind: ContainerKindTab) => void;
    textBlocks: ProfileCustomBlock[];
    imageBlocks: ProfileCustomBlock[];
    expandedBlockId: string | null;
    setExpandedBlockId: React.Dispatch<React.SetStateAction<string | null>>;
    uploadingBlockId: string | null;
    uploadingCanvasBlockId: string | null;
    onAddBlock: (kind: 'text' | 'image') => void;
    onUpdateBlock: (id: string, patch: Partial<ProfileCustomBlock>) => void;
    onRemoveBlock: (id: string) => void;
    onPickBlockImage: (blockId: string) => void;
    onUploadCanvasBg: (blockId: string) => void;
    onClearBlockImage?: (blockId: string) => void;
    onClearCanvasBg?: (blockId: string) => void;
    saving?: boolean;
};

export function ProfileSettingsContainersTab({
    containerKind,
    setContainerKind,
    textBlocks,
    imageBlocks,
    expandedBlockId,
    setExpandedBlockId,
    uploadingBlockId,
    uploadingCanvasBlockId,
    onAddBlock,
    onUpdateBlock,
    onRemoveBlock,
    onPickBlockImage,
    onUploadCanvasBg,
    onClearBlockImage,
    onClearCanvasBg,
    saving = false,
}: ProfileSettingsContainersTabProps) {
    const expandedEditorKind = useMemo(() => {
        if (!expandedBlockId) return null;
        if (textBlocks.some((block) => block.id === expandedBlockId)) return 'text' as const;
        if (imageBlocks.some((block) => block.id === expandedBlockId)) return 'image' as const;
        return null;
    }, [expandedBlockId, textBlocks, imageBlocks]);

    const {
        ready: editorReady,
        TextBlockStudioEditor,
        ImageBlockStudioEditor,
    } = useProfileStudioEditorChunk(expandedEditorKind, Boolean(expandedBlockId));

    const blockCardShared = {
        saving,
        uploadingBlockId,
        uploadingCanvasBlockId,
        editorReady,
        TextBlockStudioEditor,
        ImageBlockStudioEditor,
        onUpdateBlock,
        onRemoveBlock,
        onPickBlockImage,
        onUploadCanvasBg,
        onClearBlockImage,
        onClearCanvasBg,
    };

    return (
        <div className="space-y-3 pb-2" data-testid="profile-settings-containers-tab">
            <div className="profile-settings-luxury-card p-1 profile-settings-container-tabs">
                <button
                    type="button"
                    data-active={containerKind === 'text' ? 'true' : 'false'}
                    className="profile-settings-container-tab min-h-[44px]"
                    onPointerEnter={() => prefetchProfileStudioEditor('text')}
                    onFocus={() => prefetchProfileStudioEditor('text')}
                    onClick={() => {
                        setExpandedBlockId(null);
                        setContainerKind('text');
                    }}
                >
                    <Type size={13} />
                    نصوص حرة
                    {textBlocks.length > 0 ? (
                        <span className="profile-settings-container-tab-count">{textBlocks.length}</span>
                    ) : null}
                </button>
                <button
                    type="button"
                    data-active={containerKind === 'image' ? 'true' : 'false'}
                    className="profile-settings-container-tab min-h-[44px]"
                    onPointerEnter={() => prefetchProfileStudioEditor('image')}
                    onFocus={() => prefetchProfileStudioEditor('image')}
                    onClick={() => {
                        setExpandedBlockId(null);
                        setContainerKind('image');
                    }}
                >
                    <ImageIcon size={13} />
                    صور مخصصة
                    {imageBlocks.length > 0 ? (
                        <span className="profile-settings-container-tab-count">{imageBlocks.length}</span>
                    ) : null}
                </button>
            </div>

            <section className="profile-settings-containers-section" data-flat="true">
                {containerKind === 'text' ? (
                    <>
                        <button
                            type="button"
                            onClick={() => onAddBlock('text')}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed hami-profile-accent-btn text-xs font-bold mb-2 min-h-[44px]"
                        >
                            <Type size={14} />
                            إضافة نص حر
                        </button>
                        {textBlocks.length === 0 ? (
                            <p className="profile-settings-containers-empty">لا توجد نصوص بعد.</p>
                        ) : (
                            <div className="space-y-2">
                                {textBlocks.map((block, index) => (
                                    <ProfileSettingsBlockCard
                                        key={block.id}
                                        block={block}
                                        blockIndex={index}
                                        isText
                                        isOpen={expandedBlockId === block.id}
                                        onToggle={() =>
                                            setExpandedBlockId(
                                                expandedBlockId === block.id ? null : block.id,
                                            )
                                        }
                                        {...blockCardShared}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => onAddBlock('image')}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed hami-profile-accent-btn text-xs font-bold mb-2 min-h-[44px]"
                        >
                            <ImageIcon size={14} />
                            إضافة صورة
                        </button>
                        {imageBlocks.length === 0 ? (
                            <p className="profile-settings-containers-empty">لا توجد صور بعد.</p>
                        ) : (
                            <div className="space-y-2">
                                {imageBlocks.map((block, index) => (
                                    <ProfileSettingsBlockCard
                                        key={block.id}
                                        block={block}
                                        blockIndex={index}
                                        isText={false}
                                        isOpen={expandedBlockId === block.id}
                                        onToggle={() =>
                                            setExpandedBlockId(
                                                expandedBlockId === block.id ? null : block.id,
                                            )
                                        }
                                        {...blockCardShared}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
