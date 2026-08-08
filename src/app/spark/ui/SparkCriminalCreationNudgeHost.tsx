import { useMemo } from 'react';
import type { CriminalCreationSparkContext } from '@/app/spark/context/criminalCreationSparkContext';
import { CRIMINAL_CREATION_DOSSIER_KEY } from '@/app/spark/context/criminalCreationSparkContext';
import { pickActiveCriminalCreationSparkNudge } from '@/app/spark/engine/sparkCriminalCreationEngine';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import { useSparkActiveNudge } from '@/app/spark/ui/useSparkActiveNudge';

export type SparkCriminalCreationNudgeHostProps = {
    ctx: CriminalCreationSparkContext;
    className?: string;
};

export function SparkCriminalCreationNudgeHost({
    ctx,
    className = 'px-4 pb-2',
}: SparkCriminalCreationNudgeHostProps) {
    const active = useMemo(() => pickActiveCriminalCreationSparkNudge(ctx), [ctx]);
    const { nudge, handleLater, handleDismiss } = useSparkActiveNudge({
        dossierKey: CRIMINAL_CREATION_DOSSIER_KEY,
        active,
    });

    if (!nudge) return null;

    return (
        <div className={className} dir="rtl">
            <SparkSmartBadge nudge={nudge} onLater={handleLater} onDismiss={handleDismiss} />
        </div>
    );
}
