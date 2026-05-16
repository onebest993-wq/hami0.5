import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { UrgentActionsDB, uuidv4 } from '@/app/services/urgent-actions-db';
import { getActiveDate } from '@/app/utils/hearingDates';
import {
    actionTypeOptions,
    isIqrarRequest,
    JUDICIAL_ACKNOWLEDGMENT_PRIMARY,
    URGENT_PETITION_PRIMARY,
} from '../Form_Urgent_Actions/constants';
import type {
    ActiveOrderFileProps,
    CaseEvent,
    CaseHearing,
    CassationData,
    CassationDecision,
    DeadlinePhase,
    ExecutionData,
    ExpertModule,
    FileStatus,
    GrievanceData,
    GrievanceDecision,
    JudgeDecision,
    HearingStage,
    CaseNote,
    CaseAttachment,
    CaseFollowup,
    PreDecisionHearingOutcomeKind,
} from './types';
import {
    isAdjournReasonValid,
    getPreDecisionHearingOutcome,
    getPreDecisionSessionOutcome,
    isGrievancePleadingClosedSession,
    isPreDecisionCloseNotes,
    isPreDecisionNullifyNotes,
} from './utils/hearingRules';
import {
    PRE_DECISION_OUTCOME_ADJOURN,
    PRE_DECISION_OUTCOME_CLOSE,
    PRE_DECISION_OUTCOME_NULLIFY,
} from './constants/hearingOutcomes';
import {
    cassationDecisionText,
    eventKindMeta,
    formatDateText,
    formatDateTimeText,
    formatTimeText,
    formatRequestNumberText,
} from './utils/formatters';
import { getDynamicPartyLabels, ordinalOf } from './utils/partyLabels';
import { addDaysYmd, maxYmd, safeMaxToday, todayYmd } from './utils/ymd';
import { ConfirmDialogPortal } from './components/ConfirmDialogPortal';
import type { LifecyclePanelProps } from './layout/LifecyclePanelProps';
import { ActiveOrderFileView } from './layout/ActiveOrderFileView';
import { useOrderFilePersist } from './hooks/useOrderFilePersist';
import { useOrderFileConfirm } from './hooks/useOrderFileConfirm';
import { useOrderFileWorkspace } from './hooks/useOrderFileWorkspace';
import { useOrderFileMetaPartyEdit } from './hooks/useOrderFileMetaPartyEdit';
import { useOrderFileHydrate } from './hooks/useOrderFileHydrate';
import { useOrderFileCasePathway } from './hooks/useOrderFileCasePathway';
import { useOrderFileLifecycleDerived } from './hooks/useOrderFileLifecycleDerived';
import { useOrderFileLifecycleActions } from './hooks/useOrderFileLifecycleActions';
import { buildLifecyclePanelProps } from './layout/buildLifecyclePanelProps';

/**
 * 📂 Dashboard الأمر الولائي - Active State Order File Dashboard
 * 
 * لوحة تحكم شاملة لإدارة دورة حياة الأمر الولائي (Ex Parte Secret Order)
 * تصميم Royal UI متقدم مع نظام إدارة الحالات والإشعارات القانونية
 */

