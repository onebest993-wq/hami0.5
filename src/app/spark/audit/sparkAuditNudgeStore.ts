import type { SparkNudge } from '@/app/spark/types';
import type { SparkTextAuditResult } from '@/app/spark/audit/types';
import { SPARK_AUDIT_STORE_MAX_ENTRIES } from '@/app/spark/audit/sparkAuditConfig';

const auditByDossier = new Map<string, SparkNudge>();

function pruneAuditStore(): void {
    while (auditByDossier.size > SPARK_AUDIT_STORE_MAX_ENTRIES) {
        const oldest = auditByDossier.keys().next().value;
        if (!oldest) break;
        auditByDossier.delete(oldest);
    }
}

export function setSparkAuditNudge(dossierKey: string, nudge: SparkNudge | null): void {
    if (!nudge) {
        auditByDossier.delete(dossierKey);
        return;
    }
    auditByDossier.set(dossierKey, nudge);
    pruneAuditStore();
}

export function readSparkAuditNudge(dossierKey: string): SparkNudge | null {
    return auditByDossier.get(dossierKey) ?? null;
}

export function clearSparkAuditNudges(): void {
    auditByDossier.clear();
}

export function toDocumentCompletenessNudge(
    dossierKey: string,
    audit: SparkTextAuditResult,
): SparkNudge | null {
    if (!audit.missing.length) return null;

    return {
        id: `${dossierKey}:doc-audit:${Date.now()}`,
        kind: 'lawsuit.document_completeness',
        surface: 'lawsuit',
        priority: 90,
        message: audit.summary || 'يبدو أن بعض العناصر الشكلية غير مذكورة في النص — هل تود مراجعته؟',
        presence: {
            present: audit.present.length ? audit.present : ['نص محفوظ'],
            missing: audit.missing,
        },
        source: 'spark-text-audit',
        dossierKey,
    };
}
