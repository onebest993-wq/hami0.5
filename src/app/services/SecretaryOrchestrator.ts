import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LegalRequest } from '@/app/types/admin-types';
import { RequestStatus } from '@/app/types/admin-types';
import { ClientRequestService } from '@/app/services/ClientRequestService';
import { CalendarDB } from '@/app/services/cloud/lawyerCalendarCloud';
import type { CalendarEvent } from '@/app/services/calendar/calendarTypes';
import type { LegalTask } from '@/app/types/TaskEngine';
import { isBridgedCalendarEvent } from '@/app/services/calendarBridgePersistence';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { TransactionsThreadingDB } from '@/app/services/cloud/lawyerTransactionsCloud';
import {
    TransactionStatus,
    TransactionTaskStatus,
    type Transaction,
    type TransactionTask,
} from '@/app/modules/transactionsThreading/types';
import {
    computeUrgentCaseStatus,
    isUrgentCaseClosed,
    type UrgentCase,
} from '@/app/components/lawyer/Component_Urgent_Card';
import {
    buildDossierRegistry,
    contextFromCalendarEvent,
    isActiveLawsuitFile,
    isActiveUrgentCaseRecord,
    mergeDossierContext,
    type DossierRegistry,
} from '@/app/services/alertDossierRegistry';
import { composeRichAlert } from '@/app/services/alertRichContext';
import { suggestedFutureActionForAlert } from '@/app/services/alertFutureActions';
import {
    ALERT_FUTURE_MAX_HORIZON_DAYS,
    daysFromTodayYmd,
    isEventStrictlyAfterToday,
    localTodayYmd,
} from '@/app/services/alertFutureGate';
import { normalizeDateToYmd } from '@/app/services/calendarBridge';
import {
    classifySecretaryAlertsByHorizon,
    type ClassifiedSecretaryAlerts,
} from '@/app/services/alertTimeClassification';
import {
    buildFieldTaskAlerts,
    stripCalendarDuplicatesForFieldTasks,
} from '@/app/services/fieldTaskAlerts';
import { buildExecutionAlerts } from '@/app/services/executionAlerts';
import { buildLawsuitAlerts } from '@/app/services/lawsuitAlerts';
import { buildFinancialAlerts } from '@/app/services/financialAlerts';
import { calendarEventToTimestamp } from '@/app/utils/calendarDateTime';

export type { ClassifiedSecretaryAlerts } from '@/app/services/alertTimeClassification';
export type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import {
    filterAuthenticSecretaryAlerts,
    isUserAuthoredBridgedCalendarEvent,
} from '@/app/services/calendarAuthenticity';

export type SecretaryAlertType =
    | 'HEARING'
    | 'NOTE'
    | 'TASK'
    | 'REQUEST'
    | 'EXECUTION'
    | 'URGENT'
    | 'DEADLINE';

export type SecretaryAlertTarget =
    | 'schedule'
    | 'notepad'
    | 'client_requests'
    | 'transactions'
    | 'threading'
    | 'community'
    | 'lawsuit'
    | 'execution'
    | 'criminal'
    | 'urgent';

/** مصدر التقويم — لتوجيه «فتح الإضبارة» من البطاقة والجرس */
export type CalendarAlertSource = {
    module: string;
    entityId: string;
    eventId?: string;
    dossierModule?: 'lawsuit' | 'execution' | 'criminal' | 'urgent' | 'transaction' | 'threading';
    dossierId?: string;
};

export interface SecretaryAlert {
    id: string;
    type: SecretaryAlertType;
    title: string;
    summary: string;
    dueAt?: string;
    suggestedAction?: string;
    aiDeepDive: string;
    target: SecretaryAlertTarget;
    priority: number;
    entityId?: string;
    request?: LegalRequest;
    clientName?: string;
    caseNumber?: string;
    courtName?: string;
    alertReason?: string;
    calendarSource?: CalendarAlertSource;
    /** نوع الإجراء (جلسة، مهمة، …) للعرض في البطاقة */
    actionType?: string;
    clientPhone?: string;
    /** حقن من مهام اليوم الميدانية (قراءة فقط) */
    fieldTaskInjected?: boolean;
    /** مثبتة على ستارة الميدان — تُقدَّم في التبويب النشط */
    fieldTaskPinned?: boolean;
}

