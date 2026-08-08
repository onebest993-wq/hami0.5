import { useMemo } from 'react';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import {
    buildArchiveAttentionNudge,
    scanLawsuitArchiveForSpark,
} from '@/app/spark/engine/lawsuitArchiveSparkScan';
import {
    buildCriminalArchiveAttentionNudge,
    scanCriminalArchiveForSpark,
} from '@/app/spark/engine/criminalArchiveSparkScan';
import { SparkArchiveInsightShell } from '@/app/spark/ui/sparkArchiveInsightShared';

export type SparkLawsuitArchiveInsightProps = {
    files: Array<Record<string, unknown>>;
    criminalCases?: Array<Record<string, unknown>>;
    jurisdictionTab: LawsuitJurisdictionTab;
    lawsuitViewMode: 'active' | 'archived' | 'trash';
    onOpenFile: (file: Record<string, unknown>) => void;
    onOpenCriminalCase?: (id: string) => void;
    className?: string;
};

export function SparkLawsuitArchiveInsight({
    files,
    criminalCases = [],
    jurisdictionTab,
    lawsuitViewMode,
    onOpenFile,
    onOpenCriminalCase,
    className,
}: SparkLawsuitArchiveInsightProps) {
    const isCriminalTab = jurisdictionTab === 'criminal';

    const summary = useMemo(() => {
        if (lawsuitViewMode !== 'active') return null;
        if (isCriminalTab) {
            return buildCriminalArchiveAttentionNudge(
                scanCriminalArchiveForSpark(criminalCases, { maxHits: 24 }),
            );
        }
        return buildArchiveAttentionNudge(
            scanLawsuitArchiveForSpark(files, { jurisdictionTab, maxHits: 24 }),
        );
    }, [criminalCases, files, isCriminalTab, jurisdictionTab, lawsuitViewMode]);

    return (
        <SparkArchiveInsightShell
            summary={summary}
            summaryKind={
                isCriminalTab ? 'criminal.archive_attention_summary' : 'lawsuit.archive_attention_summary'
            }
            preferenceScope={isCriminalTab ? 'archive-criminal' : 'archive'}
            className={className}
            onOpenTarget={(targetFileId) => {
                if (isCriminalTab) {
                    onOpenCriminalCase?.(targetFileId);
                    return;
                }
                const target = files.find((f) => String(f.id ?? '') === targetFileId);
                if (target) onOpenFile(target);
            }}
        />
    );
}
