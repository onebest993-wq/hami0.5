/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 */
import { CalendarBridge, buildStableBridgeId, resolveCalendarUserId } from '@/app/services/calendarBridge';
import { CalendarDB } from '@/app/services/cloud/lawyerCalendarCloud';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    EXECUTION_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
} from '@/app/domain/dossier/dossierStorageKeys';
import { debug } from '@/app/utils/debug';
import { loadCriminalCasesRaw } from '@/app/utils/criminalCasesStorage';
import { CRIMINAL_STORE_KEY } from '@/app/utils/criminalCasesStorageHelpers';
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
import { CALENDAR_EVENTS_STORAGE_KEY } from '@/app/services/calendar/calendarStorageKeys';
import { invalidateCalendarEventsCache } from '@/app/services/calendar/calendarEventsCache';
import {
    persistSecurePayloadWhenReady,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

/** أصل مشفَّر بارد وفارغ في الذاكرة ≠ «لا إضابير» — التقليم عندها يمسح مواعيد حيّة. */
function isSourceModuleStorageUnread(sourceModule: string): boolean {
    try {
        if (sourceModule === 'lawsuit') {
            return (
                SecureStoreService.isUnreadSync(LAWSUIT_FILES_STORAGE_KEY) &&
                loadLawsuitFilesRaw().length === 0
            );
        }
        if (sourceModule === 'execution') {
            return (
                SecureStoreService.isUnreadSync(EXECUTION_FILES_STORAGE_KEY) &&
                loadExecutionFilesRaw().length === 0
            );
        }
        if (sourceModule === 'criminal') {
            return (
                SecureStoreService.isUnreadSync(CRIMINAL_STORE_KEY) &&
                loadCriminalCasesRaw().length === 0
            );
        }
    } catch {
        return false;
    }
    return false;
}

export async function pruneOrphanedBridgedEventsForEntity(
    sourceModule: Parameters<typeof CalendarBridge.remove>[0],
    sourceEntityId: string | number,
    expectedSourceEventIds: Set<string>,
    userId?: string | null,
): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    const entityKey = String(sourceEntityId);
    try {
        const events = await CalendarDB.getAllStoredEvents();
        let removed = 0;
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            if (e.sourceModule !== sourceModule) continue;
            if (String(e.sourceEntityId) !== entityKey) continue;
            const evSourceId = String(e.sourceEventId ?? '');
            if (expectedSourceEventIds.has(evSourceId)) continue;
            await CalendarBridge.remove(sourceModule, entityKey, evSourceId, e.userId || uid);
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
        const events = await CalendarDB.getAllStoredEvents();
        let removed = 0;
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            if (e.sourceModule !== sourceModule) continue;
            if (String(e.sourceEntityId) !== entityKey) continue;
            await CalendarBridge.remove(sourceModule, entityKey, String(e.sourceEventId), e.userId || uid);
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
        const toRemove: any[] = [];
        const keep: any[] = [];
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) { keep.push(e); continue; }
            if (isSourceModuleStorageUnread(String(e.sourceModule ?? ''))) { keep.push(e); continue; }
            const stableId = buildStableBridgeId(
                String(e.sourceModule ?? ''),
                String(e.sourceEntityId ?? ''),
                String(e.sourceEventId ?? ''),
            );
            if (valid.has(stableId)) { keep.push(e); continue; }
            toRemove.push(e);
        }
        const removed = toRemove.length;
        if (removed === 0) return 0;

        try {
            const payload = JSON.stringify(keep);
            try {
                SecureStoreService.setItemSync(CALENDAR_EVENTS_STORAGE_KEY, payload);
            } catch {
                /* guard may reject — persist layer decides */
            }
            const snapshot = await import('@/app/services/calendar/calendarLocalSnapshot');
            snapshot.clearCalendarEventsLocalStorageMirror();
            try {
                await persistSecurePayloadWhenReady(
                    CALENDAR_EVENTS_STORAGE_KEY,
                    payload,
                    { skipIfUnchanged: false },
                );
            } catch {
                /* IndexedDB layer may reject — sync cache already has correct value */
            }

            for (const e of toRemove) {
                try {
                    const eventUserId = e.userId || uid;
                    await CalendarBridge.remove(
                        e.sourceModule!,
                        String(e.sourceEntityId),
                        String(e.sourceEventId),
                        eventUserId,
                    );
                } catch { /* swallow per-event */ }
            }

            const tomb = await import('@/app/services/calendarTombstones');
            for (const ev of toRemove) {
                try { await tomb.recordTombstone(String(ev.userId || uid), String(ev.id)); } catch { /* ignore */ }
            }
        } catch (batchErr) {
            debug.warn('[calendarDossierSync] prune batch-save failed, falling back to per-event:', batchErr);
            for (const e of toRemove) {
                try {
                    const eventUserId = e.userId || uid;
                    await CalendarBridge.remove(
                        e.sourceModule!,
                        String(e.sourceEntityId),
                        String(e.sourceEventId),
                        eventUserId,
                    );
                } catch { /* swallow per-event */ }
            }
        }

        const impactedUserIds = new Set<string>();
        for (const ev of toRemove) if (ev.userId) impactedUserIds.add(ev.userId);
        impactedUserIds.add(uid);
        for (const u of impactedUserIds) invalidateCalendarEventsCache(u);

        dispatchCalendarUpdated();
        return removed;
    } catch (err) {
        debug.warn('[calendarDossierSync] prune failed:', err);
        return 0;
    }
}

