import { useMemo } from 'react';
import {
    buildUrgentArchiveAttentionNudge,
    scanUrgentCasesForSpark,
} from '@/app/spark/engine/urgentArchiveSparkScan';
import { SparkArchiveInsightShell } from '@/app/spark/ui/sparkArchiveInsightShared';

export type SparkUrgentArchiveInsightProps = {
    cases: Array<Record<string, unknown>>;
    scope: 'active' | 'archive' | 'trash';
    onOpenCase: (caseId: string) => void;
};

export function SparkUrgentArchiveInsight({ cases, scope, onOpenCase }: SparkUrgentArchiveInsightProps) {
    const summary = useMemo(() => {
        if (scope !== 'active') return null;
        return buildUrgentArchiveAttentionNudge(scanUrgentCasesForSpark(cases, { maxHits: 24 }));
    }, [cases, scope]);

    return (
        <SparkArchiveInsightShell
            summary={summary}
            summaryKind="urgent.archive_attention_summary"
            preferenceScope="archive-urgent"
            className="mb-3 px-1"
            onOpenTarget={onOpenCase}
        />
    );
}
