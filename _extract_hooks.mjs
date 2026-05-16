import fs from 'fs';

const rootPath = 'src/app/components/lawyer/Dashboard_Active_Order_File/ActiveOrderFileRoot.tsx';
const lines = fs.readFileSync(rootPath, 'utf8').split(/\r?\n/);

function slice(start1, end1) {
    return lines.slice(start1 - 1, end1).join('\n');
}

// 1) Pathway: 278-448
const pathwayBody = slice(278, 448);
const pathwayHook = `import { useMemo } from 'react';
import { isIqrarRequest } from '../../Form_Urgent_Actions/constants';

export type UseOrderFileCasePathwayArgs = {
    caseData: any;
    fd: Record<string, unknown>;
    fileStatus: import('../types').FileStatus;
    activeLifecycleStep: 'judge' | 'execution' | 'grievance' | 'cassation' | null;
    judgeDecision: import('../types').JudgeDecision;
    grievanceDecision: import('../types').GrievanceDecision;
    hearings: import('../types').CaseHearing[];
    preDecisionClosed: boolean;
};

export function useOrderFileCasePathway({
    caseData,
    fd,
    fileStatus,
    activeLifecycleStep,
    judgeDecision,
    grievanceDecision,
    hearings,
    preDecisionClosed,
}: UseOrderFileCasePathwayArgs) {
${pathwayBody.replace(/^    /gm, '    ')}
}
`;

fs.writeFileSync(
    'src/app/components/lawyer/Dashboard_Active_Order_File/hooks/useOrderFileCasePathway.ts',
    pathwayHook,
);