export async function purgeNonWhitelistedBridgedEvents(userId?: string | null): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    try {
        const events = await CalendarDB.getAllStoredEvents();
        const toRemove: any[] = [];
        const keep: any[] = [];
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) { keep.push(e); continue; }
            const mod = e.sourceModule;
            const entityId = String(e.sourceEntityId ?? '');
            const eventId = String(e.sourceEventId ?? '');
            if (!mod || !entityId || !eventId) { keep.push(e); continue; }

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
                toRemove.push(e);
            } else {
                keep.push(e);
            }
        }
        const removed = toRemove.length;
        if (removed === 0) return 0;

        try {
            const payload = JSON.stringify(keep);
            try {
                SecureStoreService.setItemSync(CALENDAR_EVENTS_STORAGE_KEY, payload);
            } catch {
                /* guard may reject — persist layer decides */
            }
            const snapshot = await import('@/app/services/calendar/calendarLocalSnapshot');
            snapshot.clearCalendarEventsLocalStorageMirror();
            try {
                await persistSecurePayloadWhenReady(
                    CALENDAR_EVENTS_STORAGE_KEY,
                    payload,
                    { skipIfUnchanged: false },
                );
            } catch {
                /* IndexedDB layer may reject — sync cache already has correct value */
            }

            for (const e of toRemove) {
                try {
                    const mod = e.sourceModule;
                    const entityId = String(e.sourceEntityId ?? '');
                    const eventId = String(e.sourceEventId ?? '');
                    if (!mod || !entityId || !eventId) continue;
                    await CalendarBridge.remove(mod, entityId, eventId, e.userId || uid);
                } catch { /* swallow per-event */ }
            }

            const tomb = await import('@/app/services/calendarTombstones');
            for (const ev of toRemove) {
                try { await tomb.recordTombstone(String(ev.userId || uid), String(ev.id)); } catch { /* ignore */ }
            }
        } catch (batchErr) {
            debug.warn('[calendarDossierSync] purgeNonWhitelisted batch-save failed, falling back to per-event:', batchErr);
            for (const e of toRemove) {
                try {
                    const mod = e.sourceModule;
                    const entityId = String(e.sourceEntityId ?? '');
                    const eventId = String(e.sourceEventId ?? '');
                    if (!mod || !entityId || !eventId) continue;
                    await CalendarBridge.remove(mod, entityId, eventId, e.userId || uid);
                } catch { /* swallow per-event */ }
            }
        }

        const impactedUserIds = new Set<string>();
        for (const ev of toRemove) if (ev.userId) impactedUserIds.add(ev.userId);
        impactedUserIds.add(uid);
        for (const u of impactedUserIds) invalidateCalendarEventsCache(u);

        dispatchCalendarUpdated();
        return removed;
    } catch (err) {
        debug.warn('[calendarDossierSync] purgeNonWhitelistedBridgedEvents failed:', err);
        return 0;
    }
}

