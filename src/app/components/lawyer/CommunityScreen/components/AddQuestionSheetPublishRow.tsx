import { Mic } from '@/app/components/ui/icons/Mic';
import { Square } from '@/app/components/ui/icons/Square';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { FORUM_PUBLISH_BTN, FORUM_PUBLISH_BTN_DISABLED } from '../forumPlumTheme';
import { formatVoiceTime } from '../forumVoiceFormat';

type AddQuestionSheetPublishRowProps = {
    submittingPost: boolean;
    isRecordingVoice: boolean;
    voiceRecordingSec: number;
    onToggleVoiceRecording: () => void;
    onSubmit: () => void;
};

export function AddQuestionSheetPublishRow({
    submittingPost,
    isRecordingVoice,
    voiceRecordingSec,
    onToggleVoiceRecording,
    onSubmit,
}: AddQuestionSheetPublishRowProps) {
    return (
        <div className="flex items-stretch gap-3">
            <button
                type="button"
                onClick={() => void onToggleVoiceRecording()}
                disabled={isRecordingVoice}
                data-testid="forum-add-question-voice-btn"
                className={`w-14 h-[55px] rounded-xl border flex flex-col items-center justify-center transition-colors ${
                    isRecordingVoice
                        ? 'bg-red-500/15 border-red-500/30 text-red-200 animate-pulse'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                }`}
                title={isRecordingVoice ? 'إيقاف التسجيل' : 'نشر صوتي'}
            >
                {isRecordingVoice ? (
                    <>
                        <Square size={16} fill="currentColor" />
                        <span className="text-[9px] mt-0.5 tabular-nums">{formatVoiceTime(voiceRecordingSec)}</span>
                    </>
                ) : (
                    <Mic size={20} />
                )}
            </button>
            <button type="button"
                onClick={() => {
                    if (submittingPost) return;
                    void onSubmit();
                }}
                disabled={submittingPost || isRecordingVoice}
                className={`flex-1 h-[55px] rounded-xl flex items-center justify-center font-bold text-lg transition-transform ${
                    submittingPost || isRecordingVoice
                        ? FORUM_PUBLISH_BTN_DISABLED
                        : FORUM_PUBLISH_BTN
                }`}
            >
                {submittingPost ? (
                    <span className="flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        جاري فحص الخصوصية...
                    </span>
                ) : (
                    'نشر'
                )}
            </button>
        </div>
    );
}
