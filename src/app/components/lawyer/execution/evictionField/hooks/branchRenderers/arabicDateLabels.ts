export function buildArabicDateLabel(dateOnly: string) {
    try {
        return new Date(dateOnly).toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return dateOnly;
    }
}

export function buildArabicTimeLabel(eventIso: string) {
    try {
        return new Date(eventIso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return null;
    }
}
