import { CalendarDB } from '@/app/services/cloud/lawyerCalendarCloud';
import type { CalendarEvent } from '@/app/services/calendar/calendarTypes';
import { debug } from '@/app/utils/debug';
import type { CalendarBridgePayload, CalendarSourceModule } from '@/app/services/calendarBridge.types';
import {
    buildStableBridgeId,
    normalizeDateToYmd,
    resolveCalendarUserId,
    moduleLabelAr,
    buildNotesBlock,
    notifyCalendarUpdated,
} from './core';

interface PendingUpsert {
    payload: CalendarBridgePayload;
    resolve: () => void;
    reject: (err: unknown) => void;
}

type SyncQueueState = {
    pendingUpserts: PendingUpsert[];
    flushScheduled: boolean;
    activeFlushPromise: Promise<void>;
};

/** حالة موحّدة على globalThis — تبقى سليمة بعد Vite HMR */
const SYNC_QUEUE_KEY = '__hamiCalendarSyncQueue';

function getSyncQueue(): SyncQueueState {
    const g = globalThis as typeof globalThis & { [SYNC_QUEUE_KEY]?: SyncQueueState };
    if (!g[SYNC_QUEUE_KEY]) {
        g[SYNC_QUEUE_KEY] = {
            pendingUpserts: [],
            flushScheduled: false,
            activeFlushPromise: Promise.resolve(),
        };
    }
    return g[SYNC_QUEUE_KEY];
}

function stableBridgeId(sourceModule: string, sourceEntityId: string, sourceEventId: string): string {
    return buildStableBridgeId(sourceModule, sourceEntityId, sourceEventId);
}

function buildEventFromPayload(
    payload: CalendarBridgePayload,
    userId: string,
    date: string,
    prev: CalendarEvent | undefined,
): CalendarEvent {
    const now = new Date().toISOString();
    const id = stableBridgeId(payload.sourceModule, payload.sourceEntityId, payload.sourceEventId);
    const event: CalendarEvent = {
        id,
        userId,
        title: payload.title.trim() || 'موعد',
        date,
        time: payload.time,
        type: payload.type ?? (payload.sourceModule === 'execution' ? 'execution' : 'hearing'),
        location: payload.location ?? payload.court,
        notes: buildNotesBlock(payload),
        clientName: payload.clientName,
        clientPhone: payload.clientPhone,
        caseId: payload.linkedDossierId
            ? String(payload.linkedDossierId)
            : String(payload.sourceEntityId),
        caseNo: payload.caseNo,
        isCompleted: payload.isCompleted ?? false,
        createdAt: prev?.createdAt ?? now,
        updatedAt: now,
        sourceModule: payload.sourceModule,
        sourceEntityId: String(payload.sourceEntityId),
        sourceEventId: String(payload.sourceEventId),
        partiesSummary: payload.partiesSummary,
        court: payload.court,
        sourceLabel: payload.sourceLabel ?? moduleLabelAr(payload.sourceModule),
    };
    if (!payload.caseNo && prev?.caseNo) event.caseNo = prev.caseNo;
    if (!payload.clientName && prev?.clientName) event.clientName = prev.clientName;
    if (!payload.court && prev?.court) event.court = prev.court;
    if (!payload.partiesSummary && prev?.partiesSummary) event.partiesSummary = prev.partiesSummary;
    return event;
}

async function processFlushBatch(): Promise<void> {
    const queue = getSyncQueue();
    if (queue.pendingUpserts.length === 0) return;
    const batch = queue.pendingUpserts;
    queue.pendingUpserts = [];

    try {
        const byUser = new Map<string, PendingUpsert[]>();
        for (const it of batch) {
            const uid = resolveCalendarUserId(it.payload.userId);
            const list = byUser.get(uid) ?? [];
            list.push(it);
            byUser.set(uid, list);
        }

        let dispatchedAny = false;
        for (const [uid, items] of byUser) {
            try {
                const existing = await CalendarDB.getEvents(uid);
                const byId = new Map<string, CalendarEvent>();
                for (const e of existing) byId.set(e.id, e);

                const eventsToSave: CalendarEvent[] = [];
                for (const it of items) {
                    const date = normalizeDateToYmd(it.payload.date);
                    if (!date) {
                        it.resolve();
                        continue;
                    }
                    const id = stableBridgeId(
                        it.payload.sourceModule,
                        it.payload.sourceEntityId,
                        it.payload.sourceEventId,
                    );
                    const event = buildEventFromPayload(it.payload, uid, date, byId.get(id));
                    eventsToSave.push(event);
                }
                if (eventsToSave.length > 0) {
                    await CalendarDB.saveEventsBatch(eventsToSave);
                    dispatchedAny = true;
                }
                for (const it of items) it.resolve();
            } catch (err) {
                debug.warn('[CalendarBridge] batch upsert failed (non-fatal):', err);
                for (const it of items) it.resolve();
            }
        }
        if (dispatchedAny) notifyCalendarUpdated();
    } catch (err) {
        debug.warn('[CalendarBridge] processFlushBatch fatal:', err);
        for (const it of batch) it.resolve();
    }
}

function scheduleFlush(): void {
    const queue = getSyncQueue();
    if (queue.flushScheduled) return;
    queue.flushScheduled = true;
    queueMicrotask(() => {
        const q = getSyncQueue();
        q.flushScheduled = false;
        const run = processFlushBatch();
        q.activeFlushPromise = q.activeFlushPromise.then(() => run).catch(() => undefined);
    });
}

/** ينتظر اكتمال كل عمليات الربط الجارية قبل التنظيف أو القراءة */
export async function flushPendingCalendarSyncs(): Promise<void> {
    const queue = getSyncQueue();
    if (queue.flushScheduled || queue.pendingUpserts.length > 0) {
        queue.flushScheduled = false;
        const run = processFlushBatch();
        queue.activeFlushPromise = queue.activeFlushPromise.then(() => run).catch(() => undefined);
    }
    await queue.activeFlushPromise;
    await queue.activeFlushPromise;
}

export function fireAndForgetCalendarSync(payload: CalendarBridgePayload): void {
    new Promise<void>((resolve, reject) => {
        getSyncQueue().pendingUpserts.push({ payload, resolve, reject });
        scheduleFlush();
    }).catch((err) => {
        debug.warn('[CalendarBridge] queued upsert failed (non-fatal):', err);
    });
}

export async function upsertCalendarFromModule(payload: CalendarBridgePayload): Promise<void> {
    try {
        const userId = resolveCalendarUserId(payload.userId);
        const date = normalizeDateToYmd(payload.date);
        if (!date) return;

        const existing = await CalendarDB.getEvents(userId);
        const id = stableBridgeId(payload.sourceModule, payload.sourceEntityId, payload.sourceEventId);
        const prev = existing.find((e) => e.id === id);
        const event = buildEventFromPayload(payload, userId, date, prev);

        await CalendarDB.saveEvent(event);
        notifyCalendarUpdated();
    } catch (err) {
        debug.warn('[CalendarBridge] upsert failed (non-fatal):', err);
    }
}

export async function removeCalendarBySource(
    sourceModule: CalendarSourceModule,
    sourceEntityId: string,
    sourceEventId: string,
    userId?: string | null,
): Promise<void> {
    try {
        const uid = resolveCalendarUserId(userId);
        const id = stableBridgeId(sourceModule, sourceEntityId, sourceEventId);
        await CalendarDB.deleteEvent(id, uid);
        notifyCalendarUpdated();
    } catch (err) {
        debug.warn('[CalendarBridge] remove failed (non-fatal):', err);
    }
}
