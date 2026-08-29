import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { Image as ImageIcon } from '@/app/components/ui/icons/Image';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { Type } from '@/app/components/ui/icons/Type';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { prefetchProfileStudioEditor } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioEditorChunk';
import type {
    ImageBlockStudioEditorComponent,
    TextBlockStudioEditorComponent,
} from '@/app/runtime/profileSettingsStudioTabsLoader';
import { ProfileSettingsTabSkeleton } from './ProfileSettingsTabSkeleton';

type ProfileSettingsBlockCardProps = {
    block: ProfileCustomBlock;
    blockIndex: number;
    isText: boolean;
    isOpen: boolean;
    saving: boolean;
    uploadingBlockId: string | null;
    uploadingCanvasBlockId: string | null;
    editorReady: boolean;
    TextBlockStudioEditor: TextBlockStudioEditorComponent | null;
    ImageBlockStudioEditor: ImageBlockStudioEditorComponent | null;
    onToggle: () => void;
    onUpdateBlock: (id: string, patch: Partial<ProfileCustomBlock>) => void;
    onRemoveBlock: (id: string) => void;
    onPickBlockImage: (blockId: string) => void;
    onUploadCanvasBg: (blockId: string) => void;
    onClearBlockImage?: (blockId: string) => void;
    onClearCanvasBg?: (blockId: string) => void;
};

export function ProfileSettingsBlockCard({
    block,
    blockIndex,
    isText,
    isOpen,
    saving,
    uploadingBlockId,
    uploadingCanvasBlockId,
    editorReady,
    TextBlockStudioEditor,
    ImageBlockStudioEditor,
    onToggle,
    onUpdateBlock,
    onRemoveBlock,
    onPickBlockImage,
    onUploadCanvasBg,
    onClearBlockImage,
    onClearCanvasBg,
}: ProfileSettingsBlockCardProps) {
    const previewText = isText
        ? block.body?.trim().split('\n')[0] || 'نص فارغ — اضغط للتحرير'
        : block.imageUrl
          ? 'صورة جاهزة'
          : 'ارفع صورة';

    return (
        <div className="profile-settings-block-card">
            <div className="profile-settings-block-head" data-open={isOpen ? 'true' : 'false'}>
                <button
                    type="button"
                    data-testid={`profile-block-expand-${block.id}`}
                    className="flex flex-1 items-center gap-2 min-w-0 text-right min-h-[44px]"
                    onPointerEnter={() => prefetchProfileStudioEditor(isText ? 'text' : 'image')}
                    onFocus={() => prefetchProfileStudioEditor(isText ? 'text' : 'image')}
                    onClick={onToggle}
                >
                    <span className="profile-settings-block-kind">
                        {isText ? (
                            <>
                                <Type size={11} />
                                نص
                            </>
                        ) : (
                            <>
                                <ImageIcon size={11} />
                                صورة
                            </>
                        )}
                    </span>
                    <span className="profile-settings-block-preview-text">
                        #{blockIndex + 1} · {previewText}
                    </span>
                    <ChevronDown
                        size={14}
                        className={`shrink-0 text-white/35 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                        }`}
                    />
                </button>
                <button
                    type="button"
                    data-testid={`profile-block-remove-${block.id}`}
                    disabled={
                        saving ||
                        uploadingBlockId === block.id ||
                        uploadingCanvasBlockId === block.id
                    }
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (
                            saving ||
                            uploadingBlockId === block.id ||
                            uploadingCanvasBlockId === block.id
                        ) {
                            return;
                        }
                        onRemoveBlock(block.id);
                    }}
                    className="p-2 text-red-400 rounded-lg hover:bg-red-500/10 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="حذف الحاوية"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {isOpen ? (
                <div className="profile-settings-block-body" data-testid={`profile-block-body-${block.id}`}>
                    {isText ? (
                        editorReady && TextBlockStudioEditor ? (
                            <TextBlockStudioEditor
                                block={block}
                                onChange={(patch) => onUpdateBlock(block.id, patch)}
                                uploadingCanvasBg={uploadingCanvasBlockId === block.id}
                                saving={saving}
                                onUploadCanvasBg={() => onUploadCanvasBg(block.id)}
                                onClearCanvasBg={
                                    onClearCanvasBg ? () => onClearCanvasBg(block.id) : undefined
                                }
                            />
                        ) : (
                            <ProfileSettingsTabSkeleton />
                        )
                    ) : editorReady && ImageBlockStudioEditor ? (
                        <ImageBlockStudioEditor
                            block={block}
                            uploading={uploadingBlockId === block.id}
                            saving={saving}
                            onChange={(patch) => onUpdateBlock(block.id, patch)}
                            onPickImage={() => onPickBlockImage(block.id)}
                            onClearImage={
                                onClearBlockImage ? () => onClearBlockImage(block.id) : undefined
                            }
                        />
                    ) : (
                        <ProfileSettingsTabSkeleton />
                    )}
                </div>
            ) : null}
        </div>
    );
}