/** يزيل من التقويم كل موعد مربوط بمصدر نظامي/محسوب/سجل قديم */
export async function purgeInauthenticBridgedEvents(userId?: string | null): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    try {
        const events = await CalendarDB.getAllStoredEvents();
        const toRemove: any[] = [];
        const keep: any[] = [];
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) { keep.push(e); continue; }
            if (isUserAuthoredBridgedCalendarEvent(e)) { keep.push(e); continue; }
            const mod = e.sourceModule;
            const entityId = String(e.sourceEntityId ?? '');
            const eventId = String(e.sourceEventId ?? '');
            if (!mod || !entityId || !eventId) {
                toRemove.push({ ...e, __malformed: true });
                continue;
            }
            if (isSyntheticBridgeSourceEventId(eventId)) {
                toRemove.push(e);
            } else {
                keep.push(e);
            }
        }
        const removed = toRemove.length;
        if (removed === 0) return 0;

        try {
            const payload = JSON.stringify(keep);
            try {
                SecureStoreService.setItemSync(CALENDAR_EVENTS_STORAGE_KEY, payload);
            } catch {
                /* guard may reject — persist layer decides */
            }
            const snapshot = await import('@/app/services/calendar/calendarLocalSnapshot');
            snapshot.clearCalendarEventsLocalStorageMirror();
            try {
                await persistSecurePayloadWhenReady(
                    CALENDAR_EVENTS_STORAGE_KEY,
                    payload,
                    { skipIfUnchanged: false },
                );
            } catch {
                /* IndexedDB layer may reject — sync cache already has correct value */
            }

            for (const e of toRemove) {
                try {
                    const eventUserId = e.userId || uid;
                    const mod = e.sourceModule;
                    const entityId = String(e.sourceEntityId ?? '');
                    const eventId = String(e.sourceEventId ?? '');
                    if (!mod || !entityId || !eventId || e.__malformed) {
                        await CalendarDB.deleteEvent(e.id, eventUserId);
                        continue;
                    }
                    await CalendarBridge.remove(mod, entityId, eventId, eventUserId);
                } catch { /* swallow per-event */ }
            }

            const tomb = await import('@/app/services/calendarTombstones');
            for (const ev of toRemove) {
                try { await tomb.recordTombstone(String(ev.userId || uid), String(ev.id)); } catch { /* ignore */ }
            }
        } catch (batchErr) {
            debug.warn('[calendarDossierSync] purgeInauthentic batch-save failed, falling back to per-event:', batchErr);
            for (const e of toRemove) {
                try {
                    const eventUserId = e.userId || uid;
                    const mod = e.sourceModule;
                    const entityId = String(e.sourceEntityId ?? '');
                    const eventId = String(e.sourceEventId ?? '');
                    if (!mod || !entityId || !eventId || e.__malformed) {
                        await CalendarDB.deleteEvent(e.id, eventUserId);
                        continue;
                    }
                    await CalendarBridge.remove(mod, entityId, eventId, eventUserId);
                } catch { /* swallow per-event */ }
            }
        }

        const impactedUserIds = new Set<string>();
        for (const ev of toRemove) if (ev.userId) impactedUserIds.add(ev.userId);
        impactedUserIds.add(uid);
        for (const u of impactedUserIds) invalidateCalendarEventsCache(u);

        dispatchCalendarUpdated();
        return removed;
    } catch (err) {
        debug.warn('[calendarDossierSync] purgeInauthenticBridgedEvents failed:', err);
        return 0;
    }
}
