import React, { Suspense, lazy } from 'react';
import { ChevronDown, Image as ImageIcon, Trash2, Type } from 'lucide-react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import type { ContainerKindTab } from '../../hooks/useProfileSettingsSheetState';

const LazyTextBlockStudioEditor = lazy(() =>
    import('../TextBlockStudioEditor').then((m) => ({ default: m.TextBlockStudioEditor })),
);
const LazyImageBlockStudioEditor = lazy(() =>
    import('../ImageBlockStudioEditor').then((m) => ({ default: m.ImageBlockStudioEditor })),
);

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
}: ProfileSettingsContainersTabProps) {
    const renderContainerBlock = (block: ProfileCustomBlock, blockIndex: number, isText: boolean) => {
        const isOpen = expandedBlockId === block.id;
        const previewText = isText
            ? block.body?.trim().split('\n')[0] || 'نص فارغ — اضغط للتحرير'
            : block.imageUrl
              ? 'صورة جاهزة'
              : 'ارفع صورة';

        return (
            <div key={block.id} className="profile-settings-block-card">
                <div className="profile-settings-block-head" data-open={isOpen ? 'true' : 'false'}>
                    <button
                        type="button"
                        data-testid={`profile-block-expand-${block.id}`}
                        className="flex flex-1 items-center gap-2 min-w-0 text-right min-h-[44px]"
                        onClick={() => setExpandedBlockId(isOpen ? null : block.id)}
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
                        onClick={() => onRemoveBlock(block.id)}
                        className="p-2 text-red-400 rounded-lg hover:bg-red-500/10 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="حذف الحاوية"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                {isOpen ? (
                    <div className="profile-settings-block-body" data-testid={`profile-block-body-${block.id}`}>
                        {isText ? (
                            <Suspense fallback={null}>
                                <LazyTextBlockStudioEditor
                                    block={block}
                                    onChange={(patch) => onUpdateBlock(block.id, patch)}
                                    uploadingCanvasBg={uploadingCanvasBlockId === block.id}
                                    onUploadCanvasBg={() => onUploadCanvasBg(block.id)}
                                />
                            </Suspense>
                        ) : (
                            <Suspense fallback={null}>
                                <LazyImageBlockStudioEditor
                                    block={block}
                                    uploading={uploadingBlockId === block.id}
                                    onChange={(patch) => onUpdateBlock(block.id, patch)}
                                    onPickImage={() => onPickBlockImage(block.id)}
                                />
                            </Suspense>
                        )}
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div className="space-y-3 pb-2" data-testid="profile-settings-containers-tab">
            <div className="profile-settings-container-tabs">
                <button
                    type="button"
                    data-active={containerKind === 'text' ? 'true' : 'false'}
                    className="profile-settings-container-tab min-h-[44px]"
                    onClick={() => setContainerKind('text')}
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
                    onClick={() => setContainerKind('image')}
                >
                    <ImageIcon size={13} />
                    صور مخصصة
                    {imageBlocks.length > 0 ? (
                        <span className="profile-settings-container-tab-count">{imageBlocks.length}</span>
                    ) : null}
                </button>
            </div>

            <section className="profile-settings-containers-section">
                {containerKind === 'text' ? (
                    <>
                        <div className="profile-settings-containers-section-title">
                            <h4>نصوص حرة</h4>
                            <span>تنسيق · لوحة · تفاعل</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => onAddBlock('text')}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed hami-profile-accent-btn text-xs font-bold mb-3 min-h-[44px]"
                        >
                            <Type size={14} />
                            إضافة نص حر
                        </button>
                        {textBlocks.length === 0 ? (
                            <p className="profile-settings-containers-empty">
                                لا توجد نصوص — أضف نصاً حراً من الزر أعلاه.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {textBlocks.map((block, index) => renderContainerBlock(block, index, true))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="profile-settings-containers-section-title">
                            <h4>صور مخصصة</h4>
                            <span>إطار · صورة · تفاعل</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => onAddBlock('image')}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed hami-profile-accent-btn text-xs font-bold mb-3 min-h-[44px]"
                        >
                            <ImageIcon size={14} />
                            إضافة صورة
                        </button>
                        {imageBlocks.length === 0 ? (
                            <p className="profile-settings-containers-empty">
                                لا توجد صور — أضف حاوية صورة من الزر أعلاه.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {imageBlocks.map((block, index) => renderContainerBlock(block, index, false))}
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
