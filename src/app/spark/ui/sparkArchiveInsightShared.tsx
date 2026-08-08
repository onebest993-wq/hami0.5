import { useCallback, useState } from 'react';
import type { SparkNudge } from '@/app/spark/types';
import {
    isSparkNudgeSuppressed,
    recordSparkDismiss,
    recordSparkSnooze,
} from '@/app/spark/memory/sparkPreferenceStore';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';

export type SparkArchiveInsightShellProps = {
    summary: SparkNudge | null;
    summaryKind: SparkNudge['kind'];
    preferenceScope: string;
    onOpenTarget: (targetFileId: string) => void;
    className?: string;
};

export function SparkArchiveInsightShell({
    summary,
    summaryKind,
    preferenceScope,
    onOpenTarget,
    className = 'px-4 pt-3 sm:px-5',
}: SparkArchiveInsightShellProps) {
    const [hiddenId, setHiddenId] = useState<string | null>(null);

    const nudge =
        summary && summary.id !== hiddenId && !isSparkNudgeSuppressed(summaryKind, preferenceScope)
            ? summary
            : null;

    const handleFollow = useCallback(() => {
        if (!nudge?.targetFileId) return;
        onOpenTarget(nudge.targetFileId);
        setHiddenId(nudge.id);
    }, [nudge, onOpenTarget]);

    const handleLater = useCallback(() => {
        if (!nudge) return;
        recordSparkSnooze(summaryKind, preferenceScope);
        setHiddenId(nudge.id);
    }, [nudge, preferenceScope, summaryKind]);

    const handleDismiss = useCallback(() => {
        if (!nudge) return;
        recordSparkDismiss(summaryKind, preferenceScope);
        setHiddenId(nudge.id);
    }, [nudge, preferenceScope, summaryKind]);

    if (!nudge) return null;

    return (
        <div className={className} dir="rtl">
            <SparkSmartBadge
                nudge={nudge}
                onFollow={nudge.action ? handleFollow : undefined}
                onLater={handleLater}
                onDismiss={handleDismiss}
            />
        </div>
    );
}
