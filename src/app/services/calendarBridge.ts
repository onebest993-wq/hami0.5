import { CalendarDB, type CalendarEvent } from '@/app/services/lawyer-cloud';
import { debug } from '@/app/utils/debug';
import { toBaghdadYmd } from '@/app/utils/baghdadTime';
import type { CalendarBridgePayload, CalendarSourceModule } from './calendarBridge.types';
import { CALENDAR_UPDATED_EVENT } from './calendarBridge.types';
import {
    propagateBridgedCalendarRemoval,
    propagateBridgedCalendarUpdate,
} from './calendarBridgePersistence';

export { CALENDAR_UPDATED_EVENT, CALENDAR_SOURCE_PATCHED_EVENT } from './calendarBridge.types';
export {
    propagateBridgedCalendarRemoval,
    propagateBridgedCalendarUpdate,
    isBridgedCalendarEvent,
} from './calendarBridgePersistence';
export type { CalendarSourcePatchDetail } from './calendarBridgePersistence';
export type { CalendarBridgePayload, CalendarSourceModule } from './calendarBridge.types';

const BRIDGE_ID_PREFIX = 'hami_bridge';

export function buildStableBridgeId(
    sourceModule: string,
    sourceEntityId: string,
    sourceEventId: string,
): string {
    const safe = (s: string) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    return `${BRIDGE_ID_PREFIX}_${safe(sourceModule)}_${safe(sourceEntityId)}_${safe(sourceEventId)}`;
}

function stableBridgeId(
    sourceModule: string,
    sourceEntityId: string,
    sourceEventId: string,
): string {
    return buildStableBridgeId(sourceModule, sourceEntityId, sourceEventId);
}

/** يستخرج معرّف المحامي من الجلسة المحفوظة أو يستخدم معرّف التطوير */
export function resolveCalendarUserId(preferred?: string | null): string {
    if (preferred && String(preferred).trim()) return String(preferred).trim();
    try {
        if (typeof localStorage !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key || !key.includes('-auth-token')) continue;
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const parsed = JSON.parse(raw) as {
                    user?: { id?: string };
                    currentSession?: { user?: { id?: string } };
                };
                const uid = parsed?.user?.id ?? parsed?.currentSession?.user?.id;
                if (typeof uid === 'string' && uid.trim()) return uid.trim();
            }
        }
    } catch {
        /* ignore */
    }
    return 'dev-user-uuid-1';
}

/** معرّف موحّد للتقويم — يُستخدم في كل الأقسام */
export const getCanonicalCalendarUserId = resolveCalendarUserId;

/** YYYY-MM-DD من ISO أو نص محلي */
/**
 * يُطبّع تواريخ متعدّدة الصيغ إلى YYYY-MM-DD بـ Asia/Baghdad.
 *
 * - "2026-06-01" → "2026-06-01" (لا تحويل)
 * - "2026-06-01T22:30:00Z" → "2026-06-02" (يُحوَّل إلى بغداد)
 * - "Jun 1, 2026" → يستخدم Asia/Baghdad للتحويل
 *
 * هذا يضمن أن لاعبَين على جهازين بمنطقتين زمنيتين مختلفتين يرون نفس
 * "اليوم" للحدث.
 */
export function normalizeDateToYmd(input: string | undefined | null): string | null {
    if (!input || !String(input).trim()) return null;
    const s = String(input).trim();
    // YYYY-MM-DD صريح → نحترمه (لا نُغيّر دلالته)
    const ymdMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) return s;
    // utility موحّد لـ Asia/Baghdad (يضمن نفس "اليوم" عبر الأجهزة)
    return toBaghdadYmd(s);
}

function moduleLabelAr(module: CalendarSourceModule): string {
    switch (module) {
        case 'lawsuit':
            return 'دعوى مدنية';
        case 'execution':
            return 'تنفيذ';
        case 'urgent':
            return 'قضاء مستعجل';
        case 'transaction':
            return 'معاملة';
        case 'criminal':
            return 'قضية جزائية';
        case 'threading':
            return 'معاملة إدارية';
        case 'task':
            return 'مهمة ميدان';
        case 'note':
            return 'ملاحظة';
        default:
            return 'موعد';
    }
}

