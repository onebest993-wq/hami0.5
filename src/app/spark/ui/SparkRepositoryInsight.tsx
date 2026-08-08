import { useMemo } from 'react';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { scanRepositoryForSpark } from '@/app/spark/engine/repositorySparkScan';
import { isSparkNudgeSuppressed } from '@/app/spark/memory/sparkPreferenceStore';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import { useSparkActiveNudge } from '@/app/spark/ui/useSparkActiveNudge';

export type SparkRepositoryFollowMeta = {
    targetFileId?: string;
};

export type SparkRepositoryInsightProps = {
    unboundVaultDocs: SmartVaultDoc[];
    vaultDocsForScan?: SmartVaultDoc[];
    notesForScan?: GlobalNote[];
    lawsuitFiles?: FileData[];
    executionFiles?: ExecutionFile[];
    pendingUpload: boolean;
    uploadQueueCount?: number;
    onFollow?: (actionId: string, meta?: SparkRepositoryFollowMeta) => void;
    className?: string;
};

export function SparkRepositoryInsight({
    unboundVaultDocs,
    vaultDocsForScan,
    notesForScan,
    lawsuitFiles = [],
    executionFiles = [],
    pendingUpload,
    uploadQueueCount = 0,
    onFollow,
    className = 'px-4 pt-2',
}: SparkRepositoryInsightProps) {
    const active = useMemo(() => {
        const scanned = scanRepositoryForSpark({
            unboundVaultDocs,
            vaultDocsForScan,
            notesForScan,
            lawsuitFiles,
            executionFiles,
            pendingUpload,
            uploadQueueCount,
        });
        const nudge = scanned.nudge;
        if (!nudge) return null;
        if (isSparkNudgeSuppressed(nudge.kind, 'repository:session')) return null;
        return nudge;
    }, [pendingUpload, unboundVaultDocs, uploadQueueCount, vaultDocsForScan, notesForScan, lawsuitFiles, executionFiles]);

    const { nudge, handleLater, handleDismiss, hideAfterFollow } = useSparkActiveNudge({
        dossierKey: 'repository:session',
        active,
    });

    if (!nudge) return null;

    const handleFollow = () => {
        if (nudge.action?.actionId) {
            onFollow?.(nudge.action.actionId, {
                targetFileId: nudge.targetFileId,
            });
        }
        hideAfterFollow();
    };

    return (
        <div className={className} dir="rtl">
            <SparkSmartBadge
                nudge={nudge}
                onFollow={nudge.action && onFollow ? handleFollow : undefined}
                onLater={handleLater}
                onDismiss={handleDismiss}
            />
        </div>
    );
}