type RawNote = {
    id: string | number;
    title?: unknown;
    body?: unknown;
    text?: unknown;
    content?: unknown;
    isPinned?: unknown;
    date?: unknown;
    apptDate?: unknown;
    reminder_at?: unknown;
    createdAt?: unknown;
};

export function normalizeDigits(input: string): string {
    const map: Record<string, string> = {
        '٠': '0',
        '١': '1',
        '٢': '2',
        '٣': '3',
        '٤': '4',
        '٥': '5',
        '٦': '6',
        '٧': '7',
        '٨': '8',
        '٩': '9',
        '۰': '0',
        '۱': '1',
        '۲': '2',
        '۳': '3',
        '۴': '4',
        '۵': '5',
        '۶': '6',
        '۷': '7',
        '۸': '8',
        '۹': '9',
    };
    let out = '';
    for (const ch of input) out += map[ch] ?? ch;
    return out;
}

export function parseDate(value: unknown): number | null {
    if (value instanceof Date) {
        const t = value.getTime();
        return Number.isNaN(t) ? null : t;
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        return value < 10_000_000_000 ? value * 1000 : value;
    }
    if (typeof value !== 'string') return null;
    const cleaned = normalizeDigits(value).replace(/[\u200e\u200f\u061c]/g, '').trim();
    const iso = Date.parse(cleaned);
    if (!Number.isNaN(iso)) return iso;
    const ymd = cleaned.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (ymd) {
        const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
        return Number.isNaN(d.getTime()) ? null : d.getTime();
    }
    const dmy = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (dmy) {
        const day = Number(dmy[1]);
        const month = Number(dmy[2]);
        const yearRaw = Number(dmy[3]);
        const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
        const d = new Date(year, month - 1, day);
        return Number.isNaN(d.getTime()) ? null : d.getTime();
    }
    return null;
}

function isSameDay(ts: number, now: Date): boolean {
    const d = new Date(ts);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function safeText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const t = value.trim();
    return t ? t : null;
}

function clientNameFromRequest(r: LegalRequest): string {
    const fromMeta = safeText((r.ai_metadata as { client_name?: string } | undefined)?.client_name);
    if (fromMeta) return fromMeta;
    const title = safeText(r.title);
    if (title && !/طلب|توكيل|قانوني/i.test(title)) return title;
    return 'موكل';
}

function clientNameFromParties(file: FileData): string {
    const p = file.parties?.find((x) => x.isClient);
    return p?.name?.trim() || 'موكل';
}

function isActiveUrgentCase(c: UrgentCase): boolean {
    if (c.deleted) return false;
    if (c.archived) return false;
    if (isUrgentCaseClosed(c)) return false;
    return true;
}

function buildUrgentAlerts(cases: unknown[], now: Date, registry: DossierRegistry): SecretaryAlert[] {
    const out: SecretaryAlert[] = [];

    for (const raw of cases) {
        if (!raw || typeof raw !== 'object') continue;
        const c = raw as UrgentCase;
        if (!c.id || !isActiveUrgentCase(c) || !isActiveUrgentCaseRecord(c)) continue;

        const status = computeUrgentCaseStatus(c, { now });
        if (status === 'safe' || status === 'completed') continue;

        const entityId = String(c.id);
        const ctx = registry.resolve('urgent', entityId);
        if (!ctx) continue;

        let priority = 4;
        if (status === 'critical' || status === 'expired') priority = 1;
        else if (status === 'warning') priority = 2;

        const dueTs =
            parseDate(c.deadlineDate) ??
            parseDate(c.sessionDate) ??
            parseDate(c.notificationDate) ??
            null;

        if (dueTs != null && dueTs < now.getTime()) continue;
        if (status === 'expired') continue;

        const alert = composeRichAlert({
            id: `urgent:${entityId}`,
            type: 'URGENT',
            dueAt: dueTs != null ? new Date(dueTs).toISOString() : undefined,
            aiDeepDive: `الطلب المستعجل في حالة ${status}. تابع إجراءات التبليغ أو التظلم أو التمييز حسب المرحلة.`,
            target: 'urgent',
            entityId,
            priority,
            context: ctx,
            suggestedAction: suggestedFutureActionForAlert({ type: 'URGENT', target: 'urgent' }),
        });
        if (alert) out.push(alert);
    }

    return out;
}

