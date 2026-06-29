/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 */
import { normalizeDateToYmd } from '@/app/services/calendarBridge';
import type { DossierSyncStats, SyncScope } from './types';
import { shouldExcludeExecutionFromCalendar } from './exclusions';
import { isRecord, readEntityId, readStr } from './shared';
import { syncExecutionTimelineAppointment } from './incrementalSync';


export function syncOneExecutionFile(
    file: Record<string, unknown>,
    userId: string,
    stats: DossierSyncStats,
    _scope: SyncScope = {},
): void {
    // 🛡️ WHITELIST صارم: لقسم التنفيذ، نُسجّل فقط "إضافة موعد" (timeline.type === 'appointment')
    // — لا نُسجّل tasks/deadlines/Sniffer.
    void _scope;
    const executionId = readEntityId(file);
    if (executionId === null) return;
    if (shouldExcludeExecutionFromCalendar(file)) return;
    const caseNo =
        readStr(file, 'fileNumber') || readStr(file, 'caseNo') || readStr(file as Record<string, unknown>, 'caseNumber');
    const clientName = readStr(file, 'creditor') || readStr(file, 'clientName');

    const timeline = Array.isArray(file.timelineEvents) ? file.timelineEvents : [];
    for (const ev of timeline) {
        if (!isRecord(ev)) continue;
        // syncExecutionTimelineAppointment يفلتر داخلياً بـ type === 'appointment'
        syncExecutionTimelineAppointment({
            userId,
            executionId,
            event: {
                id: String(ev.id ?? ''),
                type: readStr(ev, 'type') || undefined,
                date: readStr(ev, 'date') || undefined,
                title: readStr(ev, 'title') || undefined,
                description: readStr(ev, 'description') || undefined,
                trashedAt: (ev.trashedAt as string | null | undefined) ?? null,
            },
            caseNo,
            clientName,
        });
        if (String(ev.type) === 'appointment' && !ev.trashedAt && normalizeDateToYmd(readStr(ev, 'date'))) {
            stats.executionAppointments++;
        }
    }
}

