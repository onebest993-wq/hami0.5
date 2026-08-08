import { useMemo } from 'react';
import {
    buildExecutionArchiveAttentionNudge,
    scanExecutionArchiveForSpark,
} from '@/app/spark/engine/executionArchiveSparkScan';
import { SparkArchiveInsightShell } from '@/app/spark/ui/sparkArchiveInsightShared';

export type SparkExecutionArchiveInsightProps = {
    files: Array<Record<string, unknown>>;
    executionViewMode: 'active' | 'archived' | 'trash';
    onOpenFile: (file: Record<string, unknown>) => void;
    className?: string;
};

export function SparkExecutionArchiveInsight({
    files,
    executionViewMode,
    onOpenFile,
    className,
}: SparkExecutionArchiveInsightProps) {
    const summary = useMemo(() => {
        if (executionViewMode !== 'active') return null;
        return buildExecutionArchiveAttentionNudge(
            scanExecutionArchiveForSpark(files, { maxHits: 24 }),
        );
    }, [executionViewMode, files]);

    return (
        <SparkArchiveInsightShell
            summary={summary}
            summaryKind="execution.archive_attention_summary"
            preferenceScope="archive-execution"
            className={className}
            onOpenTarget={(targetFileId) => {
                const target = files.find((f) => String(f.id ?? '') === targetFileId);
                if (target) onOpenFile(target);
            }}
        />
    );
}
