import React from 'react';
import { RotateCcw } from 'lucide-react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    PROFILE_IMAGE_INTERACTIONS,
    resolveImageFrameStyle,
} from '@/app/services/profile/profilePageCustomization';
import { ProfileMediaFrame } from '../ProfileMediaFrame';

type ImageBlockFxPanelProps = {
    block: ProfileCustomBlock;
    fxPreviewKey: number;
    onSelectInteraction: (interaction: (typeof PROFILE_IMAGE_INTERACTIONS)[number]['id']) => void;
    onResetPreview: () => void;
};

export function ImageBlockFxPanel({
    block,
    fxPreviewKey,
    onSelectInteraction,
    onResetPreview,
}: ImageBlockFxPanelProps) {
    const frameStyle = resolveImageFrameStyle(block);
    const selectedInteraction = frameStyle.interaction ?? 'none';
    const previewHeight = Math.min(168, block.imageHeightPx ?? 168);

    return (
        <div className="space-y-3" data-testid="image-block-fx-panel">
            {block.imageUrl ? (
                <div className="profile-studio-fx-live-preview">
                    <div className="profile-studio-fx-live-preview__head">
                        <p className="profile-studio-field-label mb-0">معاينة التفاعل</p>
                        <button
                            type="button"
                            className="profile-block-live-preview-reset min-h-[44px]"
                            onClick={onResetPreview}
                            data-testid="image-fx-reset-preview"
                        >
                            <RotateCcw size={11} />
                            إعادة التشغيل
                        </button>
                    </div>
                    <ProfileMediaFrame
                        key={`fx-${selectedInteraction}-${fxPreviewKey}`}
                        block={block}
                        src={block.imageUrl}
                        template={block.mediaTemplate}
                        heightPx={previewHeight}
                        borderless
                        previewInteractive
                    />
                    <p className="profile-studio-fx-live-preview__hint">
                        {selectedInteraction === 'tilt'
                            ? 'مرّر إصبعك أو الماوس فوق الصورة لرؤية الميل'
                            : selectedInteraction === 'none'
                              ? 'اختر أسلوب حركة من الأسفل'
                              : 'التأثير يعمل تلقائياً — استخدم «إعادة التشغيل» لإعادة المحاولة'}
                    </p>
                </div>
            ) : (
                <p className="text-[10px] text-white/38 text-center py-3">
                    ارفع صورة في تبويب «الصورة» لتجربة التفاعلات
                </p>
            )}

            <div>
                <p className="profile-studio-field-label">حركة الصورة</p>
                <p className="profile-studio-field-hint">
                    اختر أسلوب الحركة — يُطبَّق على المعاينة أعلاه وعلى صفحتك العامة
                </p>
                <div className="profile-studio-image-interaction-grid">
                    {PROFILE_IMAGE_INTERACTIONS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            data-selected={selectedInteraction === item.id ? 'true' : 'false'}
                            data-interaction={item.id}
                            data-testid={`image-interaction-${item.id}`}
                            className="profile-studio-image-interaction-card min-h-[44px]"
                            onClick={() => onSelectInteraction(item.id)}
                        >
                            <span className="profile-studio-image-interaction-card__preview" aria-hidden />
                            <span className="profile-studio-image-interaction-card__label">{item.label}</span>
                            <span className="profile-studio-image-interaction-card__hint">{item.hint}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
