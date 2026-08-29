import { X } from '@/app/components/ui/icons/X';
import { FileText } from '@/app/components/ui/icons/FileText';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

type AddQuestionSheetPreviewProps = {
    newAttachment: NonNullable<CommunityPost['attachment']>;
    onRemoveAttachment: () => void;
};

export function AddQuestionSheetPreview({
    newAttachment,
    onRemoveAttachment,
}: AddQuestionSheetPreviewProps) {
    return (
        <div className="mb-6">
            <p className="text-white/50 text-xs mb-2">المرفقات:</p>
            {newAttachment.type === 'image' && (
                <div className="relative inline-block">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                        <ImageWithFallback
                            src={newAttachment.url || ''}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <button type="button"
                        onClick={onRemoveAttachment}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white border border-[#25293C]"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}
            {newAttachment.type === 'audio' && (
                <div className="relative w-full hami-forum-panel rounded-xl p-3 border border-white/10 pr-8">
                    <p className="text-white/50 text-[10px] mb-2">مقطع صوتي</p>
                    <audio
                        src={newAttachment.url}
                        controls
                        preload="metadata"
                        className="w-full h-10"
                    />
                    <button type="button"
                        onClick={onRemoveAttachment}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white border border-[#25293C]"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}
            {newAttachment.type === 'document' && (
                <div className="inline-flex items-center gap-2 hami-forum-panel px-3 py-2 rounded-lg border border-white/10 relative pr-8">
                    <FileText size={16} className="text-[#E6C673]" />
                    <span className="text-white/80 text-sm max-w-[200px] truncate">{newAttachment.name}</span>
                    <button type="button"
                        onClick={onRemoveAttachment}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white border border-[#25293C]"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}
