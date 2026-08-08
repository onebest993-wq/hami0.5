import type { LegalTask } from '@/app/types/TaskEngine';

/**
 * تنسيق رسالة عربية احترافية وفتح واتساب لسطور مهام موقع واحد (الميدان).
 */
export function delegateLocationLines(location: string, lines: string[]): void {
    const trimmed = lines.map((l) => l.trim()).filter(Boolean);
    if (trimmed.length === 0) return;

    const numbered = trimmed.map((title, i) => `${i + 1}- ${title}`).join('\n');
    const message =
        `مرحباً، يرجى التوجه إلى ${location} لإنجاز المهام التالية اليوم:\n${numbered}`;

    window.open('https://wa.me/?text=' + encodeURIComponent(message), '_blank');
}

/**
 * تنسيق رسالة عربية احترافية وفتح واتساب لمهام موقع واحد (الميدان).
 */
export function delegateLocationTasks(location: string, tasksArray: LegalTask[]): void {
    const titles = tasksArray
        .filter((t) => t.status === 'pending')
        .map((t) => t.title.trim())
        .filter(Boolean);

    delegateLocationLines(location, titles);
}
