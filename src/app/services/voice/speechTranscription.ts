type RecognitionCtor = new () => {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((event: { resultIndex: number; results: { length: number; [i: number]: { isFinal?: boolean; [j: number]: { transcript?: string } | undefined } | undefined } }) => void) | null;
    onerror: (() => void) | null;
    start: () => void;
    stop: () => void;
};

function getRecognitionCtor(): RecognitionCtor | null {
    if (typeof window === 'undefined') return null;
    const w = window as Window & {
        SpeechRecognition?: RecognitionCtor;
        webkitSpeechRecognition?: RecognitionCtor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
    return getRecognitionCtor() != null;
}

export type LiveTranscriptSession = {
    start: () => void;
    stop: () => void;
    getTranscript: () => string;
};

/** تحويل صوت → نص (Web Speech API) — يعمل offline على بعض المتصفحات */
export function createArabicTranscriptSession(
    onUpdate: (text: string, isFinal: boolean) => void,
): LiveTranscriptSession | null {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return null;

    const recognition = new Ctor();
    recognition.lang = 'ar-IQ';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalParts: string[] = [];
    let interim = '';

    recognition.onresult = (event) => {
        interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const piece = event.results[i]?.[0]?.transcript?.trim();
            if (!piece) continue;
            if (event.results[i]?.isFinal) {
                finalParts.push(piece);
            } else {
                interim = piece;
            }
        }
        const merged = [...finalParts, interim].filter(Boolean).join(' ').trim();
        onUpdate(merged, interim === '');
    };

    recognition.onerror = () => {
        /* لا نوقف التسجيل — STT اختياري */
    };

    return {
        start: () => {
            finalParts = [];
            interim = '';
            try {
                recognition.start();
            } catch {
                /* already started */
            }
        },
        stop: () => {
            try {
                recognition.stop();
            } catch {
                /* ignore */
            }
        },
        getTranscript: () => [...finalParts, interim].filter(Boolean).join(' ').trim(),
    };
}