/**
 * تنبيهات الإضبارات الجزائية: الجلسات القادمة + مهل الطعن (appealDeadline) للأحكام الصادرة.
 *  - يشمل جلسات `pending` التي لم يحلّ موعدها بعد.
 *  - يشمل جلسات `postponed` بـ `nextSessionDate` مستقبلي.
 *  - يشمل verdicts التي لها `appealDeadline` لم تنقضِ بعد.
 */
function buildCriminalAlerts(
    criminalCases: unknown[],
    now: Date,
    registry: DossierRegistry,
): SecretaryAlert[] {
    const out: SecretaryAlert[] = [];
    const nowTs = now.getTime();

    for (const raw of criminalCases) {
        if (!raw || typeof raw !== 'object') continue;
        const c = raw as Record<string, unknown>;
        const id = String(c.id ?? '');
        if (!id) continue;
        if (c.isArchived === true) continue;

        const ctx = registry.resolve('criminal', id);
        if (!ctx) continue;

        const trials = Array.isArray(c.trials) ? (c.trials as Record<string, unknown>[]) : [];
        for (const session of trials) {
            if (!session || typeof session !== 'object') continue;
            const status = String(session.status ?? '');

            // جلسة معلّقة بموعد
            if (status === 'pending') {
                const dateStr = typeof session.date === 'string' ? session.date : '';
                const ts = parseDate(dateStr);
                if (ts == null || ts < nowTs) continue;
                const diffH = (ts - nowTs) / 3_600_000;
                const priority = diffH <= 24 ? 1 : diffH <= 48 ? 2 : 3;
                const sid = String(session.id ?? '');
                const alert = composeRichAlert({
                    id: `criminal:${id}:trial:${sid || dateStr}`,
                    type: 'HEARING',
                    dueAt: new Date(ts).toISOString(),
                    aiDeepDive: 'جلسة جزائية قادمة. تأكد من المرافعة، الشهود، والمستندات المطلوبة.',
                    target: 'criminal',
                    entityId: id,
                    priority,
                    context: ctx,
                });
                if (alert) out.push(alert);
                continue;
            }

            // جلسة مؤجّلة لها موعد جديد
            if (status === 'postponed') {
                const dateStr =
                    typeof session.nextSessionDate === 'string' ? session.nextSessionDate : '';
                const ts = parseDate(dateStr);
                if (ts == null || ts < nowTs) continue;
                const diffH = (ts - nowTs) / 3_600_000;
                const priority = diffH <= 24 ? 1 : diffH <= 48 ? 2 : 3;
                const sid = String(session.id ?? '');
                const alert = composeRichAlert({
                    id: `criminal:${id}:postponed:${sid || dateStr}`,
                    type: 'HEARING',
                    dueAt: new Date(ts).toISOString(),
                    aiDeepDive: 'جلسة جزائية مؤجلة. تابع الاستعداد وفق ملاحظة التحضير.',
                    target: 'criminal',
                    entityId: id,
                    priority,
                    context: ctx,
                });
                if (alert) out.push(alert);
                continue;
            }

            // حكم صادر لكنه قابل للطعن — مهلة الطعن
            if (status === 'verdict_issued') {
                const verdict = session.verdict as Record<string, unknown> | undefined;
                if (!verdict) continue;
                const dl = typeof verdict.appealDeadline === 'string' ? verdict.appealDeadline : '';
                const ts = parseDate(dl);
                if (ts == null || ts < nowTs) continue;
                const diffH = (ts - nowTs) / 3_600_000;
                const priority = diffH <= 48 ? 1 : diffH <= 168 ? 2 : 3; // 168h = 7 أيام
                const sid = String(session.id ?? '');
                const alert = composeRichAlert({
                    id: `criminal:${id}:appeal:${sid || dl}`,
                    type: 'DEADLINE',
                    dueAt: new Date(ts).toISOString(),
                    aiDeepDive: 'مهلة طعن جزائي قريبة من الانتهاء. لا تفوّت موعد تقديم لائحة الطعن.',
                    target: 'criminal',
                    entityId: id,
                    priority,
                    context: ctx,
                });
                if (alert) out.push(alert);
            }
        }
    }

    return out;
}