// 2) Actions: 450-1373 + finalize 2158-2194
const actionsBody = slice(450, 1373) + '\n' + slice(2158, 2194);
const actionsHook = `import { useEffect } from 'react';
import { uuidv4 } from '@/app/services/urgent-actions-db';
import { getActiveDate } from '@/app/utils/hearingDates';
import {
    isAdjournReasonValid,
    getPreDecisionSessionOutcome,
    isGrievancePleadingClosedSession,
    isPreDecisionCloseNotes,
    isPreDecisionNullifyNotes,
} from '../utils/hearingRules';
import {
    PRE_DECISION_OUTCOME_ADJOURN,
    PRE_DECISION_OUTCOME_CLOSE,
    PRE_DECISION_OUTCOME_NULLIFY,
} from '../constants/hearingOutcomes';
import { formatDateText, formatDateTimeText } from '../utils/formatters';
import { addDaysYmd, maxYmd } from '../utils/ymd';
import type {
    CaseHearing,
    CassationData,
    CassationDecision,
    ExpertModule,
    FileStatus,
    GrievanceData,
    GrievanceDecision,
    JudgeDecision,
    HearingStage,
} from '../types';

export type UseOrderFileLifecycleActionsArgs = {
    caseId: string | null;
    caseData: any;
    setCaseData: React.Dispatch<React.SetStateAction<any>>;
    onCaseUpdated?: (caseId: string, patch: Record<string, unknown>) => void;
    todayYmdValue: string;
    requestDateYmd: string;
    isFinalized: boolean;
    fileStatus: FileStatus;
    setFileStatus: React.Dispatch<React.SetStateAction<FileStatus>>;
    isSecretMode: boolean;
    setIsSecretMode: React.Dispatch<React.SetStateAction<boolean>>;
    hasIntervention: boolean;
    setHasIntervention: React.Dispatch<React.SetStateAction<boolean>>;
    activeLifecycleStep: 'judge' | 'execution' | 'grievance' | 'cassation' | null;
    setActiveLifecycleStep: React.Dispatch<React.SetStateAction<'judge' | 'execution' | 'grievance' | 'cassation' | null>>;
    judgeDecision: JudgeDecision;
    setJudgeDecision: React.Dispatch<React.SetStateAction<JudgeDecision>>;
    executionData: import('../types').ExecutionData;
    setExecutionData: React.Dispatch<React.SetStateAction<import('../types').ExecutionData>>;
    grievanceData: GrievanceData;
    setGrievanceData: React.Dispatch<React.SetStateAction<GrievanceData>>;
    phase2FirstHearingDate: string;
    setPhase2FirstHearingDate: React.Dispatch<React.SetStateAction<string>>;
    grievanceLegalEndDate: string;
    setGrievanceLegalEndDate: React.Dispatch<React.SetStateAction<string>>;
    grievanceTimingConfirmed: boolean;
    setGrievanceTimingConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    grievanceDetailsConfirmed: boolean;
    setGrievanceDetailsConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    grievanceExpiredConfirmed: boolean;
    setGrievanceExpiredConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    grievanceDecision: GrievanceDecision;
    setGrievanceDecision: React.Dispatch<React.SetStateAction<GrievanceDecision>>;
    cassationData: CassationData;
    setCassationData: React.Dispatch<React.SetStateAction<CassationData>>;
    cassationDecision: CassationDecision;
    setCassationDecision: React.Dispatch<React.SetStateAction<CassationDecision>>;
    guaranteeSubmitted: boolean;
    setGuaranteeSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
    guaranteeDetails: { amount: string; receiptNumber: string };
    hearings: CaseHearing[];
    setHearings: React.Dispatch<React.SetStateAction<CaseHearing[]>>;
    hearingDraft: {
        open: boolean;
        stage: HearingStage;
        outcome: 'adjourn' | 'close' | 'terminate';
        sessionDate: string;
        notes: string;
        nextSessionDate: string;
        decisionDate: string;
    };
    setHearingDraft: React.Dispatch<React.SetStateAction<UseOrderFileLifecycleActionsArgs['hearingDraft']>>;
    expertModule: ExpertModule;
    setExpertModule: React.Dispatch<React.SetStateAction<ExpertModule>>;
    registrationData: {
        receiptNumber: string;
        receiptDate: string;
        notificationMethod: string;
        notificationDate: string;
    };
    setRegistrationData: React.Dispatch<React.SetStateAction<UseOrderFileLifecycleActionsArgs['registrationData']>>;
    pendingRegistrationSyncRef: React.MutableRefObject<boolean>;
    editJudge: boolean;
    setEditJudge: React.Dispatch<React.SetStateAction<boolean>>;
    editExecution: boolean;
    setEditExecution: React.Dispatch<React.SetStateAction<boolean>>;
    editRejectionNotice: boolean;
    setEditRejectionNotice: React.Dispatch<React.SetStateAction<boolean>>;
    editGrievance: boolean;
    setEditGrievance: React.Dispatch<React.SetStateAction<boolean>>;
    editCassation: boolean;
    setEditCassation: React.Dispatch<React.SetStateAction<boolean>>;
    setJudgeError: React.Dispatch<React.SetStateAction<string | null>>;
    setExecutionError: React.Dispatch<React.SetStateAction<string | null>>;
    setRejectionNoticeError: React.Dispatch<React.SetStateAction<string | null>>;
    setGrievanceError: React.Dispatch<React.SetStateAction<string | null>>;
    setGrievanceDecisionError: React.Dispatch<React.SetStateAction<string | null>>;
    setCassationError: React.Dispatch<React.SetStateAction<string | null>>;
    setCassationDecisionError: React.Dispatch<React.SetStateAction<string | null>>;
    setHearingsError: React.Dispatch<React.SetStateAction<string | null>>;
    persistPatch: (patch: Record<string, unknown>) => void;
    flushPersistPatch: (patch: Record<string, unknown>) => Promise<void>;
    persistAndMerge: (patch: Record<string, unknown>) => void;
    appendCaseEvent: (message: string, kind?: import('../types').CaseEvent['kind']) => void;
    requestConfirm: (message: string) => Promise<boolean>;
    showGrievanceStep: boolean;
    showPreDecisionHearings: boolean;
    preDecisionTerminateExists: boolean;
    isIqrarContext: boolean;
    isStateOrder: boolean;
    isCaseTerminated: boolean;
    hasSessions: boolean;
    grievanceLegalEndDateChronologyError: string | null;
    grievanceExpiredCanClose: boolean;
    grievanceClosingHearingExists: boolean;
    grievanceFilingDateChronologyError: string | null;
    grievanceFirstHearingDateChronologyError: string | null;
    grievanceDecisionDateChronologyError: string | null;
    judgeDecisionDateChronologyError: string | null;
    cassationFilingDateChronologyError: string | null;
    cassationDecisionDateError: string | null;
    cassationFilingDetailsComplete: boolean;
    phase1NewSessionMinYmd: string;
    phase2NewSessionMinYmd: string;
    effectiveJudgeDecisionDate: string;
    effectiveRejectionNotificationDate: string;
    grievanceTimingGateReady: boolean;
    grievanceFilingMinYmd: string;
    grievanceFirstHearingMinYmd: string;
    oppositeRole: (role: 'client' | 'opponent') => 'client' | 'opponent';
};

export function useOrderFileLifecycleActions(args: UseOrderFileLifecycleActionsArgs) {
    const {
        caseId,
        caseData,
        setCaseData,
        onCaseUpdated,
        todayYmdValue,
        requestDateYmd,
        isFinalized,
        fileStatus,
        setFileStatus,
        isSecretMode,
        setIsSecretMode,
        hasIntervention,
        setHasIntervention,
        activeLifecycleStep,
        setActiveLifecycleStep,
        judgeDecision,
        setJudgeDecision,
        executionData,
        setExecutionData,
        grievanceData,
        setGrievanceData,
        phase2FirstHearingDate,
        setPhase2FirstHearingDate,
        grievanceLegalEndDate,
        setGrievanceLegalEndDate,
        grievanceTimingConfirmed,
        setGrievanceTimingConfirmed,
        grievanceDetailsConfirmed,
        setGrievanceDetailsConfirmed,
        grievanceExpiredConfirmed,
        setGrievanceExpiredConfirmed,
        grievanceDecision,
        setGrievanceDecision,
        cassationData,
        setCassationData,
        cassationDecision,
        setCassationDecision,
        guaranteeSubmitted,
        setGuaranteeSubmitted,
        guaranteeDetails,
        hearings,
        setHearings,
        hearingDraft,
        setHearingDraft,
        expertModule,
        setExpertModule,
        registrationData,
        setRegistrationData,
        pendingRegistrationSyncRef,
        editJudge,
        setEditJudge,
        setEditExecution,
        setEditRejectionNotice,
        editGrievance,
        setEditGrievance,
        setEditCassation,
        setJudgeError,
        setExecutionError,
        setRejectionNoticeError,
        setGrievanceError,
        setGrievanceDecisionError,
        setCassationError,
        setCassationDecisionError,
        setHearingsError,
        persistPatch,
        flushPersistPatch,
        persistAndMerge,
        appendCaseEvent,
        requestConfirm,
        showGrievanceStep,
        showPreDecisionHearings,
        preDecisionTerminateExists,
        isIqrarContext,
        isStateOrder,
        isCaseTerminated,
        hasSessions,
        grievanceLegalEndDateChronologyError,
        grievanceExpiredCanClose,
        grievanceClosingHearingExists,
        grievanceFilingDateChronologyError,
        grievanceFirstHearingDateChronologyError,
        grievanceDecisionDateChronologyError,
        judgeDecisionDateChronologyError,
        cassationFilingDateChronologyError,
        cassationDecisionDateError,
        cassationFilingDetailsComplete,
        phase1NewSessionMinYmd,
        phase2NewSessionMinYmd,
        effectiveJudgeDecisionDate,
        effectiveRejectionNotificationDate,
        grievanceTimingGateReady,
        grievanceFilingMinYmd,
        grievanceFirstHearingMinYmd,
        oppositeRole,
    } = args;

${actionsBody}
}
`;

fs.writeFileSync(
    'src/app/components/lawyer/Dashboard_Active_Order_File/hooks/useOrderFileLifecycleActions.ts',
    actionsHook,
);

console.log('extracted pathway + actions hooks');
