import React from 'react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { inferProfileBlockKind } from '@/app/services/profile/profilePageCustomization';
import { ProfileCustomBlockView } from './ProfileCustomBlockView';

type BlockLivePreviewProps = {
    block: ProfileCustomBlock;
    /** تفاعلات الحركة تبقى مطفأة — المعاينة تعرض الإطار/الخامة/الصورة كما على الصفحة */
    interactive?: boolean;
};

/**
 * معاينة dock حية: نفس عرض الحاوية على الصفحة (إطار، خامة، قصّ)، بلا تفاعلات ثقيلة.
 */
export function BlockLivePreview({ block, interactive = false }: BlockLivePreviewProps) {
    const kind = inferProfileBlockKind(block);

    return (
        <div className="profile-block-live-preview" data-block-kind={kind} data-testid="profile-block-live-preview">
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