/** معاملات نظام Threading (TransactionsThreadingDB) */
function buildThreadingAlerts(
    transactions: Transaction[],
    tasks: TransactionTask[],
): SecretaryAlert[] {
    const out: SecretaryAlert[] = [];
    const tasksByTx = new Map<string, TransactionTask[]>();

    for (const t of tasks) {
        const list = tasksByTx.get(t.transactionId) ?? [];
        list.push(t);
        tasksByTx.set(t.transactionId, list);
    }

    for (const tx of transactions) {
        if (tx.status === TransactionStatus.Completed) continue;

        const txTasks = tasksByTx.get(tx.id) ?? [];
        const clientName = tx.clientName?.trim() || '';
        const label = tx.title?.trim() || 'معاملة إدارية';

        // dueAt للـ threading: نستخدم updatedAt أو createdAt كـ proxy
        // لأن `filterAuthenticSecretaryAlerts` يشترط dueAt للقبول
        const txDueAt = tx.updatedAt || tx.createdAt;

        if (tx.status === TransactionStatus.Paused) {
            out.push({
                id: `threading:paused:${tx.id}`,
                type: 'TASK',
                title: `معاملة متوقفة — ${label}`,
                summary: `${clientName} • ${tx.targetDepartment}`,
                dueAt: txDueAt,
                suggestedAction: 'فتح المعاملة الإدارية',
                aiDeepDive: `المعاملة الإدارية «${label}» متوقفة وتحتاج متابعة.`,
                target: 'threading',
                entityId: tx.id,
                priority: 3,
                clientName: clientName || undefined,
            });
            continue;
        }

        const blocked = txTasks.filter((t) => t.status === TransactionTaskStatus.Blocked);
        if (blocked.length > 0) {
            out.push({
                id: `threading:blocked:${tx.id}`,
                type: 'TASK',
                title: `مهام معطّلة — ${label}`,
                summary: `${blocked.length} مهمة بحاجة تدخل • ${tx.targetDepartment}`,
                dueAt: txDueAt,
                suggestedAction: 'مراجعة العوائق',
                aiDeepDive: blocked.map((b) => b.title).join(' · '),
                target: 'threading',
                entityId: tx.id,
                priority: 3,
                clientName: clientName || undefined,
            });
        }
    }

    return out;
}

function buildRequestAlerts(requests: LegalRequest[]): SecretaryAlert[] {
    return requests
        .filter((r) => r.status === RequestStatus.PENDING)
        .map((r) => ({
            id: `request:${r.id}`,
            type: 'REQUEST' as const,
            title: r.title || 'طلب توكيل جديد',
            summary: r.ai_metadata?.summary || r.smart_summary || 'طلب جديد ينتظر الرد',
            dueAt: r.ai_metadata?.deadline ?? r.due_at,
            suggestedAction: r.ai_metadata?.suggested_action ?? 'المراجعة والرد السريع',
            aiDeepDive: `طلب موكل معلّق. ${r.ai_metadata?.summary ?? ''}`,
            target: 'client_requests' as const,
            priority: 2,
            request: r,
            clientName: clientNameFromRequest(r),
        }));
}

function calendarEventTimestamp(ev: CalendarEvent): number | null {
    return calendarEventToTimestamp(ev.date, ev.time, 'end');
}

function fieldTaskLinkedLawsuitId(ev: CalendarEvent): string | undefined {
    const caseNo = safeText(ev.caseNo);
    if (!caseNo || caseNo === 'مهمة ميدان') return undefined;
    return caseNo;
}

function resolveCalendarDossierLink(
    ev: CalendarEvent,
): Pick<CalendarAlertSource, 'dossierModule' | 'dossierId'> {
    const mod = ev.sourceModule;
    const entityId = safeText(ev.sourceEntityId);
    if (!mod || mod === 'manual') return {};

    if (mod === 'task') {
        const linked = fieldTaskLinkedLawsuitId(ev);
        return linked ? { dossierModule: 'lawsuit', dossierId: linked } : {};
    }
    if (mod === 'note') {
        const linked =
            safeText(ev.caseId) !== safeText(ev.sourceEntityId) ? safeText(ev.caseId) : undefined;
        if (linked && linked !== safeText(ev.sourceEntityId)) {
            return { dossierModule: 'lawsuit', dossierId: linked };
        }
        return {};
    }
    if (
        mod === 'lawsuit' ||
        mod === 'execution' ||
        mod === 'criminal' ||
        mod === 'urgent' ||
        mod === 'transaction' ||
        mod === 'threading'
    ) {
        if (!entityId) return {};
        return {
            dossierModule: mod === 'transaction' ? 'transaction' : mod,
            dossierId: entityId,
        };
    }
    return {};
}

function calendarAlertTarget(ev: CalendarEvent): SecretaryAlertTarget {
    const mod = ev.sourceModule;
    const dossier = resolveCalendarDossierLink(ev);
    if (dossier.dossierModule === 'lawsuit' && dossier.dossierId) return 'lawsuit';
    if (dossier.dossierModule === 'execution' && dossier.dossierId) return 'execution';
    if (dossier.dossierModule === 'criminal' && dossier.dossierId) return 'criminal';
    if (dossier.dossierModule === 'urgent' && dossier.dossierId) return 'urgent';
    if (dossier.dossierModule === 'threading' && dossier.dossierId) return 'threading';
    if (dossier.dossierModule === 'transaction' && dossier.dossierId) return 'transactions';

    switch (mod) {
        case 'lawsuit':
            return 'lawsuit';
        case 'execution':
            return 'execution';
        case 'urgent':
            return 'urgent';
        case 'transaction':
            return 'transactions';
        case 'criminal':
            return 'criminal';
        case 'threading':
            return 'threading';
        case 'task':
            return 'schedule';
        case 'note':
            return 'notepad';
        default:
            return safeText(ev.caseId) ? 'lawsuit' : 'schedule';
    }
}

function calendarAlertEntityId(ev: CalendarEvent): string | undefined {
    const dossier = resolveCalendarDossierLink(ev);
    if (dossier.dossierId) return dossier.dossierId;
    return safeText(ev.sourceEntityId) ?? safeText(ev.caseId) ?? undefined;
}

/** لا نعرض معرّفات تقنية (UUID) للمستخدم في العناوين */
function isOpaqueEntityId(value: string): boolean {
    const s = value.trim();
    if (!s) return true;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
    if (/^[0-9a-f]{24,36}$/i.test(s)) return true;
    return false;
}

function calendarAlertType(ev: CalendarEvent): SecretaryAlertType {
    if (ev.type === 'execution' || ev.sourceModule === 'execution') return 'EXECUTION';
    if (ev.type === 'hearing' || /جلس|مرافع/i.test(ev.title)) return 'HEARING';
    if (ev.type === 'deadline') return 'DEADLINE';
    return 'TASK';
}

