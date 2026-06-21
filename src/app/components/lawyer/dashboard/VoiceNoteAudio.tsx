import { useEffect, useState } from 'react';
import { parseVoiceNoteRef, isVoiceNoteRef } from '@/app/services/voice/voiceNoteCodec';
import { isVoiceNoteBody } from '@/app/components/lawyer/dashboard/notepadNoteUtils';
import { getVoiceObjectUrl } from '@/app/services/voice/voiceNoteStorage';

type VoiceNoteAudioProps = {
    body: string;
    className?: string;
    preload?: 'none' | 'metadata' | 'auto';
};

/** يشغّل الصوت من IndexedDB أو data URL legacy */
export function VoiceNoteAudio({ body, className = 'w-full h-9', preload = 'none' }: VoiceNoteAudioProps) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;

        const resolve = async () => {
            const trimmed = body.trim();
            if (!trimmed) {
                setSrc(null);
                return;
            }
            const ref = parseVoiceNoteRef(trimmed);
            if (ref) {
                const url = await getVoiceObjectUrl(ref);
                if (cancelled) {
                    if (url) URL.revokeObjectURL(url);
                    return;
                }
                objectUrl = url;
                setSrc(url);
                return;
            }
            if (trimmed.startsWith('data:audio') || trimmed.startsWith('blob:audio')) {
                setSrc(trimmed);
                return;
            }
            setSrc(null);
        };

        void resolve();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [body]);

    if (!src) {
        return <p className="text-xs text-white/40">تعذّر تحميل التسجيل</p>;
    }

    return <audio src={src} controls className={className} preload={preload} />;
}

export function isVoiceNoteContent(body?: string | null, type?: string | null): boolean {
    if (type === 'voice') return true;
    const v = body?.trim();
    if (!v) return false;
    return isVoiceNoteBody(v) || isVoiceNoteRef(v);
}
