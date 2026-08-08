import { useMemo } from 'react';
import type { LawsuitCreationSparkContext } from '@/app/spark/context/lawsuitCreationSparkContext';
import { LAWSUIT_CREATION_DOSSIER_KEY } from '@/app/spark/context/lawsuitCreationSparkContext';
import { pickActiveLawsuitCreationSparkNudge } from '@/app/spark/engine/sparkLawsuitCreationEngine';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import { useSparkActiveNudge } from '@/app/spark/ui/useSparkActiveNudge';

export type SparkLawsuitCreationNudgeHostProps = {
    ctx: LawsuitCreationSparkContext;
    disabled?: boolean;
    className?: string;
};

export function SparkLawsuitCreationNudgeHost({
    ctx,
    disabled = false,
    className = 'px-4 pb-2',
}: SparkLawsuitCreationNudgeHostProps) {
    const active = useMemo(() => pickActiveLawsuitCreationSparkNudge(ctx), [ctx]);
    const { nudge, handleLater, handleDismiss } = useSparkActiveNudge({
        disabled,
        dossierKey: LAWSUIT_CREATION_DOSSIER_KEY,
        active,
    });

    if (!nudge) return null;

    return (
        <div className={className} dir="rtl">
            <SparkSmartBadge
                nudge={nudge}
                onLater={handleLater}
                onDismiss={handleDismiss}
            />
        </div>
    );
}
