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
                <div
                    className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.035]"
                    aria-busy="true"
                    aria-label="مقطع صوتي"
                />
            ) : attachmentUrl ? (
                <audio src={attachmentUrl} controls preload="metadata" className="w-full h-10" />
            ) : (
                <p className="text-white/40 text-xs">تعذّر تحميل المقطع الصوتي</p>
            )}
        </div>
    );
}