export const Dashboard_Active_Order_File: React.FC<ActiveOrderFileProps> = ({ fileData, onClose, onCaseUpdated }) => {
    const fd = fileData as Record<string, unknown>;
    const { user: authUser } = useAuth();
    const userId = authUser?.id || 'dev-user-uuid-1';
    const caseId = typeof fd?.id === 'string' ? fd.id : null;
    const defaultDeadlineDays = fd?.type === 'urgent_action' ? 7 : 3;
    const [caseData, setCaseData] = useState<any>(fd);

    const todayYmdValue = todayYmd();
    const requestDateYmd = useMemo(() => {
        const raw = String(caseData?.requestDate ?? '').trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
    }, [caseData?.requestDate]);

    // 🔥 STATE MANAGEMENT
    const [fileStatus, setFileStatus] = useState<FileStatus>('pending');
    const [isSecretMode, setIsSecretMode] = useState(true); // Secret until executed
    const [hasIntervention, setHasIntervention] = useState(false);
    
    const [activeLifecycleStep, setActiveLifecycleStep] = useState<'judge' | 'execution' | 'grievance' | 'cassation' | null>('judge');
    
    // Data States
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
        notes: ''
    });
    const [grievanceData, setGrievanceData] = useState<GrievanceData>({
        rejectionNotificationDate: '',
        outcome: '',
        filingDate: '',
    });
    /** Phase 2 — أول جلسة تظلم؛ لا يُشتق من grievanceSessionDate ولا من firstHearingDate */
    const [phase2FirstHearingDate, setPhase2FirstHearingDate] = useState<string>(() => {
        const fd = fileData as any;
        const raw = String(fd?.grievanceFirstHearingDate ?? fd?.phase2FirstHearingDate ?? '').trim();
        return raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
    });
    const [grievanceLegalEndDate, setGrievanceLegalEndDate] = useState<string>(String((fileData as any)?.grievanceLegalEndDate ?? ''));
    const [grievanceDecisionNotificationConfirmed, setGrievanceDecisionNotificationConfirmed] = useState<boolean>(false);
    const [grievancePetitionNotificationDate, setGrievancePetitionNotificationDate] = useState<string>(
        String((fileData as any)?.grievancePetitionNotificationDate ?? ''),
    );
    const [grievancePetitionNotificationConfirmed, setGrievancePetitionNotificationConfirmed] = useState<boolean>(false);
    const [decisionNotificationModalOpen, setDecisionNotificationModalOpen] = useState<boolean>(false);
    const [petitionNotificationModalOpen, setPetitionNotificationModalOpen] = useState<boolean>(false);
    const [grievanceTimingConfirmed, setGrievanceTimingConfirmed] = useState<boolean>(false);
    const [grievanceDetailsConfirmed, setGrievanceDetailsConfirmed] = useState<boolean>(false);
    const [grievanceExpiredConfirmed, setGrievanceExpiredConfirmed] = useState<boolean>(false);
    const [grievanceDecision, setGrievanceDecision] = useState<GrievanceDecision>({
        decision: null,
        decisionDate: ''
    });
    const [cassationData, setCassationData] = useState<CassationData>({
        filedBy: null,
        outcome: '',
        filingDate: '',
        fileNumber: ''
    });
    const [cassationDecision, setCassationDecision] = useState<CassationDecision>({
        decision: null,
        decisionDate: ''
    });
    const [cassationExpiredConfirmed, setCassationExpiredConfirmed] = useState<boolean>(false);

    const [guaranteeSubmitted, setGuaranteeSubmitted] = useState<boolean>(false);
    const [guaranteeDetails, setGuaranteeDetails] = useState<{ amount: string; receiptNumber: string }>({
        amount: String((fileData as any)?.guaranteeAmount ?? ''),
        receiptNumber: String((fileData as any)?.guaranteeReceiptNumber ?? ''),
    });
    const [hearings, setHearings] = useState<CaseHearing[]>([]);
    const [hearingDraft, setHearingDraft] = useState<{
        open: boolean;
        stage: HearingStage;
        outcome: 'adjourn' | 'close' | 'terminate';
        sessionDate: string;
        notes: string;
        nextSessionDate: string;
        decisionDate: string;
    }>({ open: false, stage: 'pre_decision', outcome: 'adjourn', sessionDate: '', notes: '', nextSessionDate: '', decisionDate: '' });
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

    const { persistPatch, flushPersistPatch, persistAndMerge, appendCaseEvent } = useOrderFilePersist({
        caseId,
        userId,
        caseEvents,
        setCaseEvents,
        setCaseData,
        onCaseUpdated,
    });
    const { confirmDialog, requestConfirm, resolveConfirm } = useOrderFileConfirm();

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
    useOrderFileHydrate({
        caseId,
        userId,
        fileData,
        caseData,
        setters: {
            setCaseData,
            setHasIntervention,
            setFileStatus,
            setIsSecretMode,
            setActiveLifecycleStep,
            setJudgeDecision,
            setExecutionData,
            setGrievanceData,
            setGrievanceLegalEndDate,
            setGrievanceDecisionNotificationConfirmed,
            setGrievancePetitionNotificationDate,
            setGrievancePetitionNotificationConfirmed,
            setGrievanceTimingConfirmed,
            setGrievanceDetailsConfirmed,
            setPhase2FirstHearingDate,
            setGrievanceDecision,
            setCassationData,
            setCassationDecision,
            setGuaranteeSubmitted,
            setGuaranteeDetails,
            setHearings,
            setExpertModule,
            setPreDecisionClosed,
            setExpectedDecisionDate,
            setRegistrationData,
            setCaseEvents,
            setCaseNotes,
            setCaseAttachments,
            setCaseFollowups,
        },
    });
