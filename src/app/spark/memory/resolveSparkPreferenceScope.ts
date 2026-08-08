import type { SparkNudge } from '@/app/spark/types';

/** نطاق تفضيلات سبارك — يطابق hosts الأرشيف والرئيسية */
export function resolveSparkPreferenceScope(
    nudge: SparkNudge,
    dossierKey?: string | null,
): string {
    if (nudge.kind.startsWith('home.')) return 'home-hub';
    if (nudge.kind === 'lawsuit.archive_attention_summary') return 'archive-lawsuit';
    if (nudge.kind === 'execution.archive_attention_summary') return 'archive-execution';
    if (nudge.kind === 'criminal.archive_attention_summary') return 'archive-criminal';
    if (nudge.kind === 'urgent.archive_attention_summary') return 'archive-urgent';
    if (dossierKey?.trim()) return dossierKey.trim();
    return 'home-hub';
}
