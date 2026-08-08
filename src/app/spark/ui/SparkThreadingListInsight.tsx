import { useMemo } from 'react';
import { pickActiveThreadingSparkNudge } from '@/app/spark/engine/sparkThreadingEngine';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import { useSparkActiveNudge } from '@/app/spark/ui/useSparkActiveNudge';

export type SparkThreadingListInsightProps = {
    transactions: unknown[];
    tasks: unknown[];
    className?: string;
};

export function SparkThreadingListInsight({
    transactions,
    tasks,
    className = 'px-4 pb-2',
}: SparkThreadingListInsightProps) {
    const active = useMemo(
        () => pickActiveThreadingSparkNudge(transactions, tasks),
        [tasks, transactions],
    );
    const { nudge, handleLater, handleDismiss } = useSparkActiveNudge({
        dossierKey: 'threading:list',
        active,
    });

    if (!nudge) return null;

    return (
        <div className={className} dir="rtl">
            <SparkSmartBadge nudge={nudge} onLater={handleLater} onDismiss={handleDismiss} />
        </div>
    );
}
