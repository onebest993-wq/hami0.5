import type {
    AppointmentType,
    CaseStage,
    ConsolidationSecondaryRef,
    DocumentCategory,
    IncidentalCase,
    IncidentalStatus,
    Party,
    Task,
    TimelineEvent,
} from '../../../LawyerShared';
import { formatConsolidatedChipLabel } from '../../smartFile/caseConsolidationLinking';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    validateDocumentData,
    validatePaymentData,
    validateTaskData,
} from '@/app/utils/validationUtils';
import { logError } from '@/app/utils/errorHandler';
import { debug } from '@/app/utils/debug';
import { getLocalTodayYmd, parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import { addCalendarDaysYmd } from '@/app/utils/employeeSummonsAssignment';
import { str, type SmartFileAttachment } from '../../smartFile/judgmentTypes';
import { normalizeFastTrackRecord } from '../../smartFile/fastTrackNormalize';
import {
    buildAttachmentTimelineEvent,
    buildFastTrackTimelineEvent,
    patchTimelineEvent,
    resolveAttachmentTimelineEventId,
    resolveFastTrackTimelineEventId,
} from '../../smartFile/timelineRequestSync';
import type { FastTrackRecord, UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import {
    formatDateToLocalYmd,
    stageAttachmentsList,
    stageFastTrackPetitions,
    stageIncidentalCases,
    stageTasks,
    stageTimeline,
    ymdPlusDays,
} from '../../smartFile/proceduralTypes';
import {
    buildIncidentalEntryDecisionEvent,
    buildIncidentalResolveEvent,
    buildIncidentalTimelineEvent,
    filterHeaderIncidentalCases,
    isLinkedSpawnIncidentalType,
} from '../../smartFile/incidentalCaseLinking';
import { syncLawsuitTaskDue, syncLawsuitTimelineAppointment } from '@/app/services/calendarDossierSync';
import {
    isPetitionVoidRevivalExpired,
    PETITION_VOID_APPEAL_DAYS,
    resolvePetitionVoidMenuLabel,
} from '../../smartFile/petitionVoidFlow';
import { printDossier } from '../../smartFile/printDossier';

export function useProceduralIncidentalActions(options: UseSmartFileProceduralActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        viewingStageIndex,
        currentStage,
        parentData,
        setParentData,
        saveToCloud,
        setStatus,
        setIsPaused,
        setPauseReason,
        setLinkedCaseNo,
        setIsInterrupted,
        setInterruptionData,
        setEditingTask,
        setEditingIncidental,
        setEditingFastTrack,
        setEditingAttachment,
        setEditingEvent,
        setShowFastTrackModal,
        setShowAttachmentModal,
        setShowJudgeRecusalModal,
        setShowTransferJurisdictionModal,
        setShowCaseConsolidationModal,
        setShowMaterialErrorModal,
        setShowPauseModal,
        setShowInterruptionModal,
        setShowResumeInterruptionModal,
        setShowExtraordinaryAppealModal,
        setShowProvisionalOrderModal,
        setShowInterlocutoryModal,
        isPaused,
        pauseReason,
        isInterrupted,
        interruptionData,
        status,
        calendarUserId,
        setAppealOutcomeTask,
    } = options;

const handleAddIncidentalCase = (data: IncidentalCase) => {
    const updatedStages = [...stages];
    const prevStage = updatedStages[activeStageIndex];
    const existingTimeline = stageTimeline(prevStage);

    if (data.id && stageIncidentalCases(prevStage).some((c) => c.id === data.id)) {
        updatedStages[activeStageIndex] = {
            ...prevStage,
            incidentalCases: stageIncidentalCases(prevStage).map((c: IncidentalCase) =>
                c.id === data.id ? { ...c, ...data } : c,
            ),
        };
        setEditingIncidental(null);
    } else {
        const newCase: IncidentalCase = {
            id: data.id || `inc_${Date.now()}`,
            type: data.type,
            partyName: data.partyName,
            partyRole: data.partyRole,
            details: data.details,
            date: data.date || getLocalTodayYmd(),
            status: data.status || 'active',
            thirdPartyEntryMode: data.thirdPartyEntryMode,
            affiliationSide: data.affiliationSide,
            affiliationPartyId: data.affiliationPartyId,
            affiliationPartyName: data.affiliationPartyName,
            entryDecision: data.entryDecision ?? (data.type === 'thirdParty' ? 'pending' : undefined),
            linkedFileId: data.linkedFileId,
            linkedCaseNo: data.linkedCaseNo,
            parentFileId: data.parentFileId,
            parentCaseNo: data.parentCaseNo,
        };
        updatedStages[activeStageIndex] = {
            ...prevStage,
            incidentalCases: [newCase, ...stageIncidentalCases(prevStage)],
            timeline: [buildIncidentalTimelineEvent(newCase), ...existingTimeline],
        };
    }

    setStages(updatedStages);
    saveToCloud(updatedStages);
};

const handleSaveFastTrack = (data: FastTrackRecord) => {
    const normalized = normalizeFastTrackRecord(data);
    const updatedStages = [...stages];
    const currentStage = updatedStages[activeStageIndex];
    const petitions = stageFastTrackPetitions(currentStage);
    const existingTimeline = stageTimeline(currentStage) || [];
    const isEdit = Boolean(normalized.id);
    const petitionId = isEdit ? String(normalized.id) : `fast_${Date.now()}`;
    const priorPetition = isEdit ? petitions.find((p) => p.id === petitionId) : undefined;

    const timelineEventId = resolveFastTrackTimelineEventId(
        petitionId,
        priorPetition as Record<string, unknown> | undefined,
        existingTimeline,
    );
    const timelineEvent = buildFastTrackTimelineEvent(
        { ...normalized, id: petitionId },
        timelineEventId,
    );

    if (isEdit) {
        currentStage.fastTrackPetitions = petitions.map((p) =>
            p.id === petitionId ? { ...p, ...normalized, timelineEventId } : p,
        );
        currentStage.timeline = patchTimelineEvent(
            existingTimeline,
            timelineEventId,
            timelineEvent,
        );
        setEditingFastTrack(null);
    } else {
        currentStage.fastTrackPetitions = [
            {
                id: petitionId,
                ...normalized,
                timelineEventId,
                createdDate: getLocalTodayYmd(),
            },
            ...petitions,
        ];
        currentStage.timeline = [timelineEvent, ...existingTimeline];
    }

    setStages(updatedStages);
    saveToCloud(updatedStages);
    SmartToast.success(
        isEdit ? 'تم تحديث الطلب بنجاح' : 'تم حفظ الطلب بنجاح',
    );
    setShowFastTrackModal(false);
};

const handleSaveAttachment = (data: SmartFileAttachment) => {
    const updatedStages = [...stages];
    const currentStage = updatedStages[activeStageIndex];
    const attachments = stageAttachmentsList(currentStage);
    const existingTimeline = stageTimeline(currentStage) || [];
    const isEdit = Boolean(data.id);
    const attachmentId = isEdit ? String(data.id) : `attach_${Date.now()}`;
    const priorAttachment = isEdit ? attachments.find((a) => a.id === attachmentId) : undefined;

    const timelineEventId = resolveAttachmentTimelineEventId(
        attachmentId,
        priorAttachment as Record<string, unknown> | undefined,
        existingTimeline,
    );
    const timelineEvent = buildAttachmentTimelineEvent(
        { ...data, id: attachmentId },
        timelineEventId,
    );

    if (isEdit) {
        currentStage.attachments = attachments.map((a) =>
            a.id === attachmentId ? { ...a, ...data, timelineEventId } : a,
        );
        currentStage.timeline = patchTimelineEvent(
            existingTimeline,
            timelineEventId,
            timelineEvent,
        );
        setEditingAttachment(null);
    } else {
        currentStage.attachments = [
            {
                id: attachmentId,
                ...data,
                timelineEventId,
                createdDate: getLocalTodayYmd(),
            },
            ...attachments,
        ];
        currentStage.timeline = [timelineEvent, ...existingTimeline];

        const submissionDate = new Date(str(data.submissionDate));
        const notificationRaw = str(data.notificationDate);
        const notificationDate = notificationRaw ? new Date(notificationRaw) : null;

        if (data.status === 'مُقدم - بانتظار القرار (24 ساعة)') {
            const decisionDeadline = new Date(submissionDate);
            decisionDeadline.setDate(decisionDeadline.getDate() + 1);

            const radarTask: Task = {
                id: `task_attach_${Date.now()}`,
                title: `⏱️ رادار الحجز: المحكمة ملزمة بإصدار القرار في اليوم التالي كحد أقصى (المادة 233)`,
                dueDate: ymdPlusDays(decisionDeadline, 0),
                isCompleted: false,
                priority: 'high',
                isNew: true,
            };

            currentStage.tasks = [radarTask, ...(stageTasks(currentStage) || [])];
        }

        if (
            data.status === 'صدر قرار بالحجز ✅' &&
            data.timing === 'قبل إقامة الدعوى (مستعجل)' &&
            notificationDate
        ) {
            const lawsuit8DayDeadline = new Date(notificationDate);
            lawsuit8DayDeadline.setDate(lawsuit8DayDeadline.getDate() + 8);

            const guillotineTask: Task = {
                id: `task_attach_guillotine_${Date.now()}`,
                title: `🚨 مقصلة الـ 8 أيام: يجب إقامة دعوى الموضوع خلال 8 أيام من التبليغ، وإلا يبطل الحجز (المادة 237)!`,
                dueDate: ymdPlusDays(lawsuit8DayDeadline, 0),
                isCompleted: false,
                priority: 'critical',
                isNew: true,
            };

            const expiration3MonthDate = new Date(submissionDate);
            expiration3MonthDate.setMonth(expiration3MonthDate.getMonth() + 3);

            const expirationTask: Task = {
                id: `task_attach_expire_${Date.now()}`,
                title: `⚠️ تذكير: يبطل الحجز كلياً بعد 3 أشهر إذا لم يتم التبليغ وإقامة الدعوى (المادة 237)`,
                dueDate: formatDateToLocalYmd(expiration3MonthDate),
                isCompleted: false,
                priority: 'medium',
                isNew: true,
            };

            currentStage.tasks = [guillotineTask, expirationTask, ...(stageTasks(currentStage) || [])];
        }

        if (
            (data.status === 'صدر قرار بالحجز ✅' || data.status === 'رُفض الطلب ❌') &&
            notificationDate
        ) {
            const grievanceDeadline = new Date(notificationDate);
            grievanceDeadline.setDate(grievanceDeadline.getDate() + 3);

            const grievanceTask: Task = {
                id: `task_attach_grieve_${Date.now()}`,
                title: `⚖️ التظلم: يحق تقديم تظلم من قرار الحجز خلال 3 أيام فقط (المادة 240)`,
                dueDate: ymdPlusDays(grievanceDeadline, 0),
                isCompleted: false,
                priority: 'high',
                isNew: true,
            };

            currentStage.tasks = [grievanceTask, ...(stageTasks(currentStage) || [])];
        }
    }

    setStages(updatedStages);
    saveToCloud(updatedStages);
    SmartToast.success(
        isEdit ? 'تم تحديث طلب الحجز الاحتياطي بنجاح 🔒' : 'تم حفظ طلب الحجز الاحتياطي بنجاح 🔒',
    );
    setShowAttachmentModal(false);
};

const handleAddCrossAppeal = () => {
    const updatedStages = [...stages];
    updatedStages[activeStageIndex] = {
        ...updatedStages[activeStageIndex],
        hasCrossAppeal: true
    };
    setStages(updatedStages);
    saveToCloud(updatedStages);
    SmartToast.success('تم إضافة الاستئناف المتقابل بنجاح ⚖️');
};

const handleCancelCrossAppeal = () => {
    const updatedStages = [...stages];
    const stage = updatedStages[activeStageIndex];
    if (!stage) return;

    const resetParties = (stage.parties ?? []).map((party) => ({
        ...party,
        role: String(party.role ?? '').replace(/\s*\(مستأنف متقابل\)/g, '').replace(/\s*— مستأنف متقابل/g, ''),
    }));

    updatedStages[activeStageIndex] = {
        ...stage,
        hasCrossAppeal: false,
        parties: resetParties,
        appealMetadata: stage.appealMetadata
            ? {
                  ...stage.appealMetadata,
                  hasCrossAppeal: false,
                  crossAppealDate: undefined,
                  crossAppealReceipt: undefined,
                  crossAppealPartyIds: [],
              }
            : stage.appealMetadata,
    };
    setStages(updatedStages);
    saveToCloud(updatedStages);
    SmartToast.info('تم إلغاء الاستئناف المتقابل');
};

// 🔥 NEW: COMMAND CENTER HANDLERS - Procedural Maneuvers & Lifecycle

const handleJudgeRecusal = (data: { reason: string; requestDate: string }) => {
    const updatedStages = [...stages];
    const currentStage = updatedStages[activeStageIndex];

    // Freeze the case
    currentStage.isJudgeRecusalPending = true;
    currentStage.judgeRecusalData = data;

    // Add timeline event
    currentStage.timeline = [{
        id: `judge_recusal_${Date.now()}`,
        type: 'alert',
        date: data.requestDate,
        title: '🛑 تم تقديم طلب رد القاضي - الدعوى مجمدة',
        details: `السبب: ${data.reason}\n\n⚠️ الدعوى قيد التجميد حتى البت في طلب الرد.`,
        isNew: true,
        color: 'rose'
    }, ...(stageTimeline(currentStage) || [])];

    // Add task
    currentStage.tasks = [{
        id: `task_recusal_${Date.now()}`,
        title: '⏳ متابعة طلب رد القاضي - الدعوى مجمدة',
        dueDate: addCalendarDaysYmd(getLocalTodayYmd(), 7),
        isCompleted: false,
        priority: 'high',
        isNew: true
    }, ...(stageTasks(currentStage) || [])];

    setStages(updatedStages);
    saveToCloud(updatedStages);
    SmartToast.info('تم تجميد الدعوى - قيد نظر طلب الرد 🛑');
    setShowJudgeRecusalModal(false);
};

const handleTransferJurisdiction = (data: { newCourt: string; transferDate: string; notes: string }) => {
    const updatedStages = [...stages];
    const prevStage = updatedStages[activeStageIndex];
    const newCourt = data.newCourt.trim();

    updatedStages[activeStageIndex] = {
        ...prevStage,
        court: newCourt,
        timeline: [
            {
                id: `transfer_${Date.now()}`,
                type: 'milestone',
                date: data.transferDate,
                title: `🔀 إحالة الدعوى لعدم الاختصاص → ${newCourt}`,
                details: `تم إحالة الدعوى إلى: ${newCourt}\n${data.notes ? `\nالسبب: ${data.notes}` : ''}\n\n✅ الدعوى نشطة في المحكمة الجديدة.`,
                isNew: true,
                color: 'purple',
            },
            ...stageTimeline(prevStage),
        ],
    };

    const updatedParent = { ...parentData, court: newCourt };
    setParentData(updatedParent);
    setStages(updatedStages);
    saveToCloud(updatedStages, updatedParent);
    SmartToast.success(`تم إحالة الدعوى إلى: ${newCourt} 🔀`);
    setShowTransferJurisdictionModal(false);
};

const handleConsolidationExternalRef = (data: {
    peerCaseNo: string;
    consolidationDate: string;
    notes?: string;
}) => {
    const updatedStages = [...stages];
    const stage = { ...updatedStages[activeStageIndex] };
    const primaryCaseNo = String(parentData.caseNo ?? stage.caseNo ?? '').trim();
    const primaryCourt = String(parentData.court ?? stage.court ?? '').trim();
    const primaryJudge = String(parentData.judge ?? stage.judge ?? '').trim();
    const primaryDocType = String(parentData.docType ?? stage.docType ?? '').trim();
    const primaryClaimValue = String(stage.claimValue ?? '').trim();

    const ref: ConsolidationSecondaryRef = {
        id: `cons_ext_${Date.now()}`,
        caseNo: data.peerCaseNo.trim(),
        isExternal: true,
        consolidationDate: data.consolidationDate,
        reason: data.notes,
    };
    const refs = [...(stage.consolidatedSecondaryRefs ?? parentData.consolidationSecondaryRefs ?? []), ref];

    updatedStages[activeStageIndex] = {
        ...stage,
        caseNo: primaryCaseNo || stage.caseNo,
        court: primaryCourt || stage.court,
        judge: primaryJudge || stage.judge,
        docType: primaryDocType || stage.docType,
        claimValue: primaryClaimValue || stage.claimValue,
        consolidatedSecondaryRefs: refs,
        consolidatedWith: formatConsolidatedChipLabel(refs),
        timeline: [
            {
                id: `consolidation_${Date.now()}`,
                type: 'milestone',
                date: data.consolidationDate,
                title: `🔗 توحيد مرجعي — ${ref.caseNo}`,
                details: [
                    `تم تسجيل توحيد مرجعي مع الدعوى رقم ${ref.caseNo}`,
                    data.notes ? `السبب: ${data.notes}` : '',
                ]
                    .filter(Boolean)
                    .join('\n'),
                isNew: true,
                tags: ['#توحيد_دعاوى'],
            },
            ...(stageTimeline(stage) || []),
        ],
    };

    const updatedParent = {
        ...parentData,
        caseNo: primaryCaseNo || parentData.caseNo,
        court: primaryCourt || parentData.court,
        judge: primaryJudge || parentData.judge,
        docType: primaryDocType || parentData.docType,
        consolidationSecondaryRefs: refs,
    };
    setParentData(updatedParent);
    setStages(updatedStages);
    saveToCloud(updatedStages, updatedParent);
    SmartToast.success(`تم تسجيل المرجع: ${ref.caseNo}`);
    setShowCaseConsolidationModal(false);
};

const handleCaseConsolidation = (data: { linkedCaseNo: string; consolidationDate: string; notes: string }) => {
    handleConsolidationExternalRef({
        peerCaseNo: data.linkedCaseNo,
        consolidationDate: data.consolidationDate,
        notes: data.notes,
    });
};

const handleCaseLinkExternal = (data: {
    peerCaseNo: string;
    linkDate: string;
    reason?: string;
}) => {
    const record = {
        id: `link_ext_${Date.now()}`,
        peerCaseNo: data.peerCaseNo,
        linkDate: data.linkDate,
        reason: data.reason,
        isExternal: true,
    };
    const updatedParent = {
        ...parentData,
        caseLinks: [...(parentData.caseLinks ?? []), record],
    };
    const updatedStages = [...stages];
    const stage = updatedStages[activeStageIndex];
    stage.timeline = [
        {
            id: `case_link_ext_${Date.now()}`,
            type: 'milestone',
            date: data.linkDate,
            title: `🔗 ربط مرجعي — ${data.peerCaseNo}`,
            details: [
                `تم ربط الدعوى المرقمة ${data.peerCaseNo}`,
                data.reason ? `السبب: ${data.reason}` : '',
            ]
                .filter(Boolean)
                .join('\n'),
            isNew: true,
            tags: ['#ربط_دعوى'],
        },
        ...(stageTimeline(stage) || []),
    ];
    setParentData(updatedParent);
    setStages(updatedStages);
    saveToCloud(updatedStages, updatedParent);
    SmartToast.success(`تم ربط الدعوى المرقمة: ${data.peerCaseNo}`);
};

const handleCorrespondence = (data: { entity: string; date: string; content: string }) => {
    const taskId = `task_corr_${Date.now()}`;
    const newTask: Task = {
        id: taskId,
        title: `مخاطبة — ${data.entity}`,
        details: data.content,
        dueDate: data.date,
        isCompleted: false,
        taskKind: 'correspondence',
        correspondenceEntity: data.entity,
        correspondenceDate: data.date,
        correspondenceContent: data.content,
        correspondenceResponseReceived: null,
    };
    const updatedStages = [...stages];
    const stage = updatedStages[activeStageIndex];
    stage.tasks = [newTask, ...stageTasks(stage)];
    stage.timeline = [
        {
            id: `corr_${Date.now()}`,
            type: 'note',
            date: data.date,
            title: `📨 مخاطبة — ${data.entity}`,
            details: data.content,
            isNew: true,
            tags: ['#مخاطبة'],
        },
        ...(stageTimeline(stage) || []),
    ];
    setStages(updatedStages);
    saveToCloud(updatedStages);
    SmartToast.success('تم تسجيل المخاطبة ومتابعتها في المهام');
};

const handleCorrespondenceResponse = (taskId: string, received: boolean) => {
    const updatedStages = [...stages];
    const prevStage = updatedStages[activeStageIndex];
    const nextTasks = stageTasks(prevStage).map((t: Task) => {
        if (t.id !== taskId) return t;
        return {
            ...t,
            correspondenceResponseReceived: received,
            isCompleted: true,
        };
    });
    updatedStages[activeStageIndex] = { ...prevStage, tasks: nextTasks };
    setStages(updatedStages);
    saveToCloud(updatedStages);
    SmartToast.success(received ? 'تم تسجيل استلام الرد' : 'تم تسجيل عدم الرد');
};

const handleExportPDF = () => {
    printDossier();
};

// 🔥 NEW: Material Error Correction Handler
const handleMaterialErrorCorrection = (data: { correctionType: string; errorDetails: string; requestDate: string }) => {
    try {
        const updatedStages = [...stages];
        const currentStageIndex = viewingStageIndex >= 0 ? viewingStageIndex : activeStageIndex;
        
        if (updatedStages[currentStageIndex]) {
            const newEvent: TimelineEvent = {
                id: Date.now().toString(),
                type: data.correctionType === 'clarification' ? 'note' : 'document',
                title: data.correctionType === 'clarification' 
                    ? '📌 طلب توضيح حكم غامض' 
                    : '✏️ طلب تصحيح خطأ مادي',
                date: data.requestDate,
                details: data.errorDetails,
            };

            updatedStages[currentStageIndex] = {
                ...updatedStages[currentStageIndex],
                timeline: [...(updatedStages[currentStageIndex].timeline || []), newEvent]
            };

            setStages(updatedStages);
            saveToCloud(updatedStages);
            
            const successMessage = data.correctionType === 'clarification'
                ? 'تم تسجيل طلب التوضيح بنجاح ✅'
                : 'تم تسجيل طلب التصحيح بنجاح ✅';
                
            SmartToast.success(successMessage);
            setShowMaterialErrorModal(null);
        }
    } catch (error) {
        debug.error('❌ خطأ في تسجيل طلب التصحيح/التوضيح:', error);
        SmartToast.error('حدث خطأ أثناء حفظ الطلب');
    }
};

const handleResolveIncidentalCase = (id: string, status: IncidentalStatus) => {
    const prevStage = stages[activeStageIndex];
    const target = stageIncidentalCases(prevStage).find((c) => c.id === id);
    if (!target) return;
    if (isLinkedSpawnIncidentalType(target.type)) {
        SmartToast.info('نتيجة الدعوى المنضمة/المتقابلة تُسجَّل تلقائياً من الإضبارة المرتبطة عند ختام المرافعة');
        return;
    }
    const updatedStages = [...stages];
    const nextIncidental = stageIncidentalCases(prevStage).map((c: IncidentalCase) =>
        c.id === id ? { ...c, status } : c,
    );
    const nextTimeline =
        target && (status === 'resolved' || status === 'rejected')
            ? [buildIncidentalResolveEvent(target, status), ...stageTimeline(prevStage)]
            : stageTimeline(prevStage);

    updatedStages[activeStageIndex] = {
        ...prevStage,
        incidentalCases: nextIncidental,
        timeline: nextTimeline,
    };
    setStages(updatedStages);
    saveToCloud(updatedStages);
};

const handleUpdateIncidentalEntryDecision = (
    id: string,
    entryDecision: 'accepted' | 'rejected',
) => {
    const prevStage = stages[activeStageIndex];
    const target = stageIncidentalCases(prevStage).find((c) => c.id === id);
    if (!target) return;

    const updatedStages = [...stages];
    const decisionEvent = buildIncidentalEntryDecisionEvent(target, entryDecision);
    const prunedIncidental = filterHeaderIncidentalCases(stageIncidentalCases(prevStage));
    const nextIncidental =
        entryDecision === 'rejected'
            ? prunedIncidental.filter((c) => c.id !== id)
            : prunedIncidental.map((c: IncidentalCase) =>
                  c.id === id ? { ...c, entryDecision } : c,
              );

    updatedStages[activeStageIndex] = {
        ...prevStage,
        incidentalCases: nextIncidental,
        timeline: [decisionEvent, ...stageTimeline(prevStage)],
    };

    setStages(updatedStages);
    saveToCloud(updatedStages);

    if (entryDecision === 'rejected') {
        SmartToast.info('تم رفض الدخول وإزالة الطلب');
    } else {
        SmartToast.success('تم قبول دخول الشخص الثالث');
    }
};


    return {
        handleAddIncidentalCase,
        handleSaveFastTrack,
        handleSaveAttachment,
        handleAddCrossAppeal,
        handleCancelCrossAppeal,
        handleJudgeRecusal,
        handleTransferJurisdiction,
        handleConsolidationExternalRef,
        handleCaseConsolidation,
        handleCaseLinkExternal,
        handleCorrespondence,
        handleCorrespondenceResponse,
        handleExportPDF,
        handleMaterialErrorCorrection,
        handleResolveIncidentalCase,
        handleUpdateIncidentalEntryDecision,
    };
}
