import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ExecutionFile } from '@/app/types/execution';
import type { SparkNudge, SparkNudgeKind } from '@/app/spark/types';
import { buildExecutionAlerts } from '@/app/services/executionAlerts';
import { buildDossierRegistry } from '@/app/services/alertDossierRegistry';
import { buildExecutionSparkContext } from '@/app/spark/context/executionSparkContext';

const SECRETARY_DEDUPE_BY_LOCAL_KIND: Record<string, string[]> = {
    'execution.dormancy_art112': [':dormancy'],
    'execution.voluntary_period_end': [':voluntary-end', ':voluntary'],
    'execution.eviction_voluntary_period_end': [':voluntary-end', ':voluntary'],
    'execution.stale_payments': [':stale-payment'],
    'execution.financial_stale_payments': [':stale-payment'],
    'execution.guarantor_notice_pending': [':guarantor'],
};

function mapSecretaryTypeToKind(type: SecretaryAlert['type']): SparkNudgeKind {
    switch (type) {
        case 'DEADLINE':
            return 'execution.secretary_deadline';
        case 'HEARING':
            return 'execution.secretary_hearing';
        case 'URGENT':
            return 'execution.secretary_urgent';
        case 'TASK':
            return 'execution.secretary_task';
        default:
            return 'execution.secretary_alert';
    }
}

function mapSecretaryActionId(alert: SecretaryAlert): string {
    const id = alert.id;
    if (id.includes('detention')) return 'open_followup';
    if (id.includes('eviction')) return 'open_coercive';
    if (id.includes('emp-summons') || id.includes('publication')) return 'open_summons';
    if (id.includes('stay-hearing')) return 'open_timeline';
    if (id.includes('task')) return 'open_timeline';
    if (id.includes('stale-payment')) return 'open_financial_center';
    return 'open_followup';
}

function sparkPriorityFromSecretary(alert: SecretaryAlert): number {
    // 12–15: بعد التنبيهات الإجرائية الحرجة، قبل الإيقاف/المهام الروتينية
    return 11 + Math.min(4, Math.max(1, alert.priority));
}

export function secretaryAlertToExecutionSparkNudge(
    alert: SecretaryAlert,
    dossierKey: string,
): SparkNudge {
    const message =
        String(alert.aiDeepDive ?? '').trim() ||
        String(alert.suggestedAction ?? '').trim() ||
        String(alert.title ?? '').trim() ||
        'متابعة مطلوبة في إضبارة التنفيذ.';

    return {
        id: `secretary:${alert.id}`,
        kind: mapSecretaryTypeToKind(alert.type),
        surface: 'execution',
        priority: sparkPriorityFromSecretary(alert),
        message,
        presence: {
            present: [String(alert.actionType ?? 'تنفيذ').trim()].filter(Boolean),
            missing: [String(alert.alertReason ?? alert.suggestedAction ?? 'متابعة').trim()].filter(
                Boolean,
            ),
        },
        source: `secretary:${alert.type}`,
        dossierKey,
        action: {
            label: String(alert.suggestedAction ?? 'متابعة').trim() || 'متابعة',
            actionId: mapSecretaryActionId(alert),
        },
    };
}

export function shouldSkipSecretaryAlertForLocalKinds(
    alertId: string,
    localKinds: ReadonlySet<string>,
): boolean {
    for (const kind of localKinds) {
        const needles = SECRETARY_DEDUPE_BY_LOCAL_KIND[kind];
        if (!needles) continue;
        if (needles.some((needle) => alertId.includes(needle))) return true;
    }
    return false;
}

/** يحوّل تنبيهات Secretary لإضبارة واحدة إلى مرشّحي سبارك — مع إزالة التكرار مع القواعد المحلية */
export function collectExecutionSecretarySparkNudges(
    file: ExecutionFile,
    localKinds: ReadonlySet<string>,
    now: Date = new Date(),
): SparkNudge[] {
    const registry = buildDossierRegistry({
        lawsuitFiles: [],
        executionFiles: [file],
        urgentCases: [],
        criminalCases: [],
    });

    const ctx = buildExecutionSparkContext({ executionData: file });
    const alerts = buildExecutionAlerts([file], now, registry);

    const nudges: SparkNudge[] = [];
    for (const alert of alerts) {
        if (shouldSkipSecretaryAlertForLocalKinds(alert.id, localKinds)) continue;
        nudges.push(secretaryAlertToExecutionSparkNudge(alert, ctx.dossierKey));
    }

    return nudges.sort((a, b) => a.priority - b.priority);
}
