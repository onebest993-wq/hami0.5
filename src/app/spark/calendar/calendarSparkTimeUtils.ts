/** أدوات وقت مشتركة لسبارك التقويم */
export function ymdFromMs(nowMs: number): string {
    const d = new Date(nowMs);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function eventYmd(date: string): string {
    return String(date ?? '').trim().slice(0, 10);
}

export function isHearingLikeEvent(type: string, source: string): boolean {
    return type === 'hearing' || source === 'hearing';
}

export function isDeadlineLikeEvent(type: string, source: string): boolean {
    return type === 'deadline' || source === 'deadline';
}
