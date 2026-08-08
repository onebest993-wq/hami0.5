import { useCallback, useMemo } from 'react';
import type { VerdictCard } from '@/app/components/lawyer/criminal-system/verdictCardsEngine';
import { buildCriminalSparkContext } from '@/app/spark/context/criminalSparkContext';
import { pickActiveCriminalSparkNudge } from '@/app/spark/engine/sparkCriminalEngine';
import { useSparkNudgeHostShellBridge } from '@/app/spark/shell/useSparkNudgeHostShellBridge';
import { buildCriminalShellReviewPayload } from '@/app/spark/shell/shellReviewPayloadBuilders';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import { useSparkActiveNudge } from '@/app/spark/ui/useSparkActiveNudge';

export type SparkCriminalNudgeHostProps = {
    caseId: string;
    caseNumber?: string;
    isArchived?: boolean;
    shouldShowArticle3DeadlineBanner?: boolean;
    article3ElapsedDays?: number | null;
    shouldShowMandatoryCassationBanner?: boolean;
    verdictCards?: VerdictCard[];
    disabled?: boolean;
    onAbsentiaObjection?: () => void;
    onReviewDossier?: () => void;
};

export function SparkCriminalNudgeHost({
    caseId,
    caseNumber,
    isArchived = false,
    shouldShowArticle3DeadlineBanner = false,
    article3ElapsedDays = null,
    shouldShowMandatoryCassationBanner = false,
    verdictCards = [],
    disabled = false,
    onAbsentiaObjection,
    onReviewDossier,
}: SparkCriminalNudgeHostProps) {
    const ctx = useMemo(
        () =>
            buildCriminalSparkContext({
                caseId,
                caseNumber,
                isArchived,
                shouldShowArticle3DeadlineBanner,
                article3ElapsedDays,
                shouldShowMandatoryCassationBanner,
                verdictCards,
            }),
        [
            article3ElapsedDays,
            caseId,
            caseNumber,
            isArchived,
            shouldShowArticle3DeadlineBanner,
            shouldShowMandatoryCassationBanner,
            verdictCards,
        ],
    );

    const active = useMemo(
        () => (disabled ? null : pickActiveCriminalSparkNudge(ctx)),
        [ctx, disabled],
    );

    const reviewPayload = useMemo(
        () => (disabled ? null : buildCriminalShellReviewPayload(ctx)),
        [ctx, disabled],
    );

    const { nudge, handleLater, handleDismiss, hideAfterFollow } = useSparkActiveNudge({
        disabled,
        dossierKey: ctx.dossierKey,
        active,
    });

    const runAction = useCallback(
        (actionId: string) => {
            switch (actionId) {
                case 'absentia_objection':
                    onAbsentiaObjection?.();
                    break;
                case 'review_dossier':
                    onReviewDossier?.();
                    break;
                default:
                    break;
            }
        },
        [onAbsentiaObjection, onReviewDossier],
    );

    const handleFollow = useCallback(() => {
        if (!nudge?.action) return;
        runAction(nudge.action.actionId);
        hideAfterFollow();
    }, [hideAfterFollow, nudge, runAction]);

    useSparkNudgeHostShellBridge({
        surface: 'criminal',
        dossierKey: ctx.dossierKey,
        dossierLabel: caseNumber || ctx.dossierKey.replace(/^criminal:/, ''),
        nudge: active,
        reviewPayload,
        onFollow: runAction,
        disabled,
    });

    if (!nudge) return null;

    return (
        <div className="px-3 pt-2 sm:px-4" dir="rtl">
            <SparkSmartBadge
                nudge={nudge}
                onFollow={nudge.action ? handleFollow : undefined}
                onLater={handleLater}
                onDismiss={handleDismiss}
            />
        </div>
    );
}
