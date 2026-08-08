import type { FileStatus, GrievanceData, JudgeDecision, ExecutionData, CassationData } from '@/app/components/lawyer/Dashboard_Active_Order_File/types';
import type { SparkJurisdiction } from '@/app/spark/types';

export type UrgentSparkContext = {
    dossierKey: string;
    caseId: string;
    jurisdiction: Extract<SparkJurisdiction, 'unknown'>;
    isFinalized: boolean;
    fileStatus: FileStatus;
    activeLifecycleStep: 'judge' | 'execution' | 'grievance' | 'cassation' | null;
    judgeDecision: JudgeDecision;
    executionData: ExecutionData;
    grievanceData: GrievanceData;
    grievanceDecisionNotificationConfirmed: boolean;
    cassationData: CassationData;
    caseLabel: string;
};

export function buildUrgentSparkContext(params: {
    caseId: string;
    requestNumber?: string;
    isFinalized?: boolean;
    fileStatus?: FileStatus;
    activeLifecycleStep?: UrgentSparkContext['activeLifecycleStep'];
    judgeDecision?: Partial<JudgeDecision>;
    executionData?: Partial<ExecutionData>;
    grievanceData?: Partial<GrievanceData>;
    grievanceDecisionNotificationConfirmed?: boolean;
    cassationData?: Partial<CassationData>;
    caseLabel?: string;
}): UrgentSparkContext {
    const caseId = String(params.caseId);
    const requestNumber = String(params.requestNumber ?? '').trim();
    const dossierKey = requestNumber ? `urgent:${requestNumber}` : `urgent:${caseId}`;

    return {
        dossierKey,
        caseId,
        jurisdiction: 'unknown',
        isFinalized: Boolean(params.isFinalized),
        fileStatus: params.fileStatus ?? 'pending',
        activeLifecycleStep: params.activeLifecycleStep ?? 'judge',
        judgeDecision: {
            decision: params.judgeDecision?.decision ?? null,
            decisionDate: String(params.judgeDecision?.decisionDate ?? ''),
            requiresGuarantee: Boolean(params.judgeDecision?.requiresGuarantee),
        },
        executionData: {
            executionDate: String(params.executionData?.executionDate ?? ''),
            notificationDate: String(params.executionData?.notificationDate ?? ''),
            deadlineDays: Number(params.executionData?.deadlineDays ?? 0),
            authority: String(params.executionData?.authority ?? ''),
            notes: String(params.executionData?.notes ?? ''),
        },
        grievanceData: {
            rejectionNotificationDate: String(params.grievanceData?.rejectionNotificationDate ?? ''),
            outcome: params.grievanceData?.outcome ?? '',
            filingDate: String(params.grievanceData?.filingDate ?? ''),
        },
        grievanceDecisionNotificationConfirmed: Boolean(params.grievanceDecisionNotificationConfirmed),
        cassationData: {
            filedBy: params.cassationData?.filedBy ?? null,
            outcome: params.cassationData?.outcome ?? '',
            filingDate: String(params.cassationData?.filingDate ?? ''),
            fileNumber: String(params.cassationData?.fileNumber ?? ''),
        },
        caseLabel: String(params.caseLabel ?? (requestNumber || caseId)),
    };
}

export function buildUrgentSparkContextFromCaseRecord(record: Record<string, unknown>): UrgentSparkContext | null {
    const caseId = String(record.id ?? '').trim();
    if (!caseId) return null;

    return buildUrgentSparkContext({
        caseId,
        requestNumber: String(record.requestNumber ?? record.caseNumber ?? ''),
        isFinalized: Boolean(record.archivedAt || record.isFinalized),
        fileStatus: (record.fileStatus as FileStatus | undefined) ?? 'pending',
        activeLifecycleStep:
            (record.activeLifecycleStep as UrgentSparkContext['activeLifecycleStep']) ?? 'judge',
        judgeDecision: (record.judgeDecision as Partial<JudgeDecision> | undefined) ?? undefined,
        executionData: (record.executionData as Partial<ExecutionData> | undefined) ?? undefined,
        grievanceData: (record.grievanceData as Partial<GrievanceData> | undefined) ?? undefined,
        grievanceDecisionNotificationConfirmed: record.grievanceDecisionNotificationConfirmed === true,
        cassationData: (record.cassationData as Partial<CassationData> | undefined) ?? undefined,
        caseLabel: String(record.specificActionType ?? record.actionPath ?? record.requestNumber ?? caseId),
    });
}
