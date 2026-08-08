import type { ExecutionFile } from '@/app/types/execution';
import type { ExecutionSparkRuntimeOverlay } from '@/app/spark/context/executionSparkRuntimeOverlay';
import {
    SparkExecutionNudgeHost,
    type SparkExecutionActionHandlers,
} from '@/app/spark/ui/SparkExecutionNudgeHost';

export type SparkExecutionNudgeSlotProps = {
    executionData: ExecutionFile;
    executionPaused?: boolean;
    decisionsStorageExecutionId?: string;
    disabled?: boolean;
    runtimeOverlay?: ExecutionSparkRuntimeOverlay;
    presentation?: 'header-chip' | 'banner';
} & SparkExecutionActionHandlers;

/** نقطة دمج موحّدة لسبارك داخل إضبارة التنفيذ */
export function SparkExecutionNudgeSlot({
    executionData,
    executionPaused = false,
    decisionsStorageExecutionId,
    disabled = false,
    runtimeOverlay,
    presentation = 'header-chip',
    onOpenSummons,
    onOpenDecisions,
    onRecordDetentionJudge,
    onResumeLifecycle,
    onOpenCoercive,
    onOpenFollowup,
    onOpenTimeline,
    onOpenSeizureRequests,
    onOpenEmployeeAssignment,
    onOpenFinancialCenter,
}: SparkExecutionNudgeSlotProps) {
    return (
        <SparkExecutionNudgeHost
            executionData={executionData}
            executionPaused={executionPaused}
            decisionsStorageExecutionId={decisionsStorageExecutionId}
            disabled={disabled}
            runtimeOverlay={runtimeOverlay}
            presentation={presentation}
            actions={{
                onOpenSummons,
                onOpenDecisions,
                onRecordDetentionJudge,
                onResumeLifecycle,
                onOpenCoercive,
                onOpenFollowup,
                onOpenTimeline,
                onOpenSeizureRequests,
                onOpenEmployeeAssignment,
                onOpenFinancialCenter,
            }}
        />
    );
}
