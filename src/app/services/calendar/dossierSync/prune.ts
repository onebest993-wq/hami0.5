/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 */
import { CalendarBridge, resolveCalendarUserId } from '@/app/services/calendarBridge';
import { CalendarDB } from '@/app/services/cloud/lawyerCalendarCloud';
import { debug } from '@/app/utils/debug';
import { loadCriminalCasesRaw } from '@/app/utils/criminalCasesStorage';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { isBridgedCalendarEvent } from '@/app/services/calendarBridgePersistence';
import {
    isSyntheticBridgeSourceEventId,
    isUserAuthoredBridgedCalendarEvent,
} from '@/app/services/calendarAuthenticity';
import type { PruneOptions } from './types';
import {
    findExecutionFile,
    findLawsuitFile,
    shouldExcludeCriminalFromCalendar,
    shouldExcludeExecutionFromCalendar,
    shouldExcludeLawsuitFromCalendar,
} from './exclusions';
import { dispatchCalendarUpdated, isRecord, readEntityId } from './shared';
import { collectValidBridgeIdsAsync } from './pruneValidIds';

export async function pruneOrphanedBridgedEventsForEntity(
    sourceModule: Parameters<typeof CalendarBridge.remove>[0],
    sourceEntityId: string | number,
    expectedSourceEventIds: Set<string>,
    userId?: string | null,
): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    const entityKey = String(sourceEntityId);
    try {
        const events = await CalendarDB.getEvents(uid);
        let removed = 0;
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            if (e.sourceModule !== sourceModule) continue;
            if (String(e.sourceEntityId) !== entityKey) continue;
            const evSourceId = String(e.sourceEventId ?? '');
            if (expectedSourceEventIds.has(evSourceId)) continue;
            await CalendarBridge.remove(sourceModule, entityKey, evSourceId, uid);
            removed++;
        }
        if (removed > 0) dispatchCalendarUpdated();
        return removed;
    } catch (err) {
        debug.warn('[calendarDossierSync] pruneOrphanedBridgedEventsForEntity failed:', err);
        return 0;
    }
}

/** إزالة كل أحداث التقويم المربوطة بإضبارة (دعوى / تنفيذ / …) */
export async function removeAllBridgedEventsForEntity(
    sourceModule: Parameters<typeof CalendarBridge.remove>[0],
    sourceEntityId: string | number,
    userId?: string | null,
): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    const entityKey = String(sourceEntityId);
    try {
        const events = await CalendarDB.getEvents(uid);
        let removed = 0;
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            if (e.sourceModule !== sourceModule) continue;
            if (String(e.sourceEntityId) !== entityKey) continue;
            await CalendarBridge.remove(sourceModule, entityKey, String(e.sourceEventId), uid);
            removed++;
        }
        if (removed > 0) dispatchCalendarUpdated();
        return removed;
    } catch (err) {
        debug.warn('[calendarDossierSync] removeAllBridgedEventsForEntity failed:', err);
        return 0;
    }
}

export async function purgeInactiveEntityBridgedEvents(userId?: string | null): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    try {
        const events = await CalendarDB.getAllStoredEvents();
        let removed = 0;
        let reassigned = 0;
        const now = new Date().toISOString();
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            const mod = e.sourceModule;
            const entityId = String(e.sourceEntityId ?? '');
            const eventUserId = e.userId || uid;
            if (!mod || !entityId) {
                await CalendarDB.deleteEvent(e.id, eventUserId);
                removed++;
                continue;
            }
            if (mod === 'lawsuit') {
                const file = findLawsuitFile(entityId);
                if (!file || shouldExcludeLawsuitFromCalendar(file)) {
                    await CalendarBridge.remove('lawsuit', entityId, String(e.sourceEventId), eventUserId);
                    removed++;
                } else if (e.userId !== uid) {
                    await CalendarDB.saveEvent({ ...e, userId: uid, updatedAt: now });
                    reassigned++;
                }
                continue;
            }
            if (mod === 'execution') {
                const file = findExecutionFile(entityId);
                if (!file || shouldExcludeExecutionFromCalendar(file)) {
                    await CalendarBridge.remove('execution', entityId, String(e.sourceEventId), eventUserId);
                    removed++;
                } else if (e.userId !== uid) {
                    await CalendarDB.saveEvent({ ...e, userId: uid, updatedAt: now });
                    reassigned++;
                }
            }
        }
        if (removed > 0 || reassigned > 0) dispatchCalendarUpdated();
        return removed;
    } catch (err) {
        debug.warn('[calendarDossierSync] purgeInactiveEntityBridgedEvents failed:', err);
        return 0;
    }
}

/**
 * يزيل كل مواعيد التقويم المربوطة بإضابير مؤرشفة/محذوفة/في السلة
 * (يُستدعى قبل وبعد المزامنة لتفادي إعادة الرفع من تخزين متأخر).
 */
