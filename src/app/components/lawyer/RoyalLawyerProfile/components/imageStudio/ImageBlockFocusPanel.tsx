import React from 'react';
import { ImagePlus } from '@/app/components/ui/icons/ImagePlus';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { ImageFocusPicker } from './ImageFocusPicker';

type ImageBlockFocusPanelProps = {
    block: ProfileCustomBlock;
    uploading: boolean;
    onChange: (patch: Partial<ProfileCustomBlock>) => void;
    onPickImage: () => void;
    onClearImage?: () => void;
};

export function ImageBlockFocusPanel({
    block,
    uploading,
    onChange,
    onPickImage,
    onClearImage,
}: ImageBlockFocusPanelProps) {
    return (
        <div className="space-y-3" data-testid="image-block-focus-panel">
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={uploading}
                    onClick={onPickImage}
                    data-testid="image-upload-button"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl hami-profile-accent-btn border text-[11px] font-bold min-h-[44px]"
                >
                    <ImagePlus size={14} />
                    {uploading ? 'جاري الرفع...' : block.imageUrl ? 'تغيير الصورة' : 'رفع صورة'}
                </button>
                {block.imageUrl && onClearImage ? (
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={onClearImage}
                        data-testid="image-clear-button"
                        className="px-3 rounded-xl border border-red-400/30 text-red-300 text-[11px] font-bold min-h-[44px] min-w-[44px] touch-manipulation"
                        aria-label="مسح الصورة"
                    >
                        مسح
                    </button>
                ) : null}
            </div>

            {block.imageUrl ? (
                <ImageFocusPicker block={block} src={block.imageUrl} onChange={onChange} />
            ) : (
                <p className="text-[10px] text-white/38 text-center py-4">
                    ارفع صورة أولاً ثم حرّكها يدوياً داخل الإطار
                </p>
            )}

            <textarea
                value={block.body ?? ''}
                maxLength={2000}
                onChange={(e) => onChange({ body: e.target.value.slice(0, 2000) })}
                rows={2}
                className="w-full bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none resize-none focus:border-white/20"
                placeholder="تعليق تحت الصورة (اختياري)"
                data-testid="image-caption-input"
            />
        </div>
    );
}
