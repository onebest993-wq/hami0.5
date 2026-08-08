import React from 'react';
import { Mic } from '@/app/components/ui/lucideIcons';
import { VoiceNoteAudio } from '@/app/components/lawyer/dashboard/VoiceNoteAudio';
import { TASKS_INNER_GLASS } from './tasksBoucleTheme';

export type TaskVoicePlaybackProps = {
    voiceRef: string;
    compact?: boolean;
    className?: string;
};

/** تشغيل تسجيل صوتي مرفق بمهمة — يستخدم IndexedDB عبر voiceRef */
export function TaskVoicePlayback({ voiceRef, compact = false, className = '' }: TaskVoicePlaybackProps) {
    if (compact) {
        return (
            <div
                className={`flex flex-row-reverse items-center gap-1.5 rounded-lg ${TASKS_INNER_GLASS} px-2 py-1.5 ${className}`}
                data-testid="task-voice-playback-compact"
            >
                <Mic className="size-3.5 shrink-0 text-[#E6C673]/80" aria-hidden />
                <VoiceNoteAudio body={voiceRef} className="h-8 min-w-0 flex-1" preload="metadata" />
            </div>
        );
    }

    return (
        <div
            className={`rounded-xl ${TASKS_INNER_GLASS} px-3 py-2 space-y-1.5 ${className}`}
            data-testid="task-voice-playback"
        >
            <p className="text-[10px] font-bold text-[#B8956A]/85 flex flex-row-reverse items-center gap-1">
                <Mic className="size-3 shrink-0 opacity-80" aria-hidden />
                تسجيل صوتي
            </p>
            <VoiceNoteAudio body={voiceRef} className="w-full h-9" preload="metadata" />
        </div>
    );
}