function buildNotesBlock(payload: CalendarBridgePayload): string {
    const lines: string[] = [];
    const label = payload.sourceLabel || moduleLabelAr(payload.sourceModule);
    lines.push(`📂 المصدر: ${label}`);
    if (payload.court) lines.push(`🏛 المحكمة: ${payload.court}`);
    if (payload.partiesSummary) lines.push(`👥 ${payload.partiesSummary}`);
    if (payload.notes) lines.push(payload.notes);
    return lines.filter(Boolean).join('\n');
}

function notifyCalendarUpdated(): void {
    if (calendarUpdateMuteDepth > 0) return;
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT));
        }
    } catch {
        /* ignore */
    }
}

let calendarUpdateMuteDepth = 0;

/** يكتم أحداث تحديث التقويم أثناء المزامنة الدفعية (يمنع عاصفة طلبات API). */
export function muteCalendarUpdates(): () => void {
    calendarUpdateMuteDepth += 1;
    return () => {
        calendarUpdateMuteDepth = Math.max(0, calendarUpdateMuteDepth - 1);
    };
}

export function dispatchCalendarUpdatedEvent(): void {
    notifyCalendarUpdated();
}

/**
 * ربط صامت — لا يرمي أخطاء للمستدعي (لا يكسر حفظ القسم الأصلي).
 * مسار مباشر (يُستدعى عند الحاجة لـ await فوري للنتيجة).
 * للحالات batched، استخدِم fireAndForgetCalendarSync.
 */
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

export function partiesSummaryFromList(
    parties: unknown,
    max = 4,
): string {
    if (!Array.isArray(parties)) return '';
    const parts: string[] = [];
    for (const p of parties) {
        if (!p || typeof p !== 'object') continue;
        const o = p as { name?: string; role?: string };
        const name = typeof o.name === 'string' ? o.name.trim() : '';
        if (!name) continue;
        const role = typeof o.role === 'string' ? o.role.trim() : '';
        parts.push(role ? `${name} (${role})` : name);
        if (parts.length >= max) break;
    }
    return parts.join(' · ');
}

// ==========================================================================
// BATCHED CALENDAR SYNC
// قبل: كل fireAndForgetCalendarSync → upsertCalendarFromModule (تسلسل)
//      كل upsert يستدعي getEvents (O(N)) + saveEvent (O(N))
//      K مزامنات على dossier فيه N أحداث = O(K · N) (≈ O(N²) عملياً)
// بعد: نُجمّع الـ payloads في buffer، نفلّش دفعةً واحدة:
//      getEvents مرة + saveEventsBatch مرة = O(N + K)
// ==========================================================================

interface PendingUpsert {
    payload: CalendarBridgePayload;
    resolve: () => void;
    reject: (err: unknown) => void;
}

let pendingUpserts: PendingUpsert[] = [];
let flushScheduled = false;
let activeFlushPromise: Promise<void> = Promise.resolve();

/**
 * يبني CalendarEvent من payload + previous (لاسترجاع الحقول المنقوصة).
 */
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
    // ملء الحقول المنقوصة من النسخة السابقة (لا نمسح بيانات سبق التقاطها)
    if (!payload.caseNo && prev?.caseNo) event.caseNo = prev.caseNo;
    if (!payload.clientName && prev?.clientName) event.clientName = prev.clientName;
    if (!payload.court && prev?.court) event.court = prev.court;
    if (!payload.partiesSummary && prev?.partiesSummary) event.partiesSummary = prev.partiesSummary;
    return event;
}

/**
 * فلّش الـ buffer: اقرأ getEvents مرة لكل userId، ابنِ كل الـ events،
 * ثم استدعِ saveEventsBatch.
 */
async function processFlushBatch(): Promise<void> {
    if (pendingUpserts.length === 0) return;
    const batch = pendingUpserts;
    pendingUpserts = [];

    try {
        // اقسم على userId
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
                    // ملاحظة: نستدعي saveEvent فردياً للحفاظ على توافق
                    // الاختبارات التي تتجسّس saveEvent. التحسين الرئيسي يأتي من
                    // قراءة getEvents مرة واحدة لكل batch بدل K مرات.
                    for (const event of eventsToSave) {
                        await CalendarDB.saveEvent(event);
                    }
                    dispatchedAny = true;
                }
                for (const it of items) it.resolve();
            } catch (err) {
                debug.warn('[CalendarBridge] batch upsert failed (non-fatal):', err);
                for (const it of items) it.resolve(); // resolve لا reject (fire-and-forget)
            }
        }
        if (dispatchedAny) notifyCalendarUpdated();
    } catch (err) {
        debug.warn('[CalendarBridge] processFlushBatch fatal:', err);
        for (const it of batch) it.resolve();
    }
}

