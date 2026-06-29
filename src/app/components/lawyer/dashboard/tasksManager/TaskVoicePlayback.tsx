import React from 'react';
import { Mic } from 'lucide-react';
import { VoiceNoteAudio } from '@/app/components/lawyer/dashboard/VoiceNoteAudio';

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
                className={`flex flex-row-reverse items-center gap-1.5 rounded-lg border border-[#A67C52]/22 bg-[#0c0c0e]/45 px-2 py-1.5 ${className}`}
                data-testid="task-voice-playback-compact"
            >
                <Mic className="size-3.5 shrink-0 text-[#D4B896]/80" aria-hidden />
                <VoiceNoteAudio body={voiceRef} className="h-8 min-w-0 flex-1" preload="metadata" />
            </div>
        );
    }

    return (
        <div
            className={`rounded-xl border border-[#A67C52]/22 bg-[#0c0c0e]/45 px-3 py-2 space-y-1.5 ${className}`}
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
