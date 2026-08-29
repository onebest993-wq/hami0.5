/**
 * مزامنة الدعاوى المدنية → التقويم:
 * مواعيد الخط الزمني + مُهل قانونية مخزّنة (المساران) + مهام الاستحقاق (حفظ/reconcile).
 */
import { CalendarBridge, normalizeDateToYmd } from '@/app/services/calendar/bridge';
import { isEphemeralLawsuitTaskId } from '@/app/services/calendarAuthenticity';
import { collectStageLegalCalendarSpecs } from '@/app/services/lawsuitTimelineCalendarMirror';
import type { DossierSyncStats, SyncScope } from './types';
import { shouldExcludeLawsuitFromCalendar } from './exclusions';
import { clientNameFromPartiesList, isRecord, readDossierCaseNo, readEntityId, readStr } from './shared';
import { syncLawsuitTaskDue, syncLawsuitTimelineAppointment } from './incrementalSync';

export function syncOneLawsuitFile(
    file: Record<string, unknown>,
    userId: string,
    stats: DossierSyncStats,
    scope: SyncScope = {},
): void {
    const whitelistOnly = scope.whitelistOnly === true;
    const includeTasks = scope.includeTasks !== false && !whitelistOnly;
    const fileId = readEntityId(file);
    if (fileId === null) return;
    if (shouldExcludeLawsuitFromCalendar(file)) return;
    const caseNo = readDossierCaseNo(file);
    const court = readStr(file, 'court');
    const parties = file.parties;
    const clientName = clientNameFromPartiesList(parties);
    const fileIdStr = String(fileId);

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

        for (const spec of collectStageLegalCalendarSpecs(stage, si)) {
            syncLawsuitTimelineAppointment({
                userId,
                fileId,
                event: {
                    id: spec.id,
                    date: spec.date || undefined,
                    title: spec.title,
                    details: spec.details,
                    isDeleted: !spec.date,
                },
                caseNo,
                court,
                parties,
                clientName,
            });
            if (spec.date) {
                stats.lawsuitDeadlines++;
                stats.lawsuitAppointments++;
            }
        }

        if (includeTasks) {
            const tasks = Array.isArray(stage.tasks) ? stage.tasks : [];
            for (const t of tasks) {
                if (!isRecord(t)) continue;
                const tid = String(t.id ?? '').trim();
                if (!tid || isEphemeralLawsuitTaskId(tid)) continue;
                if (t.isCompleted) {
                    CalendarBridge.remove('lawsuit', fileIdStr, `task_${tid}`, userId);
                    continue;
                }
                const due = normalizeDateToYmd(readStr(t, 'dueDate'));
                if (!due) {
                    CalendarBridge.remove('lawsuit', fileIdStr, `task_${tid}`, userId);
                    continue;
                }
                syncLawsuitTaskDue({
                    userId,
                    fileId,
                    task: {
                        id: tid,
                        title: readStr(t, 'title') || 'مهمة',
                        dueDate: due,
                        isCompleted: false,
                    },
                    caseNo,
                    court,
                    parties,
                });
                stats.lawsuitTasks++;
            }
        }

        const stageId = String(stage.id ?? `stage_${si}`).trim() || `stage_${si}`;
        // معرّف قديم اصطناعي — يُزال لصالح appt_appeal_deadline_*
        CalendarBridge.remove('lawsuit', fileIdStr, `appeal_${stageId}`, userId);
    }

    if (!whitelistOnly) {
        // تواريخ ملف صريحة
        const firstHearingDate = normalizeDateToYmd(readStr(file, 'firstHearingDate'));
        const nextDate =
            normalizeDateToYmd(readStr(file, 'nextDate')) || firstHearingDate;
        const nextDateTitle =
            firstHearingDate && nextDate === firstHearingDate ? 'أول مرافعة' : 'الموعد القادم';
        syncLawsuitTimelineAppointment({
            userId,
            fileId,
            event: {
                id: 'file_next_date',
                date: nextDate || undefined,
                title: nextDateTitle,
                isDeleted: !nextDate,
            },
            caseNo,
            court,
            parties,
            clientName,
        });
        if (nextDate) stats.lawsuitAppointments++;

        const stayReview = normalizeDateToYmd(readStr(file, 'stayReviewDate'));
        syncLawsuitTimelineAppointment({
            userId,
            fileId,
            event: {
                id: 'stay_review_date',
                date: stayReview || undefined,
                title: 'مراجعة وقف التنفيذ',
                isDeleted: !stayReview,
            },
            caseNo,
            court,
            parties,
            clientName,
        });
        if (stayReview) stats.lawsuitAppointments++;

        const embeddedNotes = Array.isArray(file.notes) ? file.notes : [];
        for (const n of embeddedNotes) {
            if (!isRecord(n)) continue;
            const nid = String(n.id ?? '').trim();
            if (!nid) continue;
            const appt = normalizeDateToYmd(readStr(n, 'apptDate'));
            syncLawsuitTimelineAppointment({
                userId,
                fileId,
                event: {
                    id: `note_${nid}`,
                    date: appt || undefined,
                    title: readStr(n, 'title') || readStr(n, 'body')?.slice(0, 60) || 'ملاحظة ملف',
                    isDeleted: !appt,
                },
                caseNo,
                court,
                parties,
                clientName,
            });
            if (appt) stats.lawsuitAppointments++;
        }
    }

    if (includeTasks && stages.length === 0) {
        const rootTasks = Array.isArray(file.tasks) ? file.tasks : [];
        for (const t of rootTasks) {
            if (!isRecord(t)) continue;
            const tid = String(t.id ?? '').trim();
            if (!tid || isEphemeralLawsuitTaskId(tid)) continue;
            if (t.isCompleted) {
                CalendarBridge.remove('lawsuit', fileIdStr, `task_${tid}`, userId);
                continue;
            }
            const due = normalizeDateToYmd(readStr(t, 'dueDate'));
            if (!due) {
                CalendarBridge.remove('lawsuit', fileIdStr, `task_${tid}`, userId);
                continue;
            }
            syncLawsuitTaskDue({
                userId,
                fileId,
                task: {
                    id: tid,
                    title: readStr(t, 'title') || 'مهمة',
                    dueDate: due,
                    isCompleted: false,
                },
                caseNo,
                court,
                parties,
            });
            stats.lawsuitTasks++;
        }
    }
}
