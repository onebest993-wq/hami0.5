import { useMemo } from 'react';
import type { SparkNudge, SparkSurface } from '@/app/spark/types';
import type { SparkShellReviewPayload } from '@/app/spark/shell/shellReviewPayloadBuilders';
import { usePublishSparkShellContext } from '@/app/spark/shell/sparkShellStore';

export type UseSparkNudgeHostShellBridgeParams = {
    surface: SparkSurface;
    dossierKey: string;
    dossierLabel?: string;
    nudge: SparkNudge | null;
    passiveNudges?: SparkNudge[];
    auditNudge?: SparkNudge | null;
    reviewPayload?: SparkShellReviewPayload | null;
    onFollow?: (actionId: string) => void;
    disabled?: boolean;
};

/** ينشر سياق الإضبارة المفتوحة إلى SparkShell عند الطلب */
export function useSparkNudgeHostShellBridge({
    surface,
    dossierKey,
    dossierLabel,
    nudge,
    passiveNudges,
    auditNudge,
    reviewPayload,
    onFollow,
    disabled = false,
}: UseSparkNudgeHostShellBridgeParams): void {
    const registration = useMemo(() => {
        if (disabled) return null;
        if (!nudge && !passiveNudges?.length && !auditNudge && !reviewPayload) return null;
        return {
            surface,
            dossierKey,
            dossierLabel,
            passiveNudge: nudge,
            passiveNudges,
            auditNudge,
            reviewPayload,
            onFollow,
        };
    }, [
        auditNudge,
        disabled,
        dossierKey,
        dossierLabel,
        nudge,
        passiveNudges,
        onFollow,
        reviewPayload,
        surface,
    ]);

    usePublishSparkShellContext(registration);
}
