import React from 'react';
import { GripVertical } from '@/app/components/ui/icons/GripVertical';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import '@/app/components/lawyer/RoyalLawyerProfile/profilePageBlockFx.css';
import {
    inferProfileBlockKind,
    resolveBlockPosition,
    resolveBlockWidthPct,
} from '@/app/services/profile/profilePageCustomization';
import { ProfileCustomBlockView } from './ProfileCustomBlockView';
import { useProfileCustomBlocksDrag } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileCustomBlocksDrag';

type ProfileCustomBlocksProps = {
    blocks: ProfileCustomBlock[];
    editable?: boolean;
    /** عند فتح الاستوديو: عطّل تفاعل الصفحة حتى لا ينافس معاينة الـ dock على الـ slot */
    interactionsEnabled?: boolean;
    onBlocksLayoutChange?: (blocks: ProfileCustomBlock[]) => void;
};

export function ProfileCustomBlocks({
    blocks,
    editable = false,
    interactionsEnabled = true,
    onBlocksLayoutChange,
}: ProfileCustomBlocksProps) {
    const {
        sorted,
        liveBlocks,
        canvasRef,
        dragActive,
        canvasMinHeight,
        onHandlePointerDown,
        onBlockShellPointerDown,
    } = useProfileCustomBlocksDrag({ blocks, editable, onBlocksLayoutChange });

    if (sorted.length === 0) return null;

    const blockInteractive = interactionsEnabled && !editable;

    return (
        <div className="mt-5">
            <div
                ref={canvasRef}
                data-profile-blocks-canvas
                data-testid="profile-custom-blocks"
                data-editable={editable ? 'true' : 'false'}
                data-drag-active={dragActive ? 'true' : 'false'}
                className="relative w-full"
                style={{ minHeight: canvasMinHeight }}
            >
                {liveBlocks.map((block, index) => {
                    const kind = inferProfileBlockKind(block);
                    const { posX, posY } = resolveBlockPosition(block, index);
                    const widthPct = resolveBlockWidthPct(block);

                    return (
                        <div
                            key={block.id}
                            data-profile-block-item
                            data-testid={`profile-page-block-${block.id}`}
                            data-block-kind={kind}
                            data-dragging="false"
                            onPointerDown={
                                editable
                                    ? (e) => onBlockShellPointerDown(block.id, block, index, e)
                                    : undefined
                            }
                            style={{
                                position: 'absolute',
                                top: `${posY}%`,
                                right: `${posX}%`,
                                width: `${widthPct}%`,
                                maxWidth: '100%',
                                zIndex: (block.order ?? index) + 1,
                            }}
                        >
                            {editable ? (
                                <button
                                    type="button"
                                    className="profile-block-drag-handle"
                                    aria-label="اسحب لتحريك الحاوية"
                                    onPointerDown={(e) =>
                                        onHandlePointerDown(block.id, block, index, e)
                                    }
                                >
                                    <GripVertical size={14} aria-hidden />
                                </button>
                            ) : null}
                            <ProfileCustomBlockView block={block} interactive={blockInteractive} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