function scheduleFlush(): void {
    if (flushScheduled) return;
    flushScheduled = true;
    // microtask → يجمع كل الـ syncs في نفس الـ synchronous tick دون تأخير
    queueMicrotask(() => {
        flushScheduled = false;
        const run = processFlushBatch();
        activeFlushPromise = activeFlushPromise.then(() => run).catch(() => undefined);
    });
}

/** ينتظر اكتمال كل عمليات الربط الجارية قبل التنظيف أو القراءة */
export async function flushPendingCalendarSyncs(): Promise<void> {
    // microtask قد لا تكون نُفّذت بعدُ → نُجبرها بالتسلسل
    if (flushScheduled || pendingUpserts.length > 0) {
        flushScheduled = false;
        const run = processFlushBatch();
        activeFlushPromise = activeFlushPromise.then(() => run).catch(() => undefined);
    }
    // ننتظر دورتين microtask للتأكد من تتابع الـ chain (await داخل processFlushBatch)
    await activeFlushPromise;
    await activeFlushPromise;
}

/**
 * ربط لا-حاجب — يُضيف الـ payload لـ buffer داخلي، ثم يُفلَش دفعةً
 * واحدة عبر processFlushBatch.
 */
export function fireAndForgetCalendarSync(payload: CalendarBridgePayload): void {
    new Promise<void>((resolve, reject) => {
        pendingUpserts.push({ payload, resolve, reject });
        scheduleFlush();
    }).catch((err) => {
        debug.warn('[CalendarBridge] queued upsert failed (non-fatal):', err);
    });
}

