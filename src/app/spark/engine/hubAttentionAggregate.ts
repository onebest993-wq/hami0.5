import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { HomeSparkHit, HomeSparkSection } from '@/app/spark/engine/homeSparkAggregateScan';
import { scanNotesForSpark } from '@/app/spark/engine/repositoryNoteSparkScan';
import { scanRepositoryForSpark } from '@/app/spark/engine/repositorySparkScan';

export type HubAttentionSection = 'lawsuit' | 'execution';

const EXECUTION_SECRETARY_SPARK_KINDS = new Set<string>([
    'execution.secretary_deadline',
    'execution.secretary_hearing',
    'execution.secretary_urgent',
    'execution.secretary_task',
    'execution.secretary_alert',
]);

export function resolveSecretaryAlertEntityKey(alert: SecretaryAlert): string | null {
    const dossierId = String(alert.calendarSource?.dossierId ?? '').trim();
    if (dossierId) return dossierId;
    const entityId = String(alert.entityId ?? '').trim();
    if (entityId) return entityId;
    const calendarEntity = String(alert.calendarSource?.entityId ?? '').trim();
    if (calendarEntity) return calendarEntity;
    return null;
}

export function resolveSecretaryAlertHubSection(
    alert: SecretaryAlert,
): HubAttentionSection | null {
    if (alert.target === 'lawsuit' || alert.target === 'execution') {
        return alert.target;
    }
    const dossierModule = alert.calendarSource?.dossierModule;
    if (dossierModule === 'lawsuit' || dossierModule === 'execution') {
        return dossierModule;
    }
    if (alert.type === 'EXECUTION') return 'execution';
    return null;
}

export function countSecretaryAlertsByHubSection(
    alerts: SecretaryAlert[],
): Partial<Record<HubAttentionSection, number>> {
    const counts: Partial<Record<HubAttentionSection, number>> = {};
    for (const alert of alerts) {
        const section = resolveSecretaryAlertHubSection(alert);
        if (!section) continue;
        counts[section] = (counts[section] ?? 0) + 1;
    }
    return counts;
}

/**
 * يدمج مسح سبارك مع تنبيهات Secretary على البلاطات —
 * @deprecated يُفضّل mergeHubSectionAttentionDeduped مع hits الفعلية
 */
export function mergeHubSectionAttentionCounts(
    sparkCounts: Partial<Record<HomeSparkSection, number>>,
    secretaryCounts: Partial<Record<HubAttentionSection, number>>,
): Record<HubAttentionSection, number> {
    return {
        lawsuit: Math.max(sparkCounts.lawsuit ?? 0, secretaryCounts.lawsuit ?? 0),
        execution: Math.max(sparkCounts.execution ?? 0, secretaryCounts.execution ?? 0),
    };
}

function collectSparkAttentionKeysBySection(hits: HomeSparkHit[]): Record<HubAttentionSection, Set<string>> {
    const lawsuit = new Set<string>();
    const execution = new Set<string>();
    for (const hit of hits) {
        if (hit.section === 'lawsuit' || hit.section === 'criminal') {
            lawsuit.add(hit.targetFileId);
        }
        if (hit.section === 'execution') {
            execution.add(hit.targetFileId);
        }
    }
    return { lawsuit, execution };
}

/** اتحاد إضابير فريدة — يزيل ازدواجية Secretary مع مسح سبارك لنفس الإضبارة */
export function mergeHubSectionAttentionDeduped(
    hits: HomeSparkHit[],
    alerts: SecretaryAlert[],
): Record<HubAttentionSection, number> {
    const keys = collectSparkAttentionKeysBySection(hits);

    for (const alert of alerts) {
        const section = resolveSecretaryAlertHubSection(alert);
        const key = resolveSecretaryAlertEntityKey(alert);
        if (!section || !key) continue;

        if (section === 'lawsuit') {
            keys.lawsuit.add(key);
            continue;
        }

        if (section === 'execution') {
            const sparkAlreadyCoversSecretary = hits.some(
                (hit) =>
                    hit.section === 'execution' &&
                    hit.targetFileId === key &&
                    EXECUTION_SECRETARY_SPARK_KINDS.has(hit.kind),
            );
            if (sparkAlreadyCoversSecretary && keys.execution.has(key)) {
                continue;
            }
            keys.execution.add(key);
        }
    }

    return {
        lawsuit: keys.lawsuit.size,
        execution: keys.execution.size,
    };
}

export type HubTileAttentionCounts = {
    lawsuit: number;
    execution: number;
    transaction: number;
};

/** عدّادات البلاطات الرئيسية — دعاوى تشمل الجزائي، معاملات من مسح threading */
export function resolveHubTileAttentionCounts(
    sparkCounts: Partial<Record<HomeSparkSection, number>>,
    secretaryCounts: Partial<Record<HubAttentionSection, number>>,
): HubTileAttentionCounts {
    const merged = mergeHubSectionAttentionCounts(sparkCounts, secretaryCounts);
    return {
        lawsuit: (merged.lawsuit ?? 0) + (sparkCounts.criminal ?? 0),
        execution: merged.execution ?? 0,
        transaction: sparkCounts.threading ?? 0,
    };
}

/** عدّادات البلاطات من مسح الرئيسية الفعلي — dedupe ذكي لـ Secretary */
export function resolveHubTileAttentionCountsFromHits(
    hits: HomeSparkHit[],
    secretaryAlerts: SecretaryAlert[],
): HubTileAttentionCounts {
    const merged = mergeHubSectionAttentionDeduped(hits, secretaryAlerts);
    const threadingKeys = new Set(
        hits.filter((hit) => hit.section === 'threading').map((hit) => hit.targetFileId),
    );
    return {
        lawsuit: merged.lawsuit,
        execution: merged.execution,
        transaction: threadingKeys.size,
    };
}

export function countRepositoryAttentionFromHomeHits(hits: HomeSparkHit[]): number {
    return new Set(
        hits.filter((hit) => hit.section === 'repository').map((hit) => hit.targetFileId),
    ).size;
}

export function countRepositoryAttentionSignals(input: {
    vaultDocs: SmartVaultDoc[];
    notes: GlobalNote[];
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
}): number {
    let signals = 0;
    if (scanNotesForSpark(input.notes)) signals += 1;

    const unbound = input.vaultDocs.filter((doc) => !doc.boundDossierId);
    const vaultScan = scanRepositoryForSpark({
        unboundVaultDocs: unbound,
        vaultDocsForScan: input.vaultDocs,
        lawsuitFiles: input.lawsuitFiles,
        executionFiles: input.executionFiles,
        pendingUpload: false,
    });
    if (vaultScan.nudge) signals += 1;

    return signals;
}
