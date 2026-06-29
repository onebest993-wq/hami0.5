import React from 'react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    inferProfileBlockKind,
} from '@/app/services/profile/profilePageCustomization';
import { ProfileCustomBlockView } from './ProfileCustomBlockView';

export type BlockLivePreviewProps = {
    block: ProfileCustomBlock;
    interactive?: boolean;
};

export function BlockLivePreview({ block, interactive = true }: BlockLivePreviewProps) {
    const kind = inferProfileBlockKind(block);

    return (
        <div className="profile-block-live-preview" data-block-kind={kind}>
            <p className="profile-block-live-preview-label">معاينة مباشرة</p>
            {kind === 'text' ? (
                block.body?.trim() ? (
                    <ProfileCustomBlockView block={block} interactive={interactive} textCanvasKey={0} />
                ) : (
                    <p className="profile-block-live-preview-empty">اكتب في المحرر بالأسفل — ستظهر المعاينة هنا فوراً</p>
                )
            ) : block.imageUrl ? (
                <ProfileCustomBlockView block={block} interactive={interactive} />
            ) : (
                <p className="profile-block-live-preview-empty">ارفع صورة في المحرر بالأسفل — ستظهر هنا مباشرة</p>
            )}
        </div>
    );
}