const casePathway = useOrderFileCasePathway({
        caseData,
        fd,
        fileStatus,
        activeLifecycleStep,
        judgeDecision,
        grievanceDecision,
        hearings,
        preDecisionClosed,
    });
    const {
        shouldSkipExecutionStep,
        statusConfig,
        requestTypeText,
        resolvedWorkspaceRequestType,
        isIqrar,
        isIqrarContext,
        procedureDetailsForPopover,
        partyLabel,
        oppositeRole,
        isUrgentLawsuit,
        isOrderOnPetition,
        isStateOrder,
        isUrgentJustice,
        showGrievanceStep,
        grievanceStepNumber,
        cassationStepNumber,
        showInitialNotification,
        showPreDecisionHearings,
        preDecisionTerminateExists,
        computedGrievanceFiledBy,
        computedCassationFiledBy,
    } = casePathway;
    const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const daysDiff = (from: Date, to: Date) => {
        const msPerDay = 24 * 60 * 60 * 1000;
        return Math.round((dayStart(to).getTime() - dayStart(from).getTime()) / msPerDay);
    };

    const buildDaysBadge = (startDateValue: unknown, durationDays: number) => {
        const startText = formatDateText(startDateValue);
        const start = startText ? new Date(String(startDateValue)) : null;
        if (!start || Number.isNaN(start.getTime())) return null;
        const deadline = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const remaining = daysDiff(new Date(), deadline);
        const deadlineText = formatDateText(deadline);
        if (remaining < 0) return { tone: 'danger' as const, text: 'انتهت المدة القانونية', deadlineText, remainingDays: remaining };
        if (remaining === 0) return { tone: 'warning' as const, text: 'اليوم هو الموعد الأخير', deadlineText, remainingDays: remaining };
        if (remaining === 1) return { tone: 'warning' as const, text: 'تنتهي غداً', deadlineText, remainingDays: remaining };
        return { tone: remaining <= 2 ? 'warning' as const : 'info' as const, text: `متبقي ${remaining} أيام`, deadlineText, remainingDays: remaining };
    };
    const addDaysYmd = (ymd: string, durationDays: number) => {
        const v = String(ymd || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
        const start = new Date(v);
        if (Number.isNaN(start.getTime())) return '';
        const d = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const yyyy = String(d.getFullYear());
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };


    const ordinalNames = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'];
    const ordinalOf = (index: number) => ordinalNames[index] ?? String(index + 1);

    const rawParty1Entries = Array.isArray(caseData?.allParty1) ? (caseData.allParty1 as any[]) : [];
    const rawParty2Entries = Array.isArray(caseData?.allParty2) ? (caseData.allParty2 as any[]) : [];
    const legacyRepresentedSide = caseData?.representedParty === 'client' || caseData?.representedParty === 'opponent' ? caseData.representedParty : null;
    const party1HasRepresentedFlag = rawParty1Entries.some((p) => typeof p?.isRepresented === 'boolean');
    const party2HasRepresentedFlag = rawParty2Entries.some((p) => typeof p?.isRepresented === 'boolean');

    const party1Entries = (rawParty1Entries.length ? rawParty1Entries : [{ name: caseData?.party1Name ?? '', phone: caseData?.party1Phone ?? '' }]).map(
        (p, index) => ({
            ...p,
            name: String(p?.name ?? '').trim(),
            isRepresented:
                typeof p?.isRepresented === 'boolean'
                    ? p.isRepresented
                    : !party1HasRepresentedFlag && legacyRepresentedSide === 'client' && index === 0,
        }),
    );
    const party2Entries = (rawParty2Entries.length ? rawParty2Entries : [{ name: caseData?.party2Name ?? '', address: caseData?.party2Address ?? '' }]).map(
        (p, index) => ({
            ...p,
            name: String(p?.name ?? '').trim(),
            isRepresented:
                typeof p?.isRepresented === 'boolean'
                    ? p.isRepresented
                    : !party2HasRepresentedFlag && legacyRepresentedSide === 'opponent' && index === 0,
        }),
    );

    const {
        partyEditTarget,
        partyEditForm,
        setPartyEditForm,
        isMetaEditOpen,
        metaEditForm,
        setMetaEditForm,
        openPartyEdit,
        closePartyEdit,
        savePartyEdit,
        openMetaEdit,
        closeMetaEdit,
        saveMetaEdit,
    } = useOrderFileMetaPartyEdit({
        caseData,
        party1Entries,
        party2Entries,
        persistAndMerge,
        appendCaseEvent,
    });

    const party2List = party2Entries;
    const isDefendantClient = party2List.some((p) => !!(p as any)?.isClient || !!(p as any)?.isRepresented);
    const representedSide =
        party1Entries.some((p) => !!p?.isRepresented) && !party2Entries.some((p) => !!p?.isRepresented)
            ? 'client'
            : party2Entries.some((p) => !!p?.isRepresented) && !party1Entries.some((p) => !!p?.isRepresented)
              ? 'opponent'
              : null;
    const defenderEntryPhase = useMemo(() => {
        if (!isDefendantClient || !isStateOrder) return 1;
        const v = Number((caseData as any)?.defenderEntryPhase);
        return v === 2 || v === 3 ? v : 1;
    }, [caseData, isDefendantClient, isStateOrder]);
    const defenderPhase1ReadOnly = defenderEntryPhase >= 2 && isDefendantClient && isStateOrder;
    const defenderPhase2ReadOnly = defenderEntryPhase >= 3 && isDefendantClient && isStateOrder;
    const procedureTypeTitle = useMemo(() => {
        const raw = String(caseData?.specificActionType || '').trim();
        if (isIqrarRequest(raw)) return 'إقرار قضائي / حجة إقرار';
        if (!raw) return 'أمر ولائي';
        const primary = raw.split('/')[0]?.trim();
        return primary || raw;
    }, [caseData?.specificActionType]);
    const khulasaText = useMemo(() => {
        return String((caseData as any)?.khulasatAlTalab ?? (caseData as any)?.khulasa ?? '').trim();
    }, [caseData]);
    const partyLabels = useMemo(() => getDynamicPartyLabels(String(caseData?.specificActionType ?? '').trim()), [caseData?.specificActionType]);
    const guaranteeGateActive =
        (judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') && judgeDecision.requiresGuarantee && !guaranteeSubmitted;
    const finalityReason = String((caseData as any)?.finalityReason || '').trim();
    const isFinalityNoGrievance = finalityReason === 'no_grievance';
    const isFinalityTerminatedRequest = finalityReason === 'terminated_request';
    const isFinalized =
        !!caseData?.archived ||
        (caseData as any)?.status === 'completed' ||
        (caseData as any)?.status === 'closed' ||
        (caseData as any)?.phase === 'completed';

    const {
        newEventText,
        setNewEventText,
        newNoteText,
        setNewNoteText,
        newFollowupTitle,
        setNewFollowupTitle,
        newFollowupDate,
        setNewFollowupDate,
        attachmentsError,
        addManualEvent,
        addCaseNote,
        deleteCaseNote,
        addAttachmentFile,
        deleteAttachment,
        addFollowup,
        toggleFollowupCompleted,
        deleteFollowup,
        attachmentInputId,
        caseEventDayGroups,
    } = useOrderFileWorkspace({
        caseId,
        isFinalized,
        requestDateYmd,
        caseEvents,
        caseNotes,
        setCaseNotes,
        caseAttachments,
        setCaseAttachments,
        caseFollowups,
        setCaseFollowups,
        persistAndMerge,
        appendCaseEvent,
    });

    const workspaceTypeDetail = useMemo(() => {
        const raw = String(caseData?.specificActionType ?? resolvedWorkspaceRequestType ?? '').trim();
        const leafOptions = [
            ...actionTypeOptions.state_order,
            ...actionTypeOptions.urgent_discovery,
            ...actionTypeOptions.acknowledgment,
        ];
        if (leafOptions.includes(raw)) return raw;
        if (!raw || raw === URGENT_PETITION_PRIMARY || raw === JUDICIAL_ACKNOWLEDGMENT_PRIMARY) {
            const fallback = String((caseData as any)?.requestSubject ?? '').trim();
            return fallback || '—';
        }
        if (raw.includes('/')) {
            const parts = raw.split('/').map((p) => p.trim()).filter(Boolean);
            return parts[0] || raw;
        }
        return raw;
    }, [caseData, resolvedWorkspaceRequestType]);
    const workspaceHeaderTitle = useMemo(() => {
        const detail = workspaceTypeDetail;
        if (isIqrarContext) {
            if (isFinalized && !!caseData?.archived) return `إقرار مؤرشف: ${detail}`;
            return `إقرار: ${detail}`;
        }
        if (isStateOrder || isOrderOnPetition) return `أمر ولائي: ${detail}`;
        if (isUrgentLawsuit || isUrgentJustice) return `طلب مستعجل: ${detail}`;
        return `مسار قضائي: ${detail}`;
    }, [
        workspaceTypeDetail,
        isIqrarContext,
        isFinalized,
        caseData?.archived,
        isStateOrder,
        isOrderOnPetition,
        isUrgentLawsuit,
        isUrgentJustice,
    ]);
const lifecycleDerived = useOrderFileLifecycleDerived({
        caseData,
        judgeDecision,
        grievanceData,
        grievanceDecision,
        cassationData,
        cassationDecision,
        hearings,
        hearingDraft,
        expertModule,
        phase2FirstHearingDate,
        grievanceLegalEndDate,
        setGrievanceLegalEndDate,
        grievanceTimingConfirmed,
        grievanceDetailsConfirmed,
        grievanceExpiredConfirmed,
        editGrievance,
        requestDateYmd,
        todayYmdValue,
        hasIntervention,
        isFinalized,
        isFinalityNoGrievance,
        defenderPhase2ReadOnly,
        showGrievanceStep,
        isIqrarContext,
        partyLabel,
        computedGrievanceFiledBy,
        computedCassationFiledBy,
        showPreDecisionHearings,
    });

    const lifecycleActions = useOrderFileLifecycleActions({
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
        setPreDecisionClosed,
        hearingDraft,
        setHearingDraft,
        expertModule,
        setExpertModule,
        registrationData,
        setRegistrationData,
        pendingRegistrationSyncRef,
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
        isCaseTerminated: lifecycleDerived.isCaseTerminated,
        hasSessions: lifecycleDerived.hasSessions,
        grievanceLegalEndDateChronologyError: lifecycleDerived.grievanceLegalEndDateChronologyError,
        grievanceExpiredCanClose: lifecycleDerived.grievanceExpiredCanClose,
        grievanceClosingHearingExists: lifecycleDerived.grievanceClosingHearingExists,
        grievanceFilingDateChronologyError: lifecycleDerived.grievanceFilingDateChronologyError,
        grievanceFirstHearingDateChronologyError: lifecycleDerived.grievanceFirstHearingDateChronologyError,
        grievanceDecisionDateChronologyError: lifecycleDerived.grievanceDecisionDateChronologyError,
        judgeDecisionDateChronologyError: lifecycleDerived.judgeDecisionDateChronologyError,
        cassationFilingDateChronologyError: lifecycleDerived.cassationFilingDateChronologyError,
        cassationDecisionDateError: lifecycleDerived.cassationDecisionDateError,
        cassationFilingDetailsComplete: lifecycleDerived.cassationFilingDetailsComplete,
        phase1NewSessionMinYmd: lifecycleDerived.phase1NewSessionMinYmd,
        phase2NewSessionMinYmd: lifecycleDerived.phase2NewSessionMinYmd,
        effectiveJudgeDecisionDate: lifecycleDerived.effectiveJudgeDecisionDate,
        effectiveRejectionNotificationDate: lifecycleDerived.effectiveRejectionNotificationDate,
        grievanceTimingGateReady: lifecycleDerived.grievanceTimingGateReady,
        grievanceFilingMinYmd: lifecycleDerived.grievanceFilingMinYmd,
        grievanceFirstHearingMinYmd: lifecycleDerived.grievanceFirstHearingMinYmd,
        oppositeRole,
    });

    const lifecyclePanelProps = buildLifecyclePanelProps({
        pathway: casePathway,
        derived: lifecycleDerived,
        actions: lifecycleActions,
        activeLifecycleStep,
        caseData,
        cassationData,
        cassationDecision,
        cassationDecisionError,
        cassationDecisionGateRef,
        cassationError,
        cassationExpiredConfirmed,
        cassationFilingGateRef,
        cassationRef,
        defenderPhase1ReadOnly,
        defenderPhase2ReadOnly,
        editCassation,
        editGrievance,
        editJudge,
        fileStatus,
        grievanceData,
        grievanceDecision,
        grievanceDecisionError,
        grievanceDecisionNotificationConfirmed,
        grievanceError,
        grievanceExpiredConfirmed,
        grievanceFinalGateRef,
        grievanceHearingsGateRef,
        grievanceLegalEndDate,
        grievanceOutcomeGateRef,
        grievanceRef,
        grievanceTimingConfirmed,
        guaranteeDetails,
        guaranteeGateActive,
        guaranteeSubmitted,
        hasIntervention,
        hearingDraft,
        hearingsError,
        isDefendantClient,
        isFinalityNoGrievance,
        isFinalityTerminatedRequest,
        isFinalized,
        judgeDecision,
        judgeError,
        phase2FirstHearingDate,
        setActiveLifecycleStep,
        setCassationData,
        setCassationDecision,
        setCassationExpiredConfirmed,
        setDecisionNotificationModalOpen,
        setEditCassation,
        setEditGrievance,
        setGrievanceData,
        setGrievanceDecision,
        setGrievanceDetailsConfirmed,
        setGrievanceExpiredConfirmed,
        setGrievanceLegalEndDate,
        setGuaranteeDetails,
        setGuaranteeSubmitted,
        setHearingDraft,
        setJudgeDecision,
        setPhase2FirstHearingDate,
    });

    const confirmPortal = (
        <ConfirmDialogPortal
            open={confirmDialog.open}
            message={confirmDialog.message}
            onCancel={() => resolveConfirm(false)}
            onConfirm={() => resolveConfirm(true)}
        />
    );

    return (
        <ActiveOrderFileView
            onClose={onClose}
            confirmPortal={confirmPortal}
            lifecyclePanelProps={lifecyclePanelProps}
            decisionNotificationModal={{
                isOpen: decisionNotificationModalOpen,
                onClose: () => setDecisionNotificationModalOpen(false),
                caseName: String(caseData?.specificActionType ?? caseData?.actionPath ?? requestTypeText ?? '').trim() || '—',
                minActionDate: lifecycleDerived.decisionNotificationQuickLogMinYmd || undefined,
                onSubmit: ({ actionDate }) => {
                    setDecisionNotificationModalOpen(false);
                    setGrievanceData((prev) => ({ ...prev, rejectionNotificationDate: actionDate }));
                    setGrievanceDecisionNotificationConfirmed(true);
                    const end = addDaysYmd(actionDate, 3);
                    if (end) setGrievanceLegalEndDate(end);
                    const patch: Record<string, unknown> = {
                        rejectionNotificationDate: actionDate,
                        grievanceLegalEndDate: end || null,
                        legalState: 'Awaiting_Grievance',
                    };
                    if (judgeDecision.decision !== 'rejected') {
                        patch.notificationDate = actionDate;
                    }
                    persistAndMerge(patch);
                    appendCaseEvent(`تأكيد التبليغ الأصولي بتاريخ ${formatDateText(actionDate)}`, 'action');
                },
            }}
            metaEdit={{
                open: isMetaEditOpen,
                isIqrarContext,
                khulasaText,
                metaEditForm,
                setMetaEditForm,
                onClose: closeMetaEdit,
                onSave: saveMetaEdit,
            }}
            partyEdit={{
                partyEditTarget,
                partyEditForm,
                setPartyEditForm,
                onClose: closePartyEdit,
                onSave: savePartyEdit,
            }}
            header={{
                workspaceHeaderTitle,
                requestNumberText: caseData?.requestNumber
                    ? formatRequestNumberText(caseData.requestNumber, caseData?.requestDate)
                    : '',
                procedureDetailsForPopover,
                courtName: String(caseData?.courtName ?? ''),
                isFinalized,
                isIqrarContext,
                statusConfig,
                nextHearingDate: String(lifecycleDerived.nextHearingDate ?? ''),
                reportDueSoon: lifecycleDerived.reportDueSoon,
                formatDateText,
                onOpenMetaEdit: openMetaEdit,
            }}
            archive={
                isFinalized
                    ? {
                          isIqrarContext,
                          archiveSummaryText: lifecycleDerived.archiveSummaryText,
                          archivedAt: (caseData as any)?.archivedAt,
                          formatDateTimeText,
                      }
                    : undefined
            }
            parties={{
                party1Entries,
                party2Entries,
                procedureType: String(caseData?.specificActionType ?? ''),
                isFinalized,
                onEditParty: openPartyEdit,
            }}
            adminWorkspace={{
                isIqrarContext,
                isFinalized,
                newFollowupTitle,
                setNewFollowupTitle,
                newFollowupDate,
                setNewFollowupDate,
                requestDateYmd,
                addFollowup,
                caseFollowups,
                todayYmdValue,
                toggleFollowupCompleted,
                deleteFollowup,
                caseEvents,
                newEventText,
                setNewEventText,
                addManualEvent,
                caseEventDayGroups,
                newNoteText,
                setNewNoteText,
                addCaseNote,
                caseNotes,
                deleteCaseNote,
                attachmentsError,
                attachmentInputId,
                addAttachmentFile,
                caseAttachments,
                deleteAttachment,
            }}
        />
    );
};