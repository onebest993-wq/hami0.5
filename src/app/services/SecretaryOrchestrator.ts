import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { CalendarDB } from '@/app/services/cloud/lawyerCalendarCloud';
import type { CalendarEvent } from '@/app/services/calendar/calendarTypes';
import type { LegalTask } from '@/app/types/TaskEngine';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import {
    buildDossierRegistry,
    contextFromCalendarEvent,
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
    | 'EXECUTION'
    | 'URGENT'
    | 'DEADLINE';

export type SecretaryAlertTarget =
    | 'schedule'
    | 'notepad'
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

function safeText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const t = value.trim();
    return t ? t : null;
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

        const suggestedAction = suggestedFutureActionForAlert({
            type: alertType,
            target,
            calendarSource,
        });
        const dueAt = new Date(ts).toISOString();
        const aiDeepDive = ev.notes?.trim() || `موعد في التقويم: ${ev.title}`;
        const priority =
            alertType === 'HEARING' || alertType === 'EXECUTION' ? 2 : 4;
        const composed = composeRichAlert({
            id: `calendar:${ev.id}`,
            type: alertType,
            dueAt,
            aiDeepDive,
            target,
            entityId,
            priority,
            context: ctx,
            suggestedAction,
            clientPhone: safeText(ev.clientPhone) ?? undefined,
            calendarSource,
        });
        const titleFallback = ev.title.trim();
        const alert =
            composed ??
            (titleFallback
                ? {
                      id: `calendar:${ev.id}`,
                      type: alertType,
                      title: titleFallback,
                      summary: safeText(ev.sourceLabel) || ctx.actionType || 'موعد',
                      dueAt,
                      suggestedAction,
                      aiDeepDive,
                      target,
                      entityId,
                      priority,
                      calendarSource,
                      clientPhone: safeText(ev.clientPhone) ?? undefined,
                  }
                : null);
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
        void params.notes;

        const [urgentState, calendarEvents] = await Promise.all([
            UrgentActionsDB.getState(params.lawyerId).catch(() => null),
            CalendarDB.getEvents(params.lawyerId).catch((): CalendarEvent[] => []),
        ]);

        const urgentCases = Array.isArray(urgentState?.cases) ? urgentState!.cases : [];
        const criminalCases = Array.isArray(params.criminalCases) ? params.criminalCases : [];
        const registry = buildDossierRegistry({
            lawsuitFiles: params.files,
            executionFiles: executionList,
            urgentCases,
            criminalCases,
        });

        const fieldTaskAlerts = buildFieldTaskAlerts(fieldTasks, now, registry);

        // البطاقة العامة: تقويم + مهام ميدان فقط.
        // منتجو الدعوى/التنفيذ/الجزائي/المستعجل/Threading/المالية يُرفضون بالـ whitelist.
        const alerts = filterAuthenticSecretaryAlerts(
            dedupeAlerts(
                suppressRedundantUrgentStatusAlerts([
                    ...buildCalendarAlerts(calendarEvents, now, registry),
                    ...fieldTaskAlerts,
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
