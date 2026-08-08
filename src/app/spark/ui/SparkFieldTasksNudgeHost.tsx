import { useMemo } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { pickActiveFieldTaskSparkNudge } from '@/app/spark/engine/sparkFieldTasksEngine';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import { useSparkActiveNudge } from '@/app/spark/ui/useSparkActiveNudge';

export type SparkFieldTasksNudgeHostProps = {
    tasks: LegalTask[];
    disabled?: boolean;
    className?: string;
};

export function SparkFieldTasksNudgeHost({
    tasks,
    disabled = false,
    className = 'px-3 pb-2',
}: SparkFieldTasksNudgeHostProps) {
    const active = useMemo(() => pickActiveFieldTaskSparkNudge(tasks), [tasks]);
    const { nudge, handleLater, handleDismiss } = useSparkActiveNudge({
        disabled,
        dossierKey: 'field:sheet',
        active,
    });

    if (!nudge) return null;

    return (
        <div className={className} dir="rtl">
            <SparkSmartBadge nudge={nudge} onLater={handleLater} onDismiss={handleDismiss} />
        </div>
    );
}
