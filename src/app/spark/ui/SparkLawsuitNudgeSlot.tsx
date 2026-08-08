import type { CaseStage, TimelineEvent } from '@/app/components/lawyer/LawyerShared';
import type { SmartFileParentData } from '@/app/components/lawyer/smart-modal/smartFile/parentDataInit';
import { SparkLawsuitNudgeHost } from '@/app/spark/ui/SparkLawsuitNudgeHost';

export type SparkLawsuitNudgeSlotProps = {
    file: Record<string, unknown>;
    parentData: SmartFileParentData;
    displayStage: CaseStage;
    stages: CaseStage[];
    displayTimeline: TimelineEvent[];
    status: string;
    disabled?: boolean;
    onAbsentJudgmentNotification?: () => void;
    onOpponentAbsentObjection?: () => void;
    onAbandonmentRenewal: () => void;
    onAttachDocument: () => void;
    onViewAbsentFooter?: () => void;
    onOpenAppeal?: () => void;
    onResumeInterruption?: () => void;
    onResumePause?: () => void;
    onReviewPetitionVoid?: () => void;
    onReviewIncidental?: () => void;
    onCrossAppeal?: () => void;
};

/** نقطة دمج موحّدة لسبارك داخل إضبارة الدعوى (مدني / أحوال شخصية) */
export function SparkLawsuitNudgeSlot({
    file,
    parentData,
    displayStage,
    stages,
    displayTimeline,
    status,
    disabled = false,
    onAbsentJudgmentNotification,
    onOpponentAbsentObjection,
    onAbandonmentRenewal,
    onAttachDocument,
    onViewAbsentFooter,
    onOpenAppeal,
    onResumeInterruption,
    onResumePause,
    onReviewPetitionVoid,
    onReviewIncidental,
    onCrossAppeal,
}: SparkLawsuitNudgeSlotProps) {
    return (
        <SparkLawsuitNudgeHost
            file={file}
            parentData={parentData}
            displayStage={displayStage}
            stages={stages}
            displayTimeline={displayTimeline}
            status={status}
            disabled={disabled}
            actions={{
                onAbsentJudgmentNotification,
                onOpponentAbsentObjection,
                onAbandonmentRenewal,
                onAttachDocument,
                onViewAbsentFooter: onViewAbsentFooter ?? onAbsentJudgmentNotification,
                onOpenAppeal,
                onResumeInterruption,
                onResumePause,
                onReviewPetitionVoid,
                onReviewIncidental,
                onCrossAppeal,
            }}
        />
    );
}
