/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 */
import { CalendarBridge, flushPendingCalendarSyncs, normalizeDateToYmd, resolveCalendarUserId } from '@/app/services/calendarBridge';
import { loadCriminalCasesRaw } from '@/app/utils/criminalCasesStorage';
import type { DossierSyncStats } from './types';
import { shouldExcludeCriminalFromCalendar } from './exclusions';
import {
    criminalCaseNumber,
    criminalClientName,
    EMPTY_STATS,
    isRecord,
    readEntityId,
    readStr,
} from './shared';
import { pruneOrphanedBridgedEventsForEntity, removeAllBridgedEventsForEntity } from './prune';

export function syncCriminalCaseToCalendar(
    caseRecord: Record<string, unknown>,
    userId?: string | null,
): void {
    const uid = resolveCalendarUserId(userId);
    const caseId = readEntityId(caseRecord);
    if (caseId == null) return;
    if (shouldExcludeCriminalFromCalendar(caseRecord)) {
        void removeAllBridgedEventsForEntity('criminal', caseId, uid);
        return;
    }
    syncOneCriminalCase(caseRecord, uid, EMPTY_STATS());
}


export function syncOneCriminalCase(caseRecord: Record<string, unknown>, userId: string, stats: DossierSyncStats): void {
    // 🛡️ WHITELIST صارم: للقضاء الجزائي، نُسجّل فقط tarikh الجلسة في تبويب المحاكمات (trials[].date)
    // — لا نُسجّل timelineEvents/location.nextHearingDate/verdict.appealDeadline/Sniffer.
    if (shouldExcludeCriminalFromCalendar(caseRecord)) return;
    const caseId = String(caseRecord.id ?? '').trim();
    if (!caseId) return;

    const caseNo = criminalCaseNumber(caseRecord);
    const clientName = criminalClientName(caseRecord) || undefined;

    // 🧹 جمع الـ sourceEventIds المتوقعة بعد المزامنة — لـ pruning أي حدث يتيم
    const expectedIds = new Set<string>();

    const trials = Array.isArray(caseRecord.trials) ? caseRecord.trials : [];
    for (const session of trials) {
        if (!isRecord(session)) continue;
        const sessionId = String(session.id ?? '').trim();
        const date = normalizeDateToYmd(readStr(session, 'date'));
        if (!sessionId || !date) continue;
        expectedIds.add(`trial_${sessionId}`);
        const nextSes = normalizeDateToYmd(readStr(session, 'nextSessionDate'));
        if (nextSes && nextSes !== date) expectedIds.add(`trial_${sessionId}_next`);
        const sessionNo = readStr(session, 'sessionNumber');
        const title = sessionNo ? `جلسة محاكمة ${sessionNo}` : 'جلسة محاكمة';
        CalendarBridge.syncCriminalTrialSession({
            userId,
            caseId,
            sessionId,
            date,
            title,
            nextSessionDate: readStr(session, 'nextSessionDate') || undefined,
            caseNo: caseNo || undefined,
            clientName,
        });
        stats.criminalTrials++;
        if (nextSes && nextSes !== date) stats.criminalTrials++;
    }

    // 🧹 احذف صراحةً كل المسارات السابقة الملغاة (timelineEvents/location/verdict)
    // — مفيد للقضايا التي حُفظت قبل تفعيل الـ whitelist.
    const timeline = Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : [];
    for (const ev of timeline) {
        if (!isRecord(ev)) continue;
        const eventId = String(ev.id ?? '').trim();
        if (eventId) CalendarBridge.remove('criminal', caseId, eventId, userId);
    }
    CalendarBridge.remove('criminal', caseId, 'location_next_hearing', userId);
    const verdictCards = Array.isArray(caseRecord.verdictCards) ? caseRecord.verdictCards : [];
    for (const card of verdictCards) {
        if (!isRecord(card)) continue;
        const cardId = String(card.id ?? '').trim();
        if (cardId) CalendarBridge.remove('criminal', caseId, `verdict_appeal_${cardId}`, userId);
    }
    for (const session of trials) {
        if (!isRecord(session)) continue;
        const sessionId = String(session.id ?? '').trim();
        if (sessionId) {
            CalendarBridge.remove('criminal', caseId, `trial_verdict_appeal_${sessionId}`, userId);
        }
    }

    // 🧹 Pruning: احذف أي حدث في CalendarDB لا ينتمي لـ expectedIds (Sniffer/orphans/legacy)
    void flushPendingCalendarSyncs().then(() =>
        pruneOrphanedBridgedEventsForEntity('criminal', caseId, expectedIds, userId),
    );
}

export function syncCriminalCases(userId: string, stats: DossierSyncStats): void {
    for (const raw of loadCriminalCasesRaw()) {
        if (isRecord(raw)) syncOneCriminalCase(raw, userId, stats);
    }
}

