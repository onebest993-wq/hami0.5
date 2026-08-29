import { useEffect, useRef, useState } from 'react';
import type {
    CaseAttachment,
    CaseEvent,
    CaseFollowup,
    CaseHearing,
    CaseNote,
    CassationData,
    CassationDecision,
    ExecutionData,
    ExpertModule,
    FileStatus,
    GrievanceData,
    GrievanceDecision,
    HearingStage,
    JudgeDecision,
} from '../types';

export type HearingDraftState = {
    open: boolean;
    stage: HearingStage;
    outcome: 'adjourn' | 'close' | 'terminate';
    sessionDate: string;
    notes: string;
    nextSessionDate: string;
    decisionDate: string;
};

type UseOrderFileLifecycleStateArgs = {
    fileData: unknown;
    defaultDeadlineDays: number;
};

export function useOrderFileLifecycleState({ fileData, defaultDeadlineDays }: UseOrderFileLifecycleStateArgs) {
    const fd = fileData as Record<string, unknown>;
    const [caseData, setCaseData] = useState<Record<string, unknown>>(fd);

    const [fileStatus, setFileStatus] = useState<FileStatus>('pending');
    const [isSecretMode, setIsSecretMode] = useState(true);
    const [hasIntervention, setHasIntervention] = useState(false);
    const [activeLifecycleStep, setActiveLifecycleStep] = useState<'judge' | 'execution' | 'grievance' | 'cassation' | null>(
        'judge',
    );

    const [judgeDecision, setJudgeDecision] = useState<JudgeDecision>({
        decision: null,
        decisionDate: '',
        requiresGuarantee: false,
    });
    const [executionData, setExecutionData] = useState<ExecutionData>({
        executionDate: '',
        notificationDate: '',
        deadlineDays: defaultDeadlineDays,
        authority: '',
        notes: '',
    });
    const [grievanceData, setGrievanceData] = useState<GrievanceData>({
        rejectionNotificationDate: '',
        outcome: '',
        filingDate: '',
    });
    const [phase2FirstHearingDate, setPhase2FirstHearingDate] = useState<string>(() => {
        const raw = String(fd.grievanceFirstHearingDate ?? fd.phase2FirstHearingDate ?? '').trim();
        return raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
    });
    const [grievanceLegalEndDate, setGrievanceLegalEndDate] = useState<string>(
        String(fd.grievanceLegalEndDate ?? ''),
    );
    const [grievanceDecisionNotificationConfirmed, setGrievanceDecisionNotificationConfirmed] = useState<boolean>(false);
    const [grievancePetitionNotificationDate, setGrievancePetitionNotificationDate] = useState<string>(
        String(fd.grievancePetitionNotificationDate ?? ''),
    );
    const [grievancePetitionNotificationConfirmed, setGrievancePetitionNotificationConfirmed] = useState<boolean>(false);
    const [decisionNotificationModalOpen, setDecisionNotificationModalOpen] = useState<boolean>(false);
    const [petitionNotificationModalOpen, setPetitionNotificationModalOpen] = useState<boolean>(false);
    const [grievanceTimingConfirmed, setGrievanceTimingConfirmed] = useState<boolean>(false);
    const [grievanceDetailsConfirmed, setGrievanceDetailsConfirmed] = useState<boolean>(false);
    const [grievanceExpiredConfirmed, setGrievanceExpiredConfirmed] = useState<boolean>(false);
    const [grievanceDecision, setGrievanceDecision] = useState<GrievanceDecision>({
        decision: null,
        decisionDate: '',
    });
    const [cassationData, setCassationData] = useState<CassationData>({
        filedBy: null,
        outcome: '',
        filingDate: '',
        fileNumber: '',
    });
    const [cassationDecision, setCassationDecision] = useState<CassationDecision>({
        decision: null,
        decisionDate: '',
    });
    const [cassationExpiredConfirmed, setCassationExpiredConfirmed] = useState<boolean>(false);

    const [guaranteeSubmitted, setGuaranteeSubmitted] = useState<boolean>(false);
    const [guaranteeDetails, setGuaranteeDetails] = useState<{ amount: string; receiptNumber: string }>({
        amount: String(fd.guaranteeAmount ?? ''),
        receiptNumber: String(fd.guaranteeReceiptNumber ?? ''),
    });
    const [hearings, setHearings] = useState<CaseHearing[]>([]);
    const [hearingDraft, setHearingDraft] = useState<HearingDraftState>({
        open: false,
        stage: 'pre_decision',
        outcome: 'adjourn',
        sessionDate: '',
        notes: '',
        nextSessionDate: '',
        decisionDate: '',
    });

    useEffect(() => {
        if (!hearingDraft.open) return;
        if (hearingDraft.outcome === 'adjourn') return;
        setHearingDraft((s) => {
            if (!s.open) return s;
            if (s.outcome === 'adjourn') return s;
            const next = { ...s };
            let changed = false;
            if (String(next.nextSessionDate || '').trim()) {
                next.nextSessionDate = '';
                changed = true;
            }
            if (s.outcome === 'terminate') {
                if (String(next.notes || '').trim()) {
                    next.notes = '';
                    changed = true;
                }
                if (String(next.decisionDate || '').trim()) {
                    next.decisionDate = '';
                    changed = true;
                }
            } else if (s.outcome === 'close') {
                if (String(next.notes || '').trim()) {
                    next.notes = '';
                    changed = true;
                }
            }
            return changed ? next : s;
        });
    }, [hearingDraft.open, hearingDraft.outcome]);

    const [expertModule, setExpertModule] = useState<ExpertModule>({
        enabled: false,
        expertName: '',
        depositAmount: '',
        inspectionDate: '',
        reportDueDate: '',
        reportReceivedDate: '',
    });
    const [preDecisionClosed, setPreDecisionClosed] = useState<boolean>(false);
    const [expectedDecisionDate, setExpectedDecisionDate] = useState<string>('');
    const [registrationData, setRegistrationData] = useState<{
        receiptNumber: string;
        receiptDate: string;
        notificationMethod: string;
        notificationDate: string;
    }>({ receiptNumber: '', receiptDate: '', notificationMethod: '', notificationDate: '' });
    const [caseEvents, setCaseEvents] = useState<CaseEvent[]>([]);
    const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);
    const [caseAttachments, setCaseAttachments] = useState<CaseAttachment[]>([]);
    const [caseFollowups, setCaseFollowups] = useState<CaseFollowup[]>([]);

    const [editJudge, setEditJudge] = useState(false);
    const [editExecution, setEditExecution] = useState(false);
    const [editRejectionNotice, setEditRejectionNotice] = useState(false);
    const [editGrievance, setEditGrievance] = useState(false);
    const [editCassation, setEditCassation] = useState(false);

    const [judgeError, setJudgeError] = useState<string | null>(null);
    const [executionError, setExecutionError] = useState<string | null>(null);
    const [rejectionNoticeError, setRejectionNoticeError] = useState<string | null>(null);
    const [grievanceError, setGrievanceError] = useState<string | null>(null);
    const [grievanceDecisionError, setGrievanceDecisionError] = useState<string | null>(null);
    const [cassationError, setCassationError] = useState<string | null>(null);
    const [cassationDecisionError, setCassationDecisionError] = useState<string | null>(null);
    const [hearingsError, setHearingsError] = useState<string | null>(null);

    const grievanceRef = useRef<HTMLDivElement | null>(null);
    const cassationRef = useRef<HTMLDivElement | null>(null);
    const grievanceTimingGateRef = useRef<HTMLDivElement | null>(null);
    const grievanceOutcomeGateRef = useRef<HTMLDivElement | null>(null);
    const grievanceHearingsGateRef = useRef<HTMLDivElement | null>(null);
    const grievanceFinalGateRef = useRef<HTMLDivElement | null>(null);
    const cassationFilingGateRef = useRef<HTMLDivElement | null>(null);
    const cassationDecisionGateRef = useRef<HTMLDivElement | null>(null);
    const pendingRegistrationSyncRef = useRef(false);

    return {
        caseData,
        setCaseData,
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
        grievanceDecisionNotificationConfirmed,
        setGrievanceDecisionNotificationConfirmed,
        grievancePetitionNotificationDate,
        setGrievancePetitionNotificationDate,
        grievancePetitionNotificationConfirmed,
        setGrievancePetitionNotificationConfirmed,
        decisionNotificationModalOpen,
        setDecisionNotificationModalOpen,
        petitionNotificationModalOpen,
        setPetitionNotificationModalOpen,
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
        cassationExpiredConfirmed,
        setCassationExpiredConfirmed,
        guaranteeSubmitted,
        setGuaranteeSubmitted,
        guaranteeDetails,
        setGuaranteeDetails,
        hearings,
        setHearings,
        hearingDraft,
        setHearingDraft,
        expertModule,
        setExpertModule,
        preDecisionClosed,
        setPreDecisionClosed,
        expectedDecisionDate,
        setExpectedDecisionDate,
        registrationData,
        setRegistrationData,
        caseEvents,
        setCaseEvents,
        caseNotes,
        setCaseNotes,
        caseAttachments,
        setCaseAttachments,
        caseFollowups,
        setCaseFollowups,
        editJudge,
        setEditJudge,
        editExecution,
        setEditExecution,
        editRejectionNotice,
        setEditRejectionNotice,
        editGrievance,
        setEditGrievance,
        editCassation,
        setEditCassation,
        judgeError,
        setJudgeError,
        executionError,
        setExecutionError,
        rejectionNoticeError,
        setRejectionNoticeError,
        grievanceError,
        setGrievanceError,
        grievanceDecisionError,
        setGrievanceDecisionError,
        cassationError,
        setCassationError,
        cassationDecisionError,
        setCassationDecisionError,
        hearingsError,
        setHearingsError,
        grievanceRef,
        cassationRef,
        grievanceTimingGateRef,
        grievanceOutcomeGateRef,
        grievanceHearingsGateRef,
        grievanceFinalGateRef,
        cassationFilingGateRef,
        cassationDecisionGateRef,
        pendingRegistrationSyncRef,
    };
}