export async function purgeExcludedDossierBridgedEvents(userId?: string | null): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    let removed = 0;
    for (const raw of loadLawsuitFilesRaw()) {
        if (!isRecord(raw) || !shouldExcludeLawsuitFromCalendar(raw)) continue;
        const fileId = readEntityId(raw);
        if (fileId == null) continue;
        removed += await removeAllBridgedEventsForEntity('lawsuit', fileId, uid);
    }
    for (const raw of loadExecutionFilesRaw()) {
        if (!isRecord(raw) || !shouldExcludeExecutionFromCalendar(raw)) continue;
        const executionId = readEntityId(raw);
        if (executionId == null) continue;
        removed += await removeAllBridgedEventsForEntity('execution', executionId, uid);
    }
    for (const raw of loadCriminalCasesRaw()) {
        if (!isRecord(raw) || !shouldExcludeCriminalFromCalendar(raw)) continue;
        const caseId = readEntityId(raw);
        if (caseId == null) continue;
        removed += await removeAllBridgedEventsForEntity('criminal', caseId, uid);
    }
    if (removed > 0) dispatchCalendarUpdated();
    return removed;
}

/** يحذف من التقويم أحداث الربط التي لم يعد مصدرها موجوداً في الإضابير */
export async function pruneOrphanedBridgeEvents(
    userId?: string | null,
    options?: PruneOptions,
): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    const valid = await collectValidBridgeIdsAsync(uid, options);
    try {
        const events = await CalendarDB.getAllStoredEvents();
        let removed = 0;
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            if (valid.has(e.id)) continue;
            const eventUserId = e.userId || uid;
            await CalendarBridge.remove(
                e.sourceModule!,
                String(e.sourceEntityId),
                String(e.sourceEventId),
                eventUserId,
            );
            removed++;
        }
        if (removed > 0) {
            dispatchCalendarUpdated();
        }
        return removed;
    } catch (err) {
        debug.warn('[calendarDossierSync] prune failed:', err);
        return 0;
    }
}

export async function purgeNonWhitelistedBridgedEvents(userId?: string | null): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    let removed = 0;
    try {
        const events = await CalendarDB.getAllStoredEvents();
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            const mod = e.sourceModule;
            const entityId = String(e.sourceEntityId ?? '');
            const eventId = String(e.sourceEventId ?? '');
            if (!mod || !entityId || !eventId) continue;

            const isFieldSniffer = eventId.startsWith('field_');
            const isLegacySynthetic =
                eventId.startsWith('legacy_') ||
                eventId.startsWith('appeal_') ||
                eventId.startsWith('verdict_appeal_') ||
                eventId.startsWith('trial_verdict_appeal_') ||
                eventId === 'location_next_hearing';
            const isUrgentOrTransactionOrNote =
                mod === 'urgent' || mod === 'transaction' || mod === 'note' || mod === 'task';
            const isCivilOrExecTask =
                (mod === 'lawsuit' || mod === 'execution') && eventId.startsWith('task_');
            const isCivilNonAppointment =
                mod === 'lawsuit' &&
                !eventId.startsWith('task_') &&
                (eventId.startsWith('appeal_stage_') ||
                    eventId === 'nextDate' ||
                    eventId === 'nextHearing');
            const isCriminalNonTrial = mod === 'criminal' && !eventId.startsWith('trial_');

            const shouldRemove =
                isFieldSniffer ||
                isLegacySynthetic ||
                isUrgentOrTransactionOrNote ||
                isCivilOrExecTask ||
                isCivilNonAppointment ||
                isCriminalNonTrial;

            if (shouldRemove) {
                await CalendarBridge.remove(mod, entityId, eventId, e.userId || uid);
                removed++;
            }
        }
        if (removed > 0) dispatchCalendarUpdated();
    } catch (err) {
        debug.warn('[calendarDossierSync] purgeNonWhitelistedBridgedEvents failed:', err);
    }
    return removed;
}

/** يزيل من التقويم كل موعد مربوط بمصدر نظامي/محسوب/سجل قديم */
export async function purgeInauthenticBridgedEvents(userId?: string | null): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    let removed = 0;
    try {
        const events = await CalendarDB.getAllStoredEvents();
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            if (isUserAuthoredBridgedCalendarEvent(e)) continue;
            const mod = e.sourceModule;
            const entityId = String(e.sourceEntityId ?? '');
            const eventId = String(e.sourceEventId ?? '');
            if (!mod || !entityId || !eventId) {
                await CalendarDB.deleteEvent(e.id, e.userId || uid);
                removed++;
                continue;
            }
            if (isSyntheticBridgeSourceEventId(eventId)) {
                await CalendarBridge.remove(mod, entityId, eventId, e.userId || uid);
                removed++;
            }
        }
        if (removed > 0) dispatchCalendarUpdated();
    } catch (err) {
        debug.warn('[calendarDossierSync] purgeInauthenticBridgedEvents failed:', err);
    }
    return removed;
}
