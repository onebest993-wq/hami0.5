import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { FORUM_PANEL } from '../forumPlumTheme';

type QuestionCardAttachmentAudioProps = {
    attachmentUrl: string | null;
    attachmentLoading: boolean;
};

export function QuestionCardAttachmentAudio({
    attachmentUrl,
    attachmentLoading,
}: QuestionCardAttachmentAudioProps) {
    return (
        <div className={`w-full ${FORUM_PANEL} p-3`}>
            <p className="text-white/50 text-[10px] mb-2">مقطع صوتي</p>
            {attachmentLoading ? (
                <div className="flex items-center gap-2 text-white/40 text-xs">
                    <Loader2 size={14} className="animate-spin" />
                    جاري تحميل المقطع...
                </div>
            ) : attachmentUrl ? (
                <audio src={attachmentUrl} controls preload="metadata" className="w-full h-10" />
            ) : (
                <p className="text-white/40 text-xs">تعذّر تحميل المقطع الصوتي</p>
            )}
        </div>
    );
}
