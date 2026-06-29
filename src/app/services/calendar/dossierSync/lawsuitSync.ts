/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 *
 * ملاحظة WHITELIST: للدعاوى المدنية نُسجّل فقط "موعد جديد" (timeline.type === 'appointment').
 * مسارات file-level dates / legacy history / tasks مُعطَّلة عمداً.
 */
import { CalendarBridge, normalizeDateToYmd } from '@/app/services/calendarBridge';
import type { DossierSyncStats, SyncScope } from './types';
import { shouldExcludeLawsuitFromCalendar } from './exclusions';
import { clientNameFromPartiesList, isRecord, readEntityId, readStr } from './shared';
import { syncLawsuitTimelineAppointment } from './incrementalSync';


export function syncOneLawsuitFile(
    file: Record<string, unknown>,
    userId: string,
    stats: DossierSyncStats,
    _scope: SyncScope = {},
): void {
    // 🛡️ WHITELIST صارم: للدعاوى المدنية، نُسجّل فقط "موعد جديد" (timeline.type === 'appointment')
    // — لا نُسجّل tasks/deadlines/file-level dates/legacy history/Sniffer.
    void _scope;
    const fileId = readEntityId(file);
    if (fileId === null) return;
    if (shouldExcludeLawsuitFromCalendar(file)) return;
    const caseNo = readStr(file, 'caseNo');
    const court = readStr(file, 'court');
    const parties = file.parties;
    const clientName = clientNameFromPartiesList(parties);

    const stages = Array.isArray(file.stages) ? file.stages : [];
    for (let si = 0; si < stages.length; si++) {
        const stage = stages[si];
        if (!isRecord(stage)) continue;
        const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
        for (const ev of timeline) {
            if (!isRecord(ev)) continue;
            if (String(ev.type || '') !== 'appointment') continue;
            const eventId = String(ev.id ?? '').trim();
            if (!eventId) continue;
            syncLawsuitTimelineAppointment({
                userId,
                fileId,
                event: {
                    id: eventId,
                    date: readStr(ev, 'date') || undefined,
                    title: readStr(ev, 'title') || undefined,
                    details: readStr(ev, 'details') || undefined,
                    isDeleted: Boolean(ev.isDeleted),
                },
                caseNo,
                court,
                parties,
                clientName,
            });
            if (!ev.isDeleted && normalizeDateToYmd(readStr(ev, 'date'))) stats.lawsuitAppointments++;
        }
        const stageId = String(stage.id ?? `stage_${si}`).trim() || `stage_${si}`;
        CalendarBridge.remove('lawsuit', String(fileId), `appeal_${stageId}`, userId);
    }
}

