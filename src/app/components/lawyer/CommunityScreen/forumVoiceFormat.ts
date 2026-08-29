export function formatVoiceTime(sec: number): string {
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}
