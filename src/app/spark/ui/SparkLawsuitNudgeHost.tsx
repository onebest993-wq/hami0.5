import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CaseStage, TimelineEvent } from '@/app/components/lawyer/LawyerShared';
import type { SmartFileParentData } from '@/app/components/lawyer/smart-modal/smartFile/parentDataInit';
import { buildLawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';
import { pickLawsuitSparkNudgeQueue } from '@/app/spark/engine/sparkHybridEngine';
import { useSparkNudgeHostShellBridge } from '@/app/spark/shell/useSparkNudgeHostShellBridge';
import { buildLawsuitShellReviewPayload } from '@/app/spark/shell/shellReviewPayloadBuilders';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import { useSparkActiveNudgeFromQueue } from '@/app/spark/ui/useSparkActiveNudge';
import { useDebouncedValue } from '@/app/spark/ui/useDebouncedValue';
import { SPARK_SHELL_REVIEW_DEBOUNCE_MS } from '@/app/spark/policy/sparkAnalysisPolicy';
import { requestSparkLawsuitTimelineFocus } from '@/app/spark/focus/sparkLawsuitFocus';
import { useLawsuitBoundVaultDocs } from '@/app/spark/vault/useLawsuitBoundVaultDocs';
import { requestSparkOpenVaultDoc } from '@/app/spark/focus/sparkVaultDocFocus';

export type SparkLawsuitActionHandlers = {
    onAbsentJudgmentNotification?: () => void;
    onOpponentAbsentObjection?: () => void;
    onAbandonmentRenewal?: () => void;
    onAttachDocument?: () => void;
    onViewAbsentFooter?: () => void;
    onOpenAppeal?: () => void;
    onResumeInterruption?: () => void;
    onResumePause?: () => void;
    onReviewPetitionVoid?: () => void;
    onReviewIncidental?: () => void;
    onCrossAppeal?: () => void;
};

export type SparkLawsuitNudgeHostProps = {
    file: Record<string, unknown>;
    parentData: SmartFileParentData;
    displayStage: CaseStage;
    stages: CaseStage[];
    displayTimeline: TimelineEvent[];
    status: string;
    actions: SparkLawsuitActionHandlers;
    disabled?: boolean;
};

export function SparkLawsuitNudgeHost({
    file,
    parentData,
    displayStage,
    stages,
    displayTimeline,
    status,
    actions,
    disabled = false,
}: SparkLawsuitNudgeHostProps) {
    const boundVaultDocs = useLawsuitBoundVaultDocs(file, !disabled);

    const sparkInputs = useMemo(
        () => ({
            file,
            parentData,
            displayStage,
            stages,
            displayTimeline,
            status,
            boundVaultDocs,
        }),
        [boundVaultDocs, displayStage, displayTimeline, file, parentData, stages, status],
    );
    const debouncedInputs = useDebouncedValue(sparkInputs);
    const shellInputs = useDebouncedValue(sparkInputs, SPARK_SHELL_REVIEW_DEBOUNCE_MS);

    const ctx = useMemo(() => buildLawsuitSparkContext(debouncedInputs), [debouncedInputs]);

    const [auditRevision, setAuditRevision] = useState(0);

    useEffect(() => {
        const onAuditUpdated = (event: Event) => {
            const detail = (event as CustomEvent<{ dossierKey?: string }>).detail;
            if (detail?.dossierKey === ctx.dossierKey) {
                setAuditRevision((n) => n + 1);
            }
        };
        window.addEventListener('spark-audit-updated', onAuditUpdated);
        return () => window.removeEventListener('spark-audit-updated', onAuditUpdated);
    }, [ctx.dossierKey]);

    const nudgeQueue = useMemo(
        () => (disabled ? [] : pickLawsuitSparkNudgeQueue(ctx, 5)),
        [ctx, disabled, auditRevision],
    );

    const reviewPayload = useMemo(
        () => (disabled ? null : buildLawsuitShellReviewPayload(buildLawsuitSparkContext(shellInputs))),
        [disabled, shellInputs],
    );

    const { nudge, visibleQueue, handleLater, handleDismiss, hideAfterFollow } =
        useSparkActiveNudgeFromQueue({
            disabled,
            dossierKey: ctx.dossierKey,
            queue: nudgeQueue,
        });

    const runAction = useCallback(
        (actionId: string, targetFileId?: string) => {
            switch (actionId) {
                case 'absent_notification':
                    actions.onAbsentJudgmentNotification?.();
                    break;
                case 'defendant_objection':
                    actions.onOpponentAbsentObjection?.();
                    break;
                case 'abandonment_renewal':
                    actions.onAbandonmentRenewal?.();
                    break;
                case 'attach_document':
                    actions.onAttachDocument?.();
                    break;
                case 'view_absent_footer':
                    actions.onViewAbsentFooter?.();
                    break;
                case 'open_appeal':
                    actions.onOpenAppeal?.();
                    break;
                case 'resume_interruption':
                    actions.onResumeInterruption?.();
                    break;
                case 'resume_pause':
                    actions.onResumePause?.();
                    break;
                case 'review_petition_void':
                    actions.onReviewPetitionVoid?.();
                    break;
                case 'review_incidental':
                    actions.onReviewIncidental?.();
                    break;
                case 'cross_appeal':
                    actions.onCrossAppeal?.();
                    break;
                case 'focus_stage':
                    requestSparkLawsuitTimelineFocus();
                    break;
                case 'open_vault_doc':
                    requestSparkOpenVaultDoc(targetFileId ?? '');
                    break;
                default:
                    break;
            }
        },
        [actions],
    );

    const handleFollow = useCallback(() => {
        if (!nudge?.action) return;
        runAction(nudge.action.actionId, nudge.targetFileId);
        hideAfterFollow();
    }, [hideAfterFollow, nudge, runAction]);

    useSparkNudgeHostShellBridge({
        surface: 'lawsuit',
        dossierKey: ctx.dossierKey,
        dossierLabel: ctx.dossierKey.replace(/^lawsuit:/, ''),
        nudge: visibleQueue[0] ?? null,
        passiveNudges: visibleQueue,
        reviewPayload,
        onFollow: (actionId) => {
            const match = visibleQueue.find((item) => item.action?.actionId === actionId);
            runAction(actionId, match?.targetFileId);
        },
        disabled,
    });

    if (!nudge) return null;

    return (
        <SparkSmartBadge
            nudge={nudge}
            onFollow={nudge.action ? handleFollow : undefined}
            onLater={handleLater}
            onDismiss={handleDismiss}
        />
    );
}