/** تنبيهات المواعيد — مصدر وحيد: CalendarDB (يدوي + مربوط من كل الأقسام). */
function buildCalendarAlerts(
    events: CalendarEvent[],
    now: Date,
    registry: DossierRegistry,
): SecretaryAlert[] {
    const nowMs = now.getTime();
    const todayYmd = localTodayYmd(now);
    const out: SecretaryAlert[] = [];

    for (const ev of events) {
        if (ev.isCompleted) continue;
        if (!isUserAuthoredBridgedCalendarEvent(ev)) continue;

        // 🔒 استبعد الأحداث المُكتشفة من Sniffer (`field_*`) من البطاقة العامة.
        // هذه ليست مواعيد قصدها المستخدم — مجرد تواريخ التُقطت آلياً من حقول.
        // (تبقى مرئية في التقويم نفسه، لكن لا تُولّد تنبيهات في الراداري.)
        if (String(ev.sourceEventId ?? '').startsWith('field_')) continue;

        const eventYmd = normalizeDateToYmd(ev.date);
        // 🔒 لا نُسجّل تواريخ ماضية ولا تاريخ اليوم — فقط المستقبل المؤكّد (> اليوم)
        if (!eventYmd || !isEventStrictlyAfterToday(eventYmd, now)) continue;
        if (daysFromTodayYmd(eventYmd, todayYmd) > ALERT_FUTURE_MAX_HORIZON_DAYS) continue;

        const ts = calendarEventTimestamp(ev);
        if (ts === null) continue;
        if (ts < nowMs) continue;

        const target = calendarAlertTarget(ev);
        const entityId = calendarAlertEntityId(ev);
        const module = ev.sourceModule ?? (target === 'schedule' ? 'manual' : target);
        const dossierLink = resolveCalendarDossierLink(ev);

        if (dossierLink.dossierModule && dossierLink.dossierId) {
            if (!registry.isActive(dossierLink.dossierModule, dossierLink.dossierId)) continue;
        } else if (entityId && module === 'task') {
            /* مهمة ميدان غير مربوطة بإضبارة — تُعرض */
        } else if (entityId && !registry.isActive(module, entityId)) continue;

        const alertType = calendarAlertType(ev);
        const isToday = isSameDay(ts, now);
        const sourceEntityId = safeText(ev.sourceEntityId) ?? safeText(ev.caseId) ?? '';
        const calendarSource = sourceEntityId
            ? {
                  module: String(module),
                  entityId: sourceEntityId,
                  eventId: safeText(ev.sourceEventId) ?? undefined,
                  ...dossierLink,
              }
            : undefined;
        const fromEvent = contextFromCalendarEvent(ev);
        const fromDossier = registry.resolve(module, entityId);
        const ctx = mergeDossierContext(fromDossier, fromEvent);

        if (!fromEvent.actionType || fromEvent.actionType === 'موعد') {
            const session = ev.title.replace(/^جلسة(?:\s*قادمة)?\s*[—–-]\s*/u, '').trim();
            if (session) ctx.actionType = session;
        }

        const alert = composeRichAlert({
            id: `calendar:${ev.id}`,
            type: alertType,
            dueAt: new Date(ts).toISOString(),
            aiDeepDive: ev.notes?.trim() || `موعد في التقويم: ${ev.title}`,
            target,
            entityId,
            priority:
                isToday
                    ? 2
                    : alertType === 'HEARING' || alertType === 'EXECUTION'
                      ? 2
                      : 4,
            context: ctx,
            suggestedAction: suggestedFutureActionForAlert({
                type: alertType,
                target,
                calendarSource,
            }),
            clientPhone: safeText(ev.clientPhone) ?? undefined,
            calendarSource,
        });
        if (alert) out.push(alert);
    }

    return out;
}

/** إن وُجد تنبيه جلسة من التقويم للمستعجل، لا نكرّر تنبيه الحالة العامة لنفس الطلب */
function suppressRedundantUrgentStatusAlerts(alerts: SecretaryAlert[]): SecretaryAlert[] {
    const urgentWithCalendarHearing = new Set<string>();
    for (const a of alerts) {
        if (a.target !== 'urgent' || !a.entityId) continue;
        if (a.type === 'HEARING' && a.id.startsWith('calendar:')) {
            urgentWithCalendarHearing.add(String(a.entityId));
        }
    }
    if (urgentWithCalendarHearing.size === 0) return alerts;
    return alerts.filter((a) => {
        if (a.type !== 'URGENT' || a.target !== 'urgent' || !a.entityId) return true;
        return !urgentWithCalendarHearing.has(String(a.entityId));
    });
}

function dedupeAlerts(alerts: SecretaryAlert[]): SecretaryAlert[] {
    const withoutFieldDupes = stripCalendarDuplicatesForFieldTasks(alerts);
    const byId = new Map<string, SecretaryAlert>();
    for (const a of withoutFieldDupes) {
        byId.set(a.id, a);
    }
    const list = Array.from(byId.values());
    const passthrough: SecretaryAlert[] = [];
    const semanticWinners = new Map<string, SecretaryAlert>();

    for (const a of list) {
        const schedulable =
            (a.type === 'HEARING' || a.type === 'EXECUTION' || a.type === 'DEADLINE') &&
            !!a.entityId &&
            !!a.dueAt;
        if (!schedulable) {
            passthrough.push(a);
            continue;
        }
        const day = new Date(a.dueAt!).toISOString().slice(0, 10);
        const key = `${a.type}:${a.entityId}:${day}`;
        const prev = semanticWinners.get(key);
        if (!prev || a.priority < prev.priority) {
            semanticWinners.set(key, a);
        }
    }

    return [...passthrough, ...semanticWinners.values()];
}

