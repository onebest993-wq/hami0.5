/**
 * جسر Escape للمسجّل — يوقف التسجيل إن كان جارياً دون إغلاق الطبقة.
 * مكدس المستودع (capture أقدم) يستدعي هذا بدلاً من الإغلاق الفوري.
 */

type VoiceEscapeHandler = () => boolean;

let handler: VoiceEscapeHandler | null = null;

export function registerVoiceRecorderEscape(next: VoiceEscapeHandler): () => void {
    handler = next;
    return () => {
        if (handler === next) handler = null;
    };
}

/** true = استُهلك (إيقاف أو إغلاق داخلي) */
export function consumeVoiceRecorderEscape(): boolean {
    return handler?.() ?? false;
}

export function resetVoiceRecorderEscapeForTests(): void {
    handler = null;
}
