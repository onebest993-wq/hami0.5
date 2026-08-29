/** طابع زمني تلقائي غير قابل للتعديل لملاحظات الإضبارة */
export function formatDossierNoteTimestamp(date: Date = new Date()): string {
    return date.toLocaleString('ar-EG', {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function dossierNoteTimestampLabel(date: Date = new Date()): string {
    return formatDossierNoteTimestamp(date);
}