function sortAlerts(alerts: SecretaryAlert[]): SecretaryAlert[] {
    return [...alerts].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        const ta = parseDate(a.dueAt) ?? Number.MAX_SAFE_INTEGER;
        const tb = parseDate(b.dueAt) ?? Number.MAX_SAFE_INTEGER;
        return ta - tb;
    });
}

export class SecretaryOrchestrator {
    static async getUnifiedAlerts(params: {
        lawyerId: string;
        files: FileData[];
        executionFiles?: unknown[];
        criminalCases?: unknown[];
        notes: RawNote[];
        fieldTasks?: LegalTask[];
    }): Promise<SecretaryAlert[]> {
        const now = new Date();
        const executionList = Array.isArray(params.executionFiles) ? params.executionFiles : [];
        const fieldTasks = Array.isArray(params.fieldTasks) ? params.fieldTasks : [];

        const [requests, urgentState, calendarEvents, threadingState] = await Promise.all([
            ClientRequestService.getLawyerRequests(params.lawyerId).catch((): LegalRequest[] => []),
            UrgentActionsDB.getState(params.lawyerId).catch(() => null),
            CalendarDB.getEvents(params.lawyerId).catch((): CalendarEvent[] => []),
            TransactionsThreadingDB.getState(params.lawyerId).catch(() => null),
        ]);

        const urgentCases = Array.isArray(urgentState?.cases) ? urgentState!.cases : [];
        const threadingTx = Array.isArray(threadingState?.transactions)
            ? (threadingState!.transactions as Transaction[])
            : [];
        const threadingTasks = Array.isArray(threadingState?.tasks)
            ? (threadingState!.tasks as TransactionTask[])
            : [];
        const threadingFinance = Array.isArray(
            (threadingState as { financeRecords?: unknown[] } | null)?.financeRecords,
        )
            ? ((threadingState as { financeRecords: unknown[] }).financeRecords as Array<
                  import('@/app/modules/transactionsThreading/types').FinanceRecord
              >)
            : [];

        const criminalCases = Array.isArray(params.criminalCases) ? params.criminalCases : [];
        const registry = buildDossierRegistry({
            lawsuitFiles: params.files,
            executionFiles: executionList,
            urgentCases,
            criminalCases,
        });

        const fieldTaskAlerts = buildFieldTaskAlerts(fieldTasks, now, registry);

        const alerts = filterAuthenticSecretaryAlerts(
            dedupeAlerts(
                suppressRedundantUrgentStatusAlerts([
                    ...buildCalendarAlerts(calendarEvents, now, registry),
                    ...fieldTaskAlerts,
                    ...buildRequestAlerts(requests),
                    ...buildThreadingAlerts(threadingTx, threadingTasks),
                    ...buildUrgentAlerts(urgentCases, now, registry),
                    ...buildCriminalAlerts(criminalCases, now, registry),
                    ...buildExecutionAlerts(executionList, now, registry),
                    ...buildLawsuitAlerts(params.files, now, registry),
                    ...buildFinancialAlerts(threadingTx, threadingFinance, threadingTasks, now),
                ]),
            ),
        );

        return sortAlerts(alerts);
    }

    /** تقسيم التنبيهات النظيفة إلى عاجل / قريبة / قادمة (≤7 أيام) */
    static classifyAlertsByHorizon(
        alerts: SecretaryAlert[],
        now: Date = new Date(),
    ): ClassifiedSecretaryAlerts {
        return classifySecretaryAlertsByHorizon(alerts, now);
    }

    static async getUnifiedAlertsByHorizon(
        params: Parameters<typeof SecretaryOrchestrator.getUnifiedAlerts>[0],
    ): Promise<ClassifiedSecretaryAlerts> {
        const alerts = await SecretaryOrchestrator.getUnifiedAlerts(params);
        return SecretaryOrchestrator.classifyAlertsByHorizon(alerts);
    }
}
