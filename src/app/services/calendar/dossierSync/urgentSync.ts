/**
 * مزامنة مواعيد القضاء المستعجل → التقويم المركزي.
 * خفيفة: تواريخ صريحة فقط (جلسات/مهل)، متوافقة مع معرّفات prune.
 */
import { CalendarBridge, normalizeDateToYmd, resolveCalendarUserId } from '@/app/services/calendar/bridge';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { debug } from '@/app/utils/debug';
import type { DossierSyncStats } from './types';
import { isRecord, clientNameFromPartiesList, readStr } from './shared';
import { URGENT_ACTIONS_CHANGED_EVENT } from './urgentSyncEvents';

export { URGENT_ACTIONS_CHANGED_EVENT } from './urgentSyncEvents';

function syncOrRemoveUrgentDate(p: {
    userId: string;
    caseId: string;
    hearingId: string;
    date: string | null;
    stageLabel: string;
    caseNo?: string;
    partiesSummary?: string;
    notes?: string;
    nextSessionDate?: string;
    stats: DossierSyncStats;
}): void {
    if (!p.date) {
        CalendarBridge.remove('urgent', p.caseId, p.hearingId, p.userId);
        if (p.hearingId && !p.hearingId.endsWith('_next')) {
            CalendarBridge.remove('urgent', p.caseId, `${p.hearingId}_next`, p.userId);
        }
        return;
    }
    CalendarBridge.syncUrgentHearing({
        userId: p.userId,
        caseId: p.caseId,
        hearingId: p.hearingId,
        sessionDate: p.date,
        stageLabel: p.stageLabel,
        notes: p.notes,
        caseNo: p.caseNo,
        partiesSummary: p.partiesSummary,
        nextSessionDate: p.nextSessionDate,
    });
    p.stats.urgentHearings++;
}

export function syncOneUrgentCase(
    caseRecord: Record<string, unknown>,
    userId: string,
    stats: DossierSyncStats,
): void {
    const caseId = String(caseRecord.id ?? '').trim();
    if (!caseId) return;

    const caseNo =
        readStr(caseRecord, 'caseNumber') ||
        readStr(caseRecord, 'caseNo') ||
        undefined;
    const partiesSummary =
        clientNameFromPartiesList(caseRecord.parties) ||
        readStr(caseRecord, 'applicantName') ||
        undefined;

    syncOrRemoveUrgentDate({
        userId,
        caseId,
        hearingId: 'case_session_date',
        date: normalizeDateToYmd(readStr(caseRecord, 'sessionDate')),
        stageLabel: 'جلسة مستعجل',
        caseNo,
        partiesSummary,
        stats,
    });

    const topDeadline =
        normalizeDateToYmd(readStr(caseRecord, 'deadlineDate')) ||
        normalizeDateToYmd(readStr(caseRecord, 'notificationDate'));
    syncOrRemoveUrgentDate({
        userId,
        caseId,
        hearingId: 'case_deadline_date',
        date: topDeadline,
        stageLabel: 'مهلة مستعجل',
        caseNo,
        partiesSummary,
        stats,
    });

    syncOrRemoveUrgentDate({
        userId,
        caseId,
        hearingId: 'grievance_session_date',
        date: normalizeDateToYmd(readStr(caseRecord, 'grievanceSessionDate')),
        stageLabel: 'جلسة تظلم',
        caseNo,
        partiesSummary,
        stats,
    });

    const grievanceFirst =
        normalizeDateToYmd(readStr(caseRecord, 'grievanceFirstHearingDate')) ||
        normalizeDateToYmd(readStr(caseRecord, 'phase2FirstHearingDate'));
    syncOrRemoveUrgentDate({
        userId,
        caseId,
        hearingId: 'grievance_first_hearing',
        date: grievanceFirst,
        stageLabel: 'أول جلسة تظلم',
        caseNo,
        partiesSummary,
        stats,
    });

    const firstHearingRaw = normalizeDateToYmd(readStr(caseRecord, 'firstHearingDate'));
    const sessionForCompare = normalizeDateToYmd(readStr(caseRecord, 'sessionDate'));
    const firstHearingCalendarDate =
        firstHearingRaw && (!sessionForCompare || firstHearingRaw !== sessionForCompare)
            ? firstHearingRaw
            : null;
    syncOrRemoveUrgentDate({
        userId,
        caseId,
        hearingId: 'first_hearing_date',
        date: firstHearingCalendarDate,
        stageLabel: 'أول مرافعة',
        caseNo,
        partiesSummary,
        stats,
    });

    const hearings = Array.isArray(caseRecord.hearings) ? caseRecord.hearings : [];
    for (const h of hearings) {
        if (!isRecord(h)) continue;
        const hid = String(h.id ?? '').trim();
        if (!hid) continue;
        const session = normalizeDateToYmd(readStr(h, 'sessionDate'));
        const stage = readStr(h, 'stage');
        const stageLabel =
            stage === 'grievance' ? 'تظلم' : stage === 'pre_decision' ? 'ما قبل القرار' : 'جلسة مستعجل';
        syncOrRemoveUrgentDate({
            userId,
            caseId,
            hearingId: hid,
            date: session,
            stageLabel,
            caseNo,
            partiesSummary,
            notes: readStr(h, 'notes') || undefined,
            nextSessionDate: readStr(h, 'nextSessionDate') || undefined,
            stats,
        });
    }
}

export async function syncUrgentCases(userId: string, stats: DossierSyncStats): Promise<void> {
    const uid = resolveCalendarUserId(userId);
    try {
        const urgent = await UrgentActionsDB.getState(uid);
        const cases = Array.isArray(urgent?.cases) ? urgent.cases : [];
        for (const raw of cases) {
            if (isRecord(raw)) syncOneUrgentCase(raw, uid, stats);
        }
    } catch (err) {
        debug.warn('[calendarDossierSync] urgent sync failed:', err);
    }
}

/** يُبث بعد حفظ إضبارة مستعجل لإعادة مزامنة التقويم */
export function dispatchUrgentActionsChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(URGENT_ACTIONS_CHANGED_EVENT));
}
