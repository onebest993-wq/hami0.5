import { useCallback, useEffect, useRef, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { createMediaRecorder } from '@/app/components/lawyer/ActionModals/voiceRecorderMedia';
import {
    requestMicrophoneStream,
    resolveMicrophoneAccessMessage,
    type MicrophoneAccessErrorCode,
} from '@/app/services/platform/requestMicrophoneStream';
import { VOICE_RECORD_MAX_SEC } from '../communityScreenConstants';
import {
    clearIntervalRef,
    forumVoiceAttachmentMeta,
    stopMediaRecorderQuietly,
    stopMediaStreamTracks,
} from '../forumVoiceRecorderControl';

type UseCommunityAddQuestionVoiceParams = {
    isAddQuestionOpen: boolean;
    handleUploadAttachment: (file: File, kind: 'image' | 'document' | 'audio') => Promise<void>;
};

export function useCommunityAddQuestionVoice({
    isAddQuestionOpen,
    handleUploadAttachment,
}: UseCommunityAddQuestionVoiceParams) {
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [voiceRecordingSec, setVoiceRecordingSec] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const voiceChunksRef = useRef<Blob[]>([]);
    const voiceStreamRef = useRef<MediaStream | null>(null);
    const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const haltVoiceSession = useCallback(() => {
        stopMediaRecorderQuietly(mediaRecorderRef.current);
        clearIntervalRef(voiceTimerRef);
        setIsRecordingVoice(false);
    }, []);

    useEffect(() => {
        return () => {
            clearIntervalRef(voiceTimerRef);
            stopMediaRecorderQuietly(mediaRecorderRef.current);
            stopMediaStreamTracks(voiceStreamRef.current);
        };
    }, []);

    useEffect(() => {
        if (isAddQuestionOpen || !isRecordingVoice) return;
        haltVoiceSession();
    }, [haltVoiceSession, isAddQuestionOpen, isRecordingVoice]);

    useEffect(() => {
        if (!isAddQuestionOpen || !isRecordingVoice || voiceRecordingSec < VOICE_RECORD_MAX_SEC) {
            return;
        }
        haltVoiceSession();
        SmartToast.info('تم الوصول للحد الأقصى للتسجيل (3 دقائق)');
    }, [haltVoiceSession, isAddQuestionOpen, isRecordingVoice, voiceRecordingSec]);

    const toggleVoiceRecording = useCallback(async () => {
        if (isRecordingVoice) {
            haltVoiceSession();
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            SmartToast.warning('التسجيل الصوتي غير مدعوم في هذا المتصفح');
            return;
        }

        if (typeof window !== 'undefined' && !window.isSecureContext) {
            SmartToast.warning('التسجيل الصوتي يتطلب اتصالاً آمناً (HTTPS)');
            return;
        }

        try {
            const stream = await requestMicrophoneStream();
            voiceStreamRef.current = stream;
            voiceChunksRef.current = [];

            const recorder = createMediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            const recordedMime = recorder.mimeType || 'audio/webm';

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) voiceChunksRef.current.push(event.data);
            };

            recorder.onstop = async () => {
                stopMediaStreamTracks(stream);
                voiceStreamRef.current = null;

                const blob = new Blob(voiceChunksRef.current, { type: recordedMime });
                if (blob.size === 0) {
                    SmartToast.warning('لم يُسجَّل أي صوت');
                    return;
                }
                const { mime, ext } = forumVoiceAttachmentMeta(recordedMime);
                const file = new File([blob], `forum-voice-${Date.now()}.${ext}`, { type: mime });
                await handleUploadAttachment(file, 'audio');
            };

            recorder.onerror = () => {
                SmartToast.error('تعذّر التسجيل الصوتي');
                haltVoiceSession();
            };

            recorder.start(250);
            setIsRecordingVoice(true);
            setVoiceRecordingSec(0);
            voiceTimerRef.current = setInterval(() => {
                setVoiceRecordingSec((prev) => {
                    const next = prev + 1;
                    if (next >= VOICE_RECORD_MAX_SEC) {
                        clearIntervalRef(voiceTimerRef);
                    }
                    return next >= VOICE_RECORD_MAX_SEC ? VOICE_RECORD_MAX_SEC : next;
                });
            }, 1000);
        } catch (err) {
            const code = (err as { hamiCode?: MicrophoneAccessErrorCode }).hamiCode;
            SmartToast.warning(resolveMicrophoneAccessMessage(err, code));
        }
    }, [haltVoiceSession, handleUploadAttachment, isRecordingVoice]);

    return {
        isRecordingVoice,
        voiceRecordingSec,
        toggleVoiceRecording,
    };
}