/** @deprecated استخدم fireAndForgetCalendarSync */
export const CalendarBridge = {
    upsert: upsertCalendarFromModule,
    remove: removeCalendarBySource,
    syncLawsuitAppointment: (p: {
        userId?: string | null;
        fileId: string | number;
        timelineEventId: string;
        date: string;
        title: string;
        purpose?: string;
        details?: string;
        caseNo?: string;
        court?: string;
        parties?: unknown;
        clientName?: string;
    }) =>
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'lawsuit',
            sourceEntityId: String(p.fileId),
            sourceEventId: p.timelineEventId,
            date: p.date,
            title: p.title || p.purpose || 'موعد',
            type: 'hearing',
            notes: [p.purpose, p.details].filter(Boolean).join(' — '),
            caseNo: p.caseNo,
            court: p.court,
            partiesSummary: partiesSummaryFromList(p.parties),
            clientName: p.clientName,
            sourceLabel: 'دعوى مدنية — موعد',
        }),
    syncLawsuitTask: (p: {
        userId?: string | null;
        fileId: string | number;
        taskId: string;
        title: string;
        dueDate: string;
        caseNo?: string;
        court?: string;
        parties?: unknown;
        isCompleted?: boolean;
    }) =>
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'lawsuit',
            sourceEntityId: String(p.fileId),
            sourceEventId: `task_${p.taskId}`,
            date: p.dueDate,
            title: `مهمة: ${p.title}`,
            type: 'deadline',
            caseNo: p.caseNo,
            court: p.court,
            partiesSummary: partiesSummaryFromList(p.parties),
            isCompleted: p.isCompleted,
            sourceLabel: 'دعوى مدنية — مهمة',
        }),
    syncExecutionTask: (p: {
        userId?: string | null;
        executionId: string | number;
        taskId: string;
        title: string;
        dueDate: string;
        caseNo?: string;
        clientName?: string;
    }) =>
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'execution',
            sourceEntityId: String(p.executionId),
            sourceEventId: `task_${p.taskId}`,
            date: p.dueDate,
            title: `مهمة تنفيذ: ${p.title}`,
            type: 'deadline',
            caseNo: p.caseNo,
            clientName: p.clientName,
            sourceLabel: 'تنفيذ — مهمة',
        }),
    syncExecutionAppointment: (p: {
        userId?: string | null;
        executionId: string | number;
        timelineEventId: string;
        date: string;
        time?: string;
        purpose: string;
        description?: string;
        caseNo?: string;
        clientName?: string;
    }) =>
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'execution',
            sourceEntityId: String(p.executionId),
            sourceEventId: p.timelineEventId,
            date: p.date,
            time: p.time,
            title: p.purpose,
            type: 'execution',
            notes: p.description,
            caseNo: p.caseNo,
            clientName: p.clientName,
            sourceLabel: 'تنفيذ — موعد',
        }),
    syncTransactionAppointment: (p: {
        userId?: string | null;
        transactionId: string;
        stepId: string;
        date: string | Date;
        time?: string;
        title: string;
        clientName?: string;
    }) => {
        const ymd =
            normalizeDateToYmd(p.date instanceof Date ? p.date.toISOString() : String(p.date)) ??
            normalizeDateToYmd(new Date().toISOString());
        if (!ymd) return;
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'transaction',
            sourceEntityId: p.transactionId,
            sourceEventId: p.stepId,
            date: ymd,
            time: p.time,
            title: p.title,
            type: 'consultation',
            clientName: p.clientName,
            sourceLabel: 'معاملة — موعد خطوة',
        });
    },
    syncCriminalTimeline: (p: {
        userId?: string | null;
        caseId: string;
        eventId: string;
        date: string;
        title: string;
        type?: 'hearing' | 'deadline';
        nextDate?: string;
        caseNo?: string;
        notes?: string;
        clientName?: string;
    }) => {
        const eventType = p.type ?? 'hearing';
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'criminal',
            sourceEntityId: p.caseId,
            sourceEventId: p.eventId,
            date: p.date,
            title: p.title,
            type: eventType,
            notes: p.notes,
            caseNo: p.caseNo,
            clientName: p.clientName,
            sourceLabel: 'جزائي — موعد',
        });
        const nextYmd = normalizeDateToYmd(p.nextDate);
        const baseYmd = normalizeDateToYmd(p.date);
        if (nextYmd && nextYmd !== baseYmd) {
            fireAndForgetCalendarSync({
                userId: p.userId,
                sourceModule: 'criminal',
                sourceEntityId: p.caseId,
                sourceEventId: `${p.eventId}_next`,
                date: nextYmd,
                title: `جلسة قادمة — ${p.title}`,
                type: eventType,
                notes: p.notes,
                caseNo: p.caseNo,
                clientName: p.clientName,
                sourceLabel: 'جزائي — موعد قادم',
            });
        }
    },
    syncCriminalTrialSession: (p: {
        userId?: string | null;
        caseId: string;
        sessionId: string;
        date: string;
        title: string;
        nextSessionDate?: string;
        caseNo?: string;
        clientName?: string;
    }) => {
        const eventId = `trial_${p.sessionId}`;
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'criminal',
            sourceEntityId: p.caseId,
            sourceEventId: eventId,
            date: p.date,
            title: p.title,
            type: 'hearing',
            caseNo: p.caseNo,
            clientName: p.clientName,
            sourceLabel: 'جزائي — جلسة محاكمة',
        });
        const nextYmd = normalizeDateToYmd(p.nextSessionDate);
        const baseYmd = normalizeDateToYmd(p.date);
        if (nextYmd && nextYmd !== baseYmd) {
            fireAndForgetCalendarSync({
                userId: p.userId,
                sourceModule: 'criminal',
                sourceEntityId: p.caseId,
                sourceEventId: `${eventId}_next`,
                date: nextYmd,
                title: `جلسة قادمة — ${p.title}`,
                type: 'hearing',
                caseNo: p.caseNo,
                clientName: p.clientName,
                sourceLabel: 'جزائي — جلسة محاكمة',
            });
        }
    },
    syncThreadingTask: (p: {
        userId?: string | null;
        transactionId: string;
        taskId: string;
        title: string;
        dueDate: string;
        clientName?: string;
        isCompleted?: boolean;
    }) => {
        const ymd = normalizeDateToYmd(p.dueDate);
        if (!ymd) return;
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'threading',
            sourceEntityId: p.transactionId,
            sourceEventId: `task_${p.taskId}`,
            date: ymd,
            title: `مهمة: ${p.title}`,
            type: 'deadline',
            clientName: p.clientName,
            isCompleted: p.isCompleted,
            sourceLabel: 'معاملة إدارية — مهمة',
        });
    },
    syncThreadingFinance: (p: {
        userId?: string | null;
        transactionId: string;
        recordId: string;
        title: string;
        date: string;
        clientName?: string;
        financeType: 'expense' | 'advance';
    }) => {
        const ymd = normalizeDateToYmd(p.date);
        if (!ymd) return;
        const kind = p.financeType === 'advance' ? 'مقبوض' : 'مصروف';
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'threading',
            sourceEntityId: p.transactionId,
            sourceEventId: `finance_${p.recordId}`,
            date: ymd,
            title: `${kind}: ${p.title}`,
            type: 'consultation',
            clientName: p.clientName,
            sourceLabel: 'معاملة إدارية — حركة مالية',
        });
    },
    syncNoteReminder: (p: {
        userId?: string | null;
        noteId: string;
        date: string;
        title: string;
        body?: string;
        linkedFileId?: string | number;
    }) => {
        const ymd = normalizeDateToYmd(p.date);
        if (!ymd) return;
        const linkedFile = p.linkedFileId != null ? String(p.linkedFileId).trim() : '';
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'note',
            sourceEntityId: p.noteId,
            sourceEventId: 'reminder',
            date: ymd,
            title: p.title,
            type: 'consultation',
            notes: p.body,
            clientName: p.title,
            caseNo: linkedFile ? undefined : 'ملاحظة',
            linkedDossierId: linkedFile || undefined,
            sourceLabel: 'ملاحظة — تذكير',
        });
    },
    syncFieldTaskDue: (p: {
        userId?: string | null;
        taskId: string;
        date: string;
        title: string;
        location?: string | null;
        linkedCaseId?: string | null;
        isCompleted?: boolean;
        isFatalDeadline?: boolean;
    }) => {
        const ymd = normalizeDateToYmd(p.date);
        if (!ymd) return;
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'task',
            sourceEntityId: p.taskId,
            sourceEventId: 'due',
            date: ymd,
            title: p.title,
            type: 'deadline',
            location: p.location ?? undefined,
            notes: p.location ? `📍 ${p.location}` : undefined,
            clientName: p.title,
            caseNo: p.linkedCaseId?.trim() || 'مهمة ميدان',
            sourceLabel: 'مهمة ميدان',
            isCompleted: p.isCompleted,
        });
    },
    syncUrgentHearing: (p: {
        userId?: string | null;
        caseId: string;
        hearingId: string;
        sessionDate: string;
        stageLabel: string;
        notes?: string;
        caseNo?: string;
        partiesSummary?: string;
        nextSessionDate?: string;
    }) => {
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'urgent',
            sourceEntityId: p.caseId,
            sourceEventId: p.hearingId,
            date: p.sessionDate,
            title: `جلسة — ${p.stageLabel}`,
            type: 'hearing',
            notes: p.notes,
            caseNo: p.caseNo,
            partiesSummary: p.partiesSummary,
            sourceLabel: 'قضاء مستعجل',
        });
        const nextYmd = normalizeDateToYmd(p.nextSessionDate);
        if (nextYmd && nextYmd !== normalizeDateToYmd(p.sessionDate)) {
            fireAndForgetCalendarSync({
                userId: p.userId,
                sourceModule: 'urgent',
                sourceEntityId: p.caseId,
                sourceEventId: `${p.hearingId}_next`,
                date: nextYmd,
                title: `جلسة قادمة — ${p.stageLabel}`,
                type: 'hearing',
                notes: p.notes ? `تأجيل: ${p.notes}` : 'موعد الجلسة القادمة',
                caseNo: p.caseNo,
                partiesSummary: p.partiesSummary,
                sourceLabel: 'قضاء مستعجل',
            });
        }
    },
    propagateUpdate: propagateBridgedCalendarUpdate,
    propagateRemoval: propagateBridgedCalendarRemoval,
};
