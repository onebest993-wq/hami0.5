import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { discoverImplicitDossierDates } from '@/app/services/calendarDateSniffer';
import { collectVaultOcrUnscheduledCandidates } from '@/app/spark/calendar/calendarVaultOcrUnscheduled';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { CalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import { ymdFromMs } from '@/app/spark/calendar/calendarSparkTimeUtils';
import { formatUnscheduledDossierDateMessage } from '@/app/spark/calendar/formatUnscheduledDossierDateMessage';
import { scanNotesForSpark } from '@/app/spark/engine/repositoryNoteSparkScan';
import { CALENDAR_SPARK_RULES } from '@/app/spark/procedural/calendarNudgeRules';
import type { SparkNudge } from '@/app/spark/types';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';

const DAY_MS = 24 * 60 * 60 * 1000;

export type CalendarSparkSupplementalInput = {
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
    criminalCases?: unknown[];
    urgentCases?: unknown[];
    threadingTransactions?: unknown[];
    notes?: GlobalNote[];
    secretaryAlerts?: SecretaryAlert[];
    vaultDocs?: SmartVaultDoc[];
    nowMs?: number;
    /** أفق البحث عن تواريخ غير مجدولة — افتراضي 14 يوماً */
    unscheduledHorizonDays?: number;
};

export function buildCalendarSparkSupplementalInput(
    sources: ClusterScanSources,
    secretaryAlerts: SecretaryAlert[] = [],
): CalendarSparkSupplementalInput {
    return {
        lawsuitFiles: sources.lawsuitFiles,
        executionFiles: sources.executionFiles,
        criminalCases: sources.criminalCases,
        urgentCases: sources.urgentCases,
        threadingTransactions: sources.threadingTransactions,
        notes: (sources.notes ?? []) as GlobalNote[],
        secretaryAlerts,
        vaultDocs: sources.vaultDocs ?? [],
    };
}

export function hasCalendarSparkSupplementalSources(
    input?: CalendarSparkSupplementalInput,
): boolean {
    if (!input) return false;
    return Boolean(
        input.lawsuitFiles?.length ||
            input.executionFiles?.length ||
            input.criminalCases?.length ||
            input.urgentCases?.length ||
            input.threadingTransactions?.length ||
            input.notes?.length ||
            input.secretaryAlerts?.length ||
            input.vaultDocs?.length,
    );
}

type DossierScanRow = {
    module: CalendarSourceModule;
    entityId: string;
    file: unknown;
    moduleLabel: string;
};

function readEntityId(file: unknown): string {
    if (!file || typeof file !== 'object') return '';
    const id = (file as { id?: unknown }).id;
    return String(id ?? '').trim();
}

function collectDossierRows(input: CalendarSparkSupplementalInput): DossierScanRow[] {
    const rows: DossierScanRow[] = [];
    const push = (module: CalendarSourceModule, moduleLabel: string, files: unknown[] | undefined) => {
        for (const file of files ?? []) {
            const entityId = readEntityId(file);
            if (!entityId) continue;
            rows.push({ module, entityId, file, moduleLabel });
        }
    };
    push('lawsuit', 'دعوى', input.lawsuitFiles);
    push('execution', 'تنفيذ', input.executionFiles);
    push('criminal', 'جزائي', input.criminalCases);
    push('urgent', 'مستعجل', input.urgentCases);
    push('transaction', 'معاملة', input.threadingTransactions);
    return rows;
}

function isDiscoveredDateOnCalendar(
    events: UnifiedEvent[],
    module: CalendarSourceModule,
    entityId: string,
    bridgeEventId: string,
): boolean {
    return events.some(
        (event) =>
            event.bridge?.sourceModule === module &&
            String(event.bridge.sourceEntityId ?? '') === entityId &&
            String(event.bridge.sourceEventId ?? '') === bridgeEventId,
    );
}

function daysUntilYmd(fromYmd: string, toYmd: string): number {
    const from = Date.parse(`${fromYmd}T12:00:00`);
    const to = Date.parse(`${toYmd}T12:00:00`);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return Number.POSITIVE_INFINITY;
    return Math.ceil((to - from) / DAY_MS);
}

export function scanUnscheduledDossierDateNudge(
    ctx: CalendarSparkContext,
    input: CalendarSparkSupplementalInput,
): SparkNudge | null {
    const nowMs = input.nowMs ?? ctx.nowMs;
    const today = ymdFromMs(nowMs);
    const horizonDays = input.unscheduledHorizonDays ?? 14;

    let best: {
        module: CalendarSourceModule;
        entityId: string;
        moduleLabel: string;
        title: string;
        dateYmd: string;
        pathLabel: string;
        daysUntil: number;
    } | null = null;

    for (const row of collectDossierRows(input)) {
        const discovered = discoverImplicitDossierDates(row.file, row.module);
        for (const item of discovered) {
            if (item.dateYmd < today) continue;
            const daysUntil = daysUntilYmd(today, item.dateYmd);
            if (daysUntil > horizonDays) continue;
            if (isDiscoveredDateOnCalendar(ctx.allEvents, row.module, row.entityId, item.bridgeEventId)) {
                continue;
            }
            if (!best || daysUntil < best.daysUntil) {
                best = {
                    module: row.module,
                    entityId: row.entityId,
                    moduleLabel: row.moduleLabel,
                    title: item.title,
                    dateYmd: item.dateYmd,
                    pathLabel: item.pathLabel,
                    daysUntil,
                };
            }
        }
    }

    for (const vaultItem of collectVaultOcrUnscheduledCandidates(input, today, horizonDays)) {
        if (isDiscoveredDateOnCalendar(ctx.allEvents, vaultItem.module, vaultItem.entityId, vaultItem.bridgeEventId)) {
            continue;
        }
        const daysUntil = daysUntilYmd(today, vaultItem.dateYmd);
        if (!best || daysUntil < best.daysUntil) {
            best = {
                module: vaultItem.module,
                entityId: vaultItem.entityId,
                moduleLabel: vaultItem.moduleLabel,
                title: vaultItem.title,
                dateYmd: vaultItem.dateYmd,
                pathLabel: vaultItem.pathLabel,
                daysUntil,
            };
        }
    }

    if (!best) return null;

    const [y, m, d] = best.dateYmd.split('-');
    const whenLabel = `${d}/${m}/${y}`;

    return {
        id: `calendar-unscheduled:${best.module}:${best.entityId}:${best.dateYmd}`,
        kind: 'calendar.unscheduled_dossier_date',
        surface: 'calendar',
        priority: 7,
        message: formatUnscheduledDossierDateMessage({
            moduleLabel: best.moduleLabel,
            title: best.title,
            pathLabel: best.pathLabel,
            whenLabel,
        }),
        presence: {
            present: [],
            missing: ['موعد في التقويم'],
        },
        source: 'calendarSparkSupplementalScan.unscheduled',
        dossierKey: `calendar:source:${best.module}:${best.entityId}`,
        targetFileId: `${best.module}:${best.entityId}`,
        action: { label: 'فتح الإضبارة', actionId: 'open_dossier' },
    };
}

export function scanCalendarNoteReminderNudge(
    notes: GlobalNote[] | undefined,
): SparkNudge | null {
    const repoNudge = scanNotesForSpark(notes ?? []);
    if (!repoNudge || repoNudge.kind !== 'repository.note_reminder_near') return null;

    return {
        ...repoNudge,
        id: repoNudge.id.replace(/^repository:/, 'calendar:'),
        kind: 'calendar.note_reminder_due',
        surface: 'calendar',
        priority: 7,
        action: { label: 'فتح الملاحظة', actionId: 'open_repository_note' },
    };
}

function resolveCalendarEventIdFromSecretaryAlert(
    alert: SecretaryAlert,
    events: UnifiedEvent[],
): string | undefined {
    if (alert.id.startsWith('calendar:')) {
        const rawId = alert.id.slice('calendar:'.length);
        const prefixed = `cal_${rawId}`;
        const match =
            events.find((event) => event.id === prefixed) ??
            events.find((event) => event.id === rawId);
        return match?.id;
    }
    const entityId = String(alert.calendarSource?.entityId ?? alert.entityId ?? '').trim();
    if (!entityId) return undefined;
    const module = String(alert.calendarSource?.module ?? '').trim();
    const match = events.find(
        (event) =>
            event.bridge?.sourceEntityId === entityId &&
            (!module || event.bridge.sourceModule === module),
    );
    return match?.id;
}

function secretaryConflictsWithCoreNudge(alert: SecretaryAlert, coreKinds: Set<string>): boolean {
    if (alert.type === 'HEARING' && coreKinds.has('calendar.hearing_today')) return true;
    if (alert.type === 'DEADLINE' && coreKinds.has('calendar.deadline_near')) return true;
    if (alert.type === 'DEADLINE' && coreKinds.has('calendar.deadline_overdue')) return true;
    return false;
}

export function scanSecretaryCalendarNudge(
    ctx: CalendarSparkContext,
    alerts: SecretaryAlert[] | undefined,
    coreNudges: SparkNudge[],
): SparkNudge | null {
    const coreKinds = new Set(coreNudges.map((nudge) => nudge.kind));
    const candidates = (alerts ?? [])
        .filter((alert) => {
            if (!['HEARING', 'DEADLINE', 'URGENT', 'TASK'].includes(alert.type)) return false;
            if (!(alert.id.startsWith('calendar:') || alert.calendarSource)) return false;
            if (secretaryConflictsWithCoreNudge(alert, coreKinds)) return false;
            return true;
        })
        .sort((a, b) => b.priority - a.priority);

    const alert = candidates[0];
    if (!alert) return null;

    const eventId = resolveCalendarEventIdFromSecretaryAlert(alert, ctx.allEvents);
    const message =
        String(alert.aiDeepDive ?? '').trim() ||
        String(alert.suggestedAction ?? '').trim() ||
        String(alert.title ?? '').trim() ||
        'متابعة مطلوبة في الجدول.';

    const event = eventId ? ctx.allEvents.find((item) => item.id === eventId) : undefined;
    const action =
        event?.isBridged && event.bridge?.sourceModule && event.bridge.sourceEntityId
            ? ({ label: 'فتح الإضبارة', actionId: 'open_source' } as const)
            : eventId
              ? ({ label: 'عرض الموعد', actionId: 'focus_event' } as const)
              : alert.calendarSource?.entityId
                ? ({
                      label: 'فتح الإضبارة',
                      actionId: 'open_dossier',
                  } as const)
                : ({ label: 'عرض التقويم', actionId: 'focus_day' } as const);

    const dossierTarget = alert.calendarSource?.entityId
        ? `${alert.calendarSource.module ?? 'manual'}:${alert.calendarSource.entityId}`
        : eventId;

    return {
        id: `calendar-secretary:${alert.id}`,
        kind: 'calendar.secretary_schedule_alert',
        surface: 'calendar',
        priority: 6,
        message,
        presence: {
            present: [String(alert.actionType ?? 'جدول').trim()].filter(Boolean),
            missing: [String(alert.alertReason ?? 'متابعة').trim()].filter(Boolean),
        },
        source: `calendarSparkSupplementalScan.secretary:${alert.type}`,
        dossierKey: `calendar:secretary:${alert.id}`,
        targetFileId: eventId ?? dossierTarget,
        action,
    };
}

export function collectCalendarSupplementalSparkNudges(
    ctx: CalendarSparkContext,
    input?: CalendarSparkSupplementalInput,
): SparkNudge[] {
    if (!input) return [];
    const core = CALENDAR_SPARK_RULES.map((rule) => rule(ctx)).filter(
        (nudge): nudge is SparkNudge => nudge !== null,
    );
    const supplemental = [
        scanUnscheduledDossierDateNudge(ctx, input),
        scanCalendarNoteReminderNudge(input.notes),
        scanSecretaryCalendarNudge(ctx, input.secretaryAlerts, core),
    ].filter((nudge): nudge is SparkNudge => nudge !== null);
    return supplemental;
}
