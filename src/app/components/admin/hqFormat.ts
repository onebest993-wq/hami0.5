function formatHqInstant(iso: string, fallback: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return fallback;
    try {
        return new Intl.DateTimeFormat('ar-IQ', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    } catch {
        return date.toLocaleString('ar');
    }
}

export function formatHqDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    try {
        return new Intl.DateTimeFormat('ar-IQ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    } catch {
        return date.toLocaleDateString('ar');
    }
}

export function formatHqDateTime(iso: string): string {
    return formatHqInstant(iso, '—');
}

/** عمر الطلب من تاريخ التقديم — للتوثيق المعلّق. */
export function formatHqWaitingSince(iso: string, nowMs: number = Date.now()): string {
    const started = Date.parse(iso);
    if (!Number.isFinite(started)) return '';
    const ms = nowMs - started;
    if (ms < 60_000) return 'منذ أقل من دقيقة';
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (ms < hour) {
        const mins = Math.max(1, Math.round(ms / minute));
        return mins === 1 ? 'منذ دقيقة' : `منذ ${mins} دقيقة`;
    }
    if (ms < day) {
        const hours = Math.max(1, Math.round(ms / hour));
        return hours === 1 ? 'منذ ساعة' : `منذ ${hours} ساعات`;
    }
    const days = Math.round(ms / day);
    if (days === 1) return 'منذ يوم';
    if (days === 2) return 'منذ يومين';
    return `منذ ${days} أيام`;
}

/** مدة متبقية بصيغة عربية قصيرة — بلا أسرار. */
export function formatHqRemaining(iso: string, nowMs: number = Date.now()): string {
    const until = Date.parse(iso);
    if (!Number.isFinite(until)) return 'غير معروف';
    const ms = until - nowMs;
    if (ms <= 0) return 'انتهت الصلاحية';
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (ms < hour) {
        const mins = Math.max(1, Math.ceil(ms / minute));
        return mins === 1 ? 'أقل من دقيقة' : `${mins} دقيقة`;
    }
    if (ms < day) {
        const hours = Math.max(1, Math.round(ms / hour));
        return hours === 1 ? 'ساعة واحدة' : `${hours} ساعات`;
    }
    const days = Math.round(ms / day);
    if (days === 1) return 'يوم واحد';
    if (days === 2) return 'يومان';
    return `${days} أيام`;
}

export function formatHqFreezeUntil(iso: string | null): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return null;
    const formatted = formatHqInstant(iso, '');
    return formatted || null;
}

/** تعليق الحالة في الجدول/الإضبارة — دائم إن لم تُحفظ مدة سارية */
export function formatHqFreezeCaption(freezeUntil: string | null, frozen: boolean): string | null {
    if (!frozen) return null;
    const until = formatHqFreezeUntil(freezeUntil);
    return until ? `حتى ${until}` : 'تجميد دائم';
}

export function formatHqLockCaption(loginUntil: string | null, locked: boolean): string | null {
    if (!locked) return null;
    const until = formatHqFreezeUntil(loginUntil);
    return until ? `حتى ${until}` : 'قفل دائم';
}
