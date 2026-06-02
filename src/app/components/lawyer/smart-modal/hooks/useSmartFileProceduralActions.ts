import type {
    AppointmentType,
    CaseStage,
    DocumentCategory,
    IncidentalCase,
    IncidentalStatus,
    Party,
    Task,
    TimelineEvent,
} from '../../LawyerShared';
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
import { str, type SmartFileAttachment } from '../smartFile/judgmentTypes';
import type { FastTrackRecord, UseSmartFileProceduralActionsOptions } from '../smartFile/proceduralTypes';
import {
    formatDateToLocalYmd,
    stageAttachmentsList,
    stageFastTrackPetitions,
    stageIncidentalCases,
    stageTasks,
    stageTimeline,
    ymdPlusDays,
} from '../smartFile/proceduralTypes';
import { printDossier } from '../smartFile/printDossier';
import { syncLawsuitTaskDue, syncLawsuitTimelineAppointment } from '@/app/services/calendarDossierSync';

export function useSmartFileProceduralActions(options: UseSmartFileProceduralActionsOptions) {
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
        setShowAttorneyResignationModal,
        setShowExecutionTransferModal,
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
    } = options;

    const lawsuitCalendarContext = () => {
        const parties = parentData?.parties;
        const firstParty =
            Array.isArray(parties) && parties[0] && typeof parties[0] === 'object'
                ? (parties[0] as { name?: string })
                : null;
        return {
            userId: calendarUserId ?? null,
            fileId: String(parentData?.id ?? ''),
            caseNo: typeof parentData?.caseNo === 'string' ? parentData.caseNo : undefined,
            court: typeof parentData?.court === 'string' ? parentData.court : undefined,
            parties,
            clientName: firstParty?.name?.trim() || undefined,
        };
    };

        const handleAddTask = (taskData: Task) => {
            try {
                // ✅ Validation
                const validation = validateTaskData({ task: taskData.title, deadline: taskData.dueDate });
                if (!validation.valid) {
                    SmartToast.error(validation.error || 'بيانات المهمة غير صحيحة');
                    return;
                }

                const updatedStages = [...stages];
                
                if (taskData.id) {
                    // Update existing
                    updatedStages[activeStageIndex].tasks = stageTasks(currentStage).map((t: Task) => 
                        t.id === taskData.id ? { ...t, ...taskData } : t
                    );
                    setEditingTask(null);
                    SmartToast.success('تم تحديث المهمة بنجاح ✅');
                } else {
                    // Add new
                    const newTask: Task = {
                        id: `task_${Date.now()}`,
                        title: taskData.title,
                        dueDate: taskData.dueDate,
                        isCompleted: false
                    };
                    updatedStages[activeStageIndex].tasks = [newTask, ...stageTasks(currentStage)];
                    SmartToast.success('تمت إضافة المهمة بنجاح ✅');
                    taskData.id = newTask.id;
                }
                
                setStages(updatedStages);
                saveToCloud(updatedStages);

                const ctx = lawsuitCalendarContext();
                if (taskData.id && taskData.dueDate) {
                    syncLawsuitTaskDue({
                        userId: ctx.userId,
                        fileId: ctx.fileId,
                        task: {
                            id: String(taskData.id),
                            title: taskData.title,
                            dueDate: taskData.dueDate,
                            isCompleted: taskData.isCompleted,
                        },
                        caseNo: ctx.caseNo,
                        court: ctx.court,
                        parties: ctx.parties,
                    });
                }
            } catch (error) {
                logError('handleAddTask', error, taskData);
                SmartToast.error('حدث خطأ أثناء حفظ المهمة');
            }
        };

        const handleToggleTask = (taskId: string) => {
            const updatedStages = [...stages];
            let toggled: Task | undefined;
            updatedStages[activeStageIndex].tasks = stageTasks(currentStage).map((t: Task) => {
                if (t.id === taskId) {
                    toggled = { ...t, isCompleted: !t.isCompleted };
                    return toggled;
                }
                return t;
            });
            setStages(updatedStages);
            saveToCloud(updatedStages);
            if (toggled?.dueDate) {
                const ctx = lawsuitCalendarContext();
                syncLawsuitTaskDue({
                    userId: ctx.userId,
                    fileId: ctx.fileId,
                    task: toggled,
                    caseNo: ctx.caseNo,
                    court: ctx.court,
                    parties: ctx.parties,
                });
            }
        };

        const handleAddIncidentalCase = (data: IncidentalCase) => {
            const updatedStages = [...stages];

            if (data.id) {
                // Update existing
                updatedStages[activeStageIndex].incidentalCases = stageIncidentalCases(currentStage).map((c: IncidentalCase) => 
                    c.id === data.id ? { ...c, ...data } : c
                );
                setEditingIncidental(null);
            } else {
                // Add new
                const newCase: IncidentalCase = {
                    id: `inc_${Date.now()}`,
                    type: data.type,
                    partyName: data.partyName,
                    details: data.details,
                    date: getLocalTodayYmd(),
                    status: 'active'
                };
                updatedStages[activeStageIndex].incidentalCases = [newCase, ...stageIncidentalCases(currentStage)];
            }
            
            setStages(updatedStages);
            saveToCloud(updatedStages);
        };

        const handleSaveFastTrack = (data: FastTrackRecord) => {
            const updatedStages = [...stages];
            const currentStage = updatedStages[activeStageIndex];
            
            const petitions = stageFastTrackPetitions(currentStage);

            if (data.id) {
                currentStage.fastTrackPetitions = petitions.map((p) =>
                    p.id === data.id ? { ...p, ...data } : p
                );
                setEditingFastTrack(null);
            } else {
                const newPetition: FastTrackRecord = {
                    id: `fast_${Date.now()}`,
                    ...data,
                    createdDate: getLocalTodayYmd(),
                };
                currentStage.fastTrackPetitions = [newPetition, ...petitions];
            }

            // ⚡ INTELLIGENT DEADLINE AUTOMATION - Auto-create Tasks based on status
            const submissionDate = new Date(str(data.submissionDate));
            
            if (data.status === '⏳ قيد الانتظار (7 أيام)') {
                // Calculate 7-day deadline
                const deadline = new Date(submissionDate);
                deadline.setDate(deadline.getDate() + 7);
                
                const trackingTask: Task = {
                    id: `task_fast_${Date.now()}`,
                    title: `⏱️ متابعة القضاء المستعجل: المحكمة ملزمة بالقرار خلال 7 أيام (قدم بتاريخ ${data.submissionDate})`,
                    dueDate: ymdPlusDays(deadline, 0),
                    isCompleted: false,
                    priority: 'high',
                    isNew: true
                };
                
                currentStage.tasks = [trackingTask, ...(stageTasks(currentStage) || [])];
            } else if (data.status === '✅ صدر قرار بالقبول' || data.status === '❌ صدر قرار بالرفض') {
                // 3-day grievance warning
                const deadline = new Date(submissionDate);
                deadline.setDate(deadline.getDate() + 3);
                
                const grievanceTask: Task = {
                    id: `task_fast_${Date.now()}`,
                    title: `🚨 انتبه: يحق التظلم من القرار الولائي خلال (3 أيام) فقط من تاريخ التبليغ أو الرفض!`,
                    dueDate: ymdPlusDays(deadline, 0),
                    isCompleted: false,
                    priority: 'high',
                    isNew: true
                };
                
                currentStage.tasks = [grievanceTask, ...(stageTasks(currentStage) || [])];
            }

            // ⚡ ADD TO TIMELINE with special amber styling
            const timelineEvent: TimelineEvent = {
                id: `timeline_fast_${Date.now()}`,
                type: 'action',
                date: str(data.submissionDate),
                time: str(data.grievanceTime),
                title: `⚡ ${str(data.requestType)} - ${str(data.status)}`,
                details: `${data.subject}\n\n${data.status === '⚖️ قيد نظر التظلم' && data.grievanceDate ? `📅 موعد جلسة التظلم: ${data.grievanceDate}\n` : ''}${data.grievanceOutcome ? `النتيجة: ${data.grievanceOutcome}` : ''}`,
                isFastTrack: true, // 🔥 Special flag for styling
                fastTrackStatus: data.status,
                isNew: true
            };

            currentStage.timeline = [timelineEvent, ...(stageTimeline(currentStage) || [])];

            setStages(updatedStages);
            saveToCloud(updatedStages);
            SmartToast.success('تم حفظ الطلب المستعجل بنجاح ⚡');
            setShowFastTrackModal(false);
        };

        const handleSaveAttachment = (data: SmartFileAttachment) => {
            const updatedStages = [...stages];
            const currentStage = updatedStages[activeStageIndex];
            const attachments = stageAttachmentsList(currentStage);

            if (data.id) {
                currentStage.attachments = attachments.map((a) =>
                    a.id === data.id ? { ...a, ...data } : a
                );
                setEditingAttachment(null);
            } else {
                const newAttachment: SmartFileAttachment = {
                    id: `attach_${Date.now()}`,
                    ...data,
                    createdDate: getLocalTodayYmd(),
                };
                currentStage.attachments = [newAttachment, ...attachments];
            }

            // ⚡ THE 'GUILLOTINE' TIMERS - Automated Task Generation
            const submissionDate = new Date(str(data.submissionDate));
            const notificationRaw = str(data.notificationDate);
            const notificationDate = notificationRaw ? new Date(notificationRaw) : null;

            // TIMER 1: 24-hour court decision deadline
            if (data.status === 'مُقدم - بانتظار القرار (24 ساعة)') {
                const decisionDeadline = new Date(submissionDate);
                decisionDeadline.setDate(decisionDeadline.getDate() + 1);
                
                const radarTask: Task = {
                    id: `task_attach_${Date.now()}`,
                    title: `⏱️ رادار الحجز: المحكمة ملزمة بإصدار القرار في اليوم التالي كحد أقصى (المادة 233)`,
                    dueDate: ymdPlusDays(decisionDeadline, 0),
                    isCompleted: false,
                    priority: 'high',
                    isNew: true
                };
                
                currentStage.tasks = [radarTask, ...(stageTasks(currentStage) || [])];
            }

            // TIMER 2: Fatal 8-day lawsuit filing deadline (if pre-lawsuit attachment)
            if (data.status === 'صدر قرار بالحجز ✅' && data.timing === 'قبل إقامة الدعوى (مستعجل)' && notificationDate) {
                const lawsuit8DayDeadline = new Date(notificationDate);
                lawsuit8DayDeadline.setDate(lawsuit8DayDeadline.getDate() + 8);
                
                const guillotineTask: Task = {
                    id: `task_attach_guillotine_${Date.now()}`,
                    title: `🚨 مقصلة الـ 8 أيام: يجب إقامة دعوى الموضوع خلال 8 أيام من التبليغ، وإلا يبطل الحجز (المادة 237)!`,
                    dueDate: ymdPlusDays(lawsuit8DayDeadline, 0),
                    isCompleted: false,
                    priority: 'critical',
                    isNew: true
                };
                
                // 3-month expiration warning
                const expiration3MonthDate = new Date(submissionDate);
                expiration3MonthDate.setMonth(expiration3MonthDate.getMonth() + 3);
                
                const expirationTask: Task = {
                    id: `task_attach_expire_${Date.now()}`,
                    title: `⚠️ تذكير: يبطل الحجز كلياً بعد 3 أشهر إذا لم يتم التبليغ وإقامة الدعوى (المادة 237)`,
                    dueDate: formatDateToLocalYmd(expiration3MonthDate),
                    isCompleted: false,
                    priority: 'medium',
                    isNew: true
                };
                
                currentStage.tasks = [guillotineTask, expirationTask, ...(stageTasks(currentStage) || [])];
            }

            // TIMER 3: 3-day grievance deadline
            if ((data.status === 'صدر قرار بالحجز ✅' || data.status === 'رُفض الطلب ❌') && notificationDate) {
                const grievanceDeadline = new Date(notificationDate);
                grievanceDeadline.setDate(grievanceDeadline.getDate() + 3);
                
                const grievanceTask: Task = {
                    id: `task_attach_grieve_${Date.now()}`,
                    title: `⚖️ التظلم: يحق تقديم تظلم من قرار الحجز خلال 3 أيام فقط (المادة 240)`,
                    dueDate: ymdPlusDays(grievanceDeadline, 0),
                    isCompleted: false,
                    priority: 'high',
                    isNew: true
                };
                
                currentStage.tasks = [grievanceTask, ...(stageTasks(currentStage) || [])];
            }

            // ⚡ ADD TO TIMELINE with special red styling
            const depositAmount = str(data.depositAmount);
            const timelineEvent: TimelineEvent = {
                id: `timeline_attach_${Date.now()}`,
                type: 'action',
                date: str(data.submissionDate),
                title: `🔒 طلب حجز احتياطي - ${str(data.status)}`,
                details: `التوقيت: ${str(data.timing)}\nالأساس القانوني: ${str(data.legalBasis)}\nالمال المحجوز: ${str(data.attachedProperty)}\nالقيمة التقديرية: ${str(data.estimatedValue)} IQD${depositAmount && parseFloat(depositAmount) > 0 ? `\nالكفالة المودعة: ${depositAmount} IQD` : ''}\n${notificationRaw ? `\n📅 تاريخ التبليغ: ${notificationRaw}` : ''}${data.hasGrievance && data.grievanceDate ? `\n\n⚖️ تظلم مقدم في: ${str(data.grievanceDate)}` : ''}${data.grievanceOutcome ? `\nالنتيجة: ${str(data.grievanceOutcome)}` : ''}`,
                isAttachment: true, // 🔥 Special flag for styling
                attachmentStatus: str(data.status),
                isNew: true
            };

            currentStage.timeline = [timelineEvent, ...(stageTimeline(currentStage) || [])];

            setStages(updatedStages);
            saveToCloud(updatedStages);
            SmartToast.success('تم حفظ طلب الحجز الاحتياطي بنجاح 🔒');
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
            updatedStages[activeStageIndex] = {
                ...updatedStages[activeStageIndex],
                hasCrossAppeal: false
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
            const currentStage = updatedStages[activeStageIndex];

            // Update court name
            currentStage.court = data.newCourt;

            // Add bold timeline event
            currentStage.timeline = [{
                id: `transfer_${Date.now()}`,
                type: 'milestone',
                date: data.transferDate,
                title: `🔀 إحالة الدعوى لعدم الاختصاص → ${data.newCourt}`,
                details: `تم إحالة الدعوى إلى: ${data.newCourt}\n${data.notes ? `\nالسبب: ${data.notes}` : ''}\n\n✅ الدعوى نشطة في المحكمة الجديدة.`,
                isNew: true,
                color: 'purple'
            }, ...(stageTimeline(currentStage) || [])];

            setStages(updatedStages);
            saveToCloud(updatedStages);
            SmartToast.success(`تم إحالة الدعوى إلى: ${data.newCourt} 🔀`);
            setShowTransferJurisdictionModal(false);
        };

        const handleCaseConsolidation = (data: { linkedCaseNo: string; consolidationDate: string; notes: string }) => {
            const updatedStages = [...stages];
            const currentStage = updatedStages[activeStageIndex];

            // Add consolidation badge data
            currentStage.consolidatedWith = data.linkedCaseNo;

            // Add timeline event
            currentStage.timeline = [{
                id: `consolidation_${Date.now()}`,
                type: 'milestone',
                date: data.consolidationDate,
                title: `🔗 توحيد الدعاوى - مع القضية رقم ${data.linkedCaseNo}`,
                details: `تم توحيد الدعوى مع القضية رقم: ${data.linkedCaseNo}\n${data.notes ? `\nالسبب: ${data.notes}` : ''}`,
                isNew: true,
                color: 'teal'
            }, ...(stageTimeline(currentStage) || [])];

            setStages(updatedStages);
            saveToCloud(updatedStages);
            SmartToast.success(`تم التوحيد مع القضية: ${data.linkedCaseNo} 🔗`);
            setShowCaseConsolidationModal(false);
        };

        const handleAttorneyResignation = (data: { resignationType: string; resignationDate: string; notes: string }) => {
            const updatedStages = [...stages];
            const currentStage = updatedStages[activeStageIndex];

            // Mark as resigned
            currentStage.isAttorneyResigned = true;
            currentStage.resignationData = data;

            // Add RED timeline event
            currentStage.timeline = [{
                id: `resignation_${Date.now()}`,
                type: 'alert',
                date: data.resignationDate,
                title: `🚫 انتهى التمثيل القانوني (${data.resignationType})`,
                details: `نوع الإنهاء: ${data.resignationType}\n${data.notes ? `ملاحظات: ${data.notes}\n` : ''}\n⚠️ تم تعطيل جميع وظائف التحرير والجدولة في هذه القضية نهائياً.`,
                isNew: true,
                color: 'red'
            }, ...(stageTimeline(currentStage) || [])];

            // Update parent status
            setParentData({ ...parentData, status: 'انتهت الوكالة' });

            setStages(updatedStages);
            saveToCloud(updatedStages, { ...parentData, status: 'انتهت الوكالة' });
            SmartToast.error('تم إنهاء التمثيل القانوني نهائياً 🚫');
            setShowAttorneyResignationModal(false);
        };

        const handleExecutionTransfer = (data: {
            executionFileNo: string;
            executionCourt: string;
            notes: string;
            depositDate: string;
        }) => {
            const updatedStages = [...stages];
            const currentStage = updatedStages[activeStageIndex];

            // Mark as in execution
            currentStage.isInExecution = true;
            currentStage.executionData = data;

            // Add MASSIVE Green/Gold timeline event
            currentStage.timeline = [{
                id: `execution_${Date.now()}`,
                type: 'milestone',
                date: data.depositDate,
                title: `💼 إحالة لمديرية التنفيذ - رقم الإضبارة: ${data.executionFileNo}`,
                details: `انتقال من مرحلة التقاضي إلى المرحلة التنفيذية\n\nرقم الإضبارة التنفيذية: ${data.executionFileNo}\n${data.executionCourt ? `مديرية التنفيذ: ${data.executionCourt}\n` : ''}تاريخ الإيداع: ${data.depositDate}\n${data.notes ? `\nملاحظات: ${data.notes}` : ''}\n\n✅ الدعوى الآن في المرحلة التنفيذية.`,
                isNew: true,
                color: 'gold'
            }, ...(stageTimeline(currentStage) || [])];

            // Update parent status
            setStatus('قيد التنفيذ');

            setStages(updatedStages);
            saveToCloud(updatedStages);
            SmartToast.success('تم الانتقال للمرحلة التنفيذية بنجاح 💼');
            setShowExecutionTransferModal(false);
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
            const updatedStages = [...stages];
            updatedStages[activeStageIndex].incidentalCases = stageIncidentalCases(currentStage).map((c: IncidentalCase) => 
                c.id === id ? { ...c, status } : c
            );
            setStages(updatedStages);
            saveToCloud(updatedStages);
        };

        const handleAddAppointment = (data: {
            date: string;
            title?: string;
            details?: string;
            description?: string;
            purpose?: string;
            id?: string;
            [key: string]: unknown;
        }) => {
            const updatedStages = [...stages];
            let autoLock = false;
            
            // 🔥 NEW: Auto-Task Generation for Witnesses/Experts
            if (data.purpose === 'انتخاب خبير / كشف') {
                // We can't call handleAddTask directly because it modifies state and triggers save.
                // Instead, we should modify the updatedStages object directly if we want atomic update, 
                // OR just accept that we trigger two updates. 
                // Calling handleAddTask is safer for code reuse but might cause race condition if we don't handle it carefully.
                // Let's modify updatedStages directly to be safe.
                const newTask: Task = {
                    id: `task_auto_${Date.now()}`,
                    title: `⚠️ تسديد أمانة الخبير والمصاريف لجلسة ${data.date}`,
                    dueDate: data.date,
                    isCompleted: false
                };
                updatedStages[activeStageIndex].tasks = [newTask, ...(stageTasks(currentStage) || [])];
                SmartToast.info("تم إضافة مهمة إدارية لتسديد أجور الخبير تلقائياً 🤖");
            }
            if (data.purpose === 'استماع شهود') {
                 const newTask: Task = {
                    id: `task_auto_${Date.now()}`,
                    title: `⚠️ تسديد نفقات الشهود لجلسة ${data.date}`,
                    dueDate: data.date,
                    isCompleted: false
                };
                updatedStages[activeStageIndex].tasks = [newTask, ...(stageTasks(currentStage) || [])];
                 SmartToast.info("تم إضافة مهمة إدارية لتسديد نفقات الشهود تلقائياً 🤖");
            }

            // 🔮 AUTOMATIC LOCK TRIGGER
            // If the hearing outcome/title mentions "Closing of Pleadings", lock the case globally.
            const apptTitle = String(data.title ?? data.description ?? '');
            const apptDetails = String(data.details ?? data.description ?? '');
            if (
                apptTitle.includes('ختام المرافعة') ||
                apptTitle.includes('حجز الدعوى') ||
                apptDetails.includes('ختام المرافعة') ||
                apptDetails.includes('حجز الدعوى')
            ) {
                updatedStages[activeStageIndex].isPleadingsClosed = true;
                autoLock = true;
            }

            if (data.id) {
                // Update existing
                updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) => 
                    e.id === data.id ? { ...e, ...data, type: 'appointment' as const } : e
                );
                setEditingEvent(null);
            } else {
                const newApptId = `appt_${Date.now()}`;
                updatedStages[activeStageIndex].timeline = [{
                    id: newApptId,
                    type: 'appointment',
                    date: data.date,
                    title: apptTitle,
                    details: apptDetails,
                    subType: data.purpose as AppointmentType | undefined,
                    isNew: true
                }, ...(updatedStages[activeStageIndex].timeline || [])];
                data.id = newApptId;
            }
            
            setStages(updatedStages);
            saveToCloud(updatedStages);

            const ctx = lawsuitCalendarContext();
            const timelineEventId = String(data.id ?? `appt_${Date.now()}`);
            syncLawsuitTimelineAppointment({
                userId: ctx.userId,
                fileId: ctx.fileId,
                event: {
                    id: timelineEventId,
                    date: data.date,
                    title: apptTitle || String(data.purpose ?? 'موعد'),
                    details: apptDetails,
                },
                caseNo: ctx.caseNo,
                court: ctx.court,
                parties: ctx.parties,
                clientName: ctx.clientName,
            });

            if (autoLock) {
                SmartToast.success("تم حجز الدعوى للقرار تلقائياً بناءً على نتيجة الجلسة 🔒");
            }
        };

        const handleAddAction = (data: { title: string; date: string; description: string; [key: string]: unknown }) => {
            const updatedStages = [...stages];
            
            if (data.isStayed) {
                 setStatus('مستأخرة');
                 setIsPaused(true);
                 setPauseReason(data.title); 
            }

            // ========================================
            // 🔥 NEW: LITIGATION INCIDENTS LOGIC (عوارض الخصومة)
            // ========================================
            if (data.litigationIncidentType) {
                const currentStage = updatedStages[activeStageIndex];
                
                if (data.litigationIncidentType === 'ترك الدعوى للمراجعة') {
                    // 1. Change case status
                    setStatus('متروكة للمراجعة');
                    
                    // 2. Create high-priority task
                    const urgentTask: Task = {
                        id: `task_${Date.now()}`,
                        title: `🚨 تحذير: تجديد الدعوى المتروكة قبل مرور 10 أيام لمنع إبطالها (تاريخ الترك: ${data.date})`,
                        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(data.date || '').trim())
                            ? addCalendarDaysYmd(String(data.date).trim().slice(0, 10), 8)
                            : formatDateToLocalYmd(
                                  (() => {
                                      const d = new Date(String(data.date));
                                      d.setDate(d.getDate() + 8);
                                      return d;
                                  })()
                              ),
                        isCompleted: false,
                        isNew: true,
                        priority: 'high',
                    };
                    updatedStages[activeStageIndex].tasks = [urgentTask, ...(stageTasks(currentStage) || [])];
                    
                    // 3. Add timeline event
                    const event: TimelineEvent = {
                        id: `action_${Date.now()}`,
                        type: 'decision',
                        date: data.date,
                        title: '⏸️ ترك الدعوى للمراجعة',
                        details: `${data.title}\n\n⚠️ يجب تجديد السير بالدعوى خلال 10 أيام من هذا التاريخ وإلا تبطل.`,
                        isNew: true,
                        tags: ['#عوارض_الخصومة', '#غياب']
                    };
                    updatedStages[activeStageIndex].timeline = [event, ...stageTimeline(currentStage)];
                    
                    SmartToast.warning('تم ترك الدعوى للمراجعة - تحذير: يجب التجديد خلال 10 أيام! 🚨');
                } else if (data.litigationIncidentType === 'الوقف الاتفاقي') {
                    // 1. Change case status
                    setStatus('موقوفة اتفاقياً');
                    setIsPaused(true);
                    setPauseReason('الوقف الاتفاقي');
                    
                    // 2. Create high-priority task
                    const urgentTask: Task = {
                        id: `task_${Date.now()}`,
                        title: `🚨 تحذير: استئناف السير بالدعوى الموقوفة قبل مرور 15 يوماً من تاريخ ${data.stayEndDate}`,
                        dueDate: (() => {
                            const raw = String(data.stayEndDate || '').trim().slice(0, 10);
                            const base = /^\d{4}-\d{2}-\d{2}$/.test(raw)
                                ? parseLocalNotificationDate(raw)
                                : new Date(String(data.stayEndDate));
                            base.setDate(base.getDate() - 3);
                            return ymdPlusDays(base, 0);
                        })(),
                        isCompleted: false,
                        isNew: true,
                        priority: 'high',
                    };
                    updatedStages[activeStageIndex].tasks = [urgentTask, ...(stageTasks(currentStage) || [])];
                    
                    // 3. Add timeline event
                    const event: TimelineEvent = {
                        id: `action_${Date.now()}`,
                        type: 'decision',
                        date: data.date,
                        title: '⏸️ الوقف الاتفاقي للدعوى',
                        details: `${data.title}\n\nنهاية مدة الوقف: ${data.stayEndDate}\n\n⚠️ يجب استئناف السير بالدعوى قبل مرور 15 يوماً من تاريخ انتهاء الوقف.`,
                        isNew: true,
                        tags: ['#عوارض_الخصومة', '#وقف_اتفاقي']
                    };
                    updatedStages[activeStageIndex].timeline = [event, ...stageTimeline(currentStage)];
                    
                    SmartToast.warning('تم إيقاف الدعوى اتفاقياً - تحذير: يجب الاستئناف في الوقت المحدد! ⏸️');
                }
                
                setStages(updatedStages);
                saveToCloud(updatedStages);
                return;
            }

            // ========================================
            // INCIDENTAL LAWSUIT LOGIC (م 66, 67, 69)
            // ========================================
            if (data.type === 'incidental') {
                debug.log('⚖️ تسجيل دعوى حادثة:', data.incidentalType);
                
                // 1. ADD TIMELINE EVENT (Deep Blue)
                const incidentalEvent: TimelineEvent = {
                    id: `incidental_${Date.now()}`,
                    type: 'decision', // Use decision base
                    date: data.date || getLocalTodayYmd(),
                    title: data.title,
                    details: `${data.details}\n\n📝 تم دفع الرسم القانوني بموجب الوصل المرقم ${data.feeReceipt}.`,
                    isNew: true,
                    tags: ['#دعوى_حادثة', data.incidentalType === 'third_party' ? '#شخص_ثالث' : '#طلب_عارض']
                };
                
                updatedStages[activeStageIndex].timeline = [incidentalEvent, ...stageTimeline(currentStage)];

                // 2. THIRD PARTY INJECTION (Type C)
                if (data.incidentalType === 'third_party') {
                    const newParty = {
                        id: Date.now(),
                        name: String(data.thirdPartyName ?? ''),
                        role: String(data.thirdPartyRole ?? ''),
                        isClient: false,
                        notificationStatus: 'pending' as const,
                    } satisfies Party & { notificationStatus?: 'pending' };

                    const currentParties = updatedStages[activeStageIndex].parties || [];
                    updatedStages[activeStageIndex].parties = [...currentParties, newParty];
                    
                    // Also update parent parties to reflect globally? Usually stages have their own parties state now.
                    // But for header display, we often read from stage.
                }
                
                setStages(updatedStages);
                saveToCloud(updatedStages);
                SmartToast.success("تم تسجيل الدعوى الحادثة بنجاح ⚖️");
                return;
            }

            // ========================================
            // REGULAR ACTION LOGIC
            // ========================================
            const newEvent: TimelineEvent = {
                id: String(data.id || `action_${Date.now()}`),
                type: 'decision', 
                date: String(data.date),
                title: String(data.title),
                details: String(data.details ?? data.description ?? ''),
                isNew: !data.id,
                isStayed: Boolean(data.isStayed), 
                isSessionRecord: true 
            };

            if (data.id) {
                 updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) => 
                    e.id === data.id ? { ...e, ...newEvent } : e
                );
                setEditingEvent(null);
            } else {
                 updatedStages[activeStageIndex].timeline = [newEvent, ...stageTimeline(currentStage)];
            }

            setStages(updatedStages);
            saveToCloud(updatedStages);
            
            if (data.isStayed) {
                SmartToast.warning("تم استئخار الدعوى وتجميد الإجراءات ⏸️");
            }
        };

        const handleAddNote = (data: { text: string; date: string; [key: string]: unknown }) => {
            const updatedStages = [...stages];
            let autoLock = false;

            const noteTitle = String(data.title ?? '');
            const noteDetails = String(data.details ?? data.text ?? '');
            if (
                noteTitle.includes('ختام المرافعة') ||
                noteTitle.includes('حجز الدعوى') ||
                noteDetails.includes('ختام المرافعة') ||
                noteDetails.includes('حجز الدعوى')
            ) {
                updatedStages[activeStageIndex].isPleadingsClosed = true;
                autoLock = true;
            }
            
            const noteTags = Array.isArray(data.tags) ? (data.tags as string[]) : undefined;
            if (data.id) {
                updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) => 
                    e.id === data.id ? { ...e, type: 'note', title: noteTitle, details: noteDetails, tags: noteTags } : e
                );
                setEditingEvent(null);
            } else {
                updatedStages[activeStageIndex].timeline = [{
                    id: `note_${Date.now()}`,
                    type: 'note',
                    date: getLocalTodayYmd(),
                    title: noteTitle,
                    details: noteDetails,
                    tags: noteTags,
                    isNew: true
                }, ...stageTimeline(currentStage)];
            }
            setStages(updatedStages);
            saveToCloud(updatedStages);

            if (autoLock) {
                SmartToast.success("تم حجز الدعوى للقرار تلقائياً 🔒");
            }
        };

        const handleAddDoc = (data: { title: string; file: File | string; notes?: string; date: string; [key: string]: unknown }) => {
            try {
                // ✅ Validation
                const validation = validateDocumentData({ 
                    docName: data.title, 
                    docType: data.category, 
                    date: data.date || getLocalTodayYmd()
                });
                if (!validation.valid) {
                    SmartToast.error(validation.error || 'بيانات المستند غير صحيحة');
                    return;
                }

                const updatedStages = [...stages];
                
                const docCategory = data.category as DocumentCategory | undefined;
                const evidentiaryWeight = data.evidentiaryWeight as TimelineEvent['evidentiaryWeight'];
                if (data.id) {
                    updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) => 
                        e.id === data.id ? {
                            ...e,
                            type: 'document',
                            title: data.title,
                            details: String(data.details ?? data.notes ?? ''),
                            docCategory,
                            evidentiaryWeight,
                        } : e
                    );
                    setEditingEvent(null);
                    SmartToast.success('تم تحديث المستند بنجاح ✅');
                } else {
                    updatedStages[activeStageIndex].timeline = [{
                        id: `doc_${Date.now()}`,
                        type: 'document',
                        date: getLocalTodayYmd(),
                        title: data.title,
                        details: String(data.details ?? data.notes ?? ''),
                        docCategory,
                        evidentiaryWeight,
                        isNew: true
                    }, ...stageTimeline(currentStage)];
                    SmartToast.success('تمت إضافة المستند بنجاح ✅');
                }
                
                setStages(updatedStages);
                saveToCloud(updatedStages);
            } catch (error) {
                logError('handleAddDoc', error, data);
                SmartToast.error('حدث خطأ أثناء حفظ المستند');
            }
        };

        const handleAddPayment = (amount: number, date: string) => {
            try {
                // ✅ Validation
                const validation = validatePaymentData({ amount, date });
                if (!validation.valid) {
                    SmartToast.error(validation.error || 'بيانات الدفعة غير صحيحة');
                    return;
                }

                // ✅ CRITICAL: Update PARENT fees, not stage fees
                const updatedParent = {
                    ...parentData,
                    feesPaid: Number(parentData.feesPaid) + amount
                };
                setParentData(updatedParent);
                
                // Add timeline event to current stage
                const updatedStages = [...stages];
                updatedStages[activeStageIndex].timeline = [{
                    id: `pay_${Date.now()}`,
                    type: 'note',
                    date: date,
                    title: 'دفعة مالية مستلمة',
                    details: `تم استلام مبلغ ${amount.toLocaleString()} د.ع كجزء من الأتعاب.`,
                    isNew: true
                }, ...stageTimeline(currentStage)];
            
                setStages(updatedStages);
                saveToCloud(updatedStages, updatedParent);
                SmartToast.success(`تم تسجيل دفعة ${amount.toLocaleString()} د.ع بنجاح ✅`);
            } catch (error) {
                logError('handleAddPayment', error, { amount, date });
                SmartToast.error('حدث خطأ أثناء تسجيل الدفعة');
            }
        };

        const handlePauseConfirm = (pauseData: { reason: string; linkedCaseNo?: string; id?: string; [key: string]: unknown }) => {
            const { reason, linkedCaseNo, id } = pauseData;
            const updatedStages = [...stages];

            if (id) {
                // Update existing event
                updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) => 
                    e.id === id ? { 
                        ...e, 
                        title: 'قرار استئخار الدعوى ⏸️',
                        details: `${reason}\n\n🔗 بانتظار حسم الدعوى المرتبطة رقم: ${linkedCaseNo}`,
                        // Ideally store raw data if possible, but for now we rely on re-parsing or just updating details
                    } : e
                );
                
                // Also update stage state if it matches current pause
                if (isPaused && pauseReason === currentStage.stayReason) {
                     setPauseReason(reason);
                     setLinkedCaseNo(linkedCaseNo ?? '');
                }
                setEditingEvent(null);
            } else {
                // New Pause
                setStatus('مستأخرة');
                setIsPaused(true);
                setPauseReason(reason);
                setLinkedCaseNo(linkedCaseNo ?? '');
                
                updatedStages[activeStageIndex].timeline = [{
                    id: `pause_${Date.now()}`,
                    type: 'decision',
                    date: getLocalTodayYmd(),
                    title: 'قرار استئخار الدعوى ⏸️',
                    details: `${reason}\n\n🔗 بانتظار حسم الدعوى المرتبطة رقم: ${linkedCaseNo ?? ''}`,
                    isNew: true,
                    isPause: true,
                }, ...stageTimeline(currentStage)];
            }
            
            setShowPauseModal(false);
            setStages(updatedStages);
            saveToCloud(updatedStages);
        };
        
        const handleResume = () => {
            // This is a direct resume (e.g. from Pause/Stay)
            // For Interruption, we use handleResumeInterruptionConfirm via Modal
            setStatus('نشطة');
            setIsPaused(false);
            setPauseReason('');
            
            // Add timeline event
            const updatedStages = [...stages];
            const newEvent: TimelineEvent = {
                id: `resume_${Date.now()}`,
                type: 'decision',
                date: getLocalTodayYmd(),
                title: '▶️ استئناف السير في الدعوى (من استئخار)',
                details: 'تم رفع التجميد واستئناف السير في الدعوى بشكل طبيعي.',
                isNew: true
            };
            
            updatedStages[activeStageIndex].timeline = [newEvent, ...(stageTimeline(currentStage) || [])];
            
            setStages(updatedStages);
            saveToCloud(updatedStages);
        };



        const handleInterruptionToggle = () => {
            if (isInterrupted) {
                // Turning OFF -> Ask for Confirmation
                setShowResumeInterruptionModal(true);
            } else {
                // Turning ON -> Show Setup Modal
                setShowInterruptionModal(true);
            }
        };

        // ========================================
        // EXTRAORDINARY APPEALS HANDLER
        // ========================================
        const handleExtraordinaryAppeal = (data: { type: string; date: string; court: string; reasons: string; [key: string]: unknown }) => {
            const { type, date, court, reasons } = data;
            const updatedStages = [...stages];
            
            let newStatus = status;
            let statusLabel = '';
            let timelineTitle = '';
            let timelineDetails = `تاريخ التقديم: ${date}\nمقدمة إلى: ${court}\n\nالأسباب:\n${reasons}`;

            // 1. STATE OVERRIDE MUTATIONS (The Legal Re-opening)
            if (type === 'إعادة المحاكمة') {
                newStatus = 'قيد نظر إعادة المحاكمة';
                statusLabel = 'قيد نظر إعادة المحاكمة';
                timelineTitle = '🔄 تسجيل طلب إعادة المحاكمة';
                // Un-freeze slightly
                updatedStages[activeStageIndex].status = 'active'; 
            } else if (type === 'تصحيح القرار التمييزي') {
                newStatus = 'قيد نظر التصحيح التمييزي';
                statusLabel = 'قيد نظر التصحيح التمييزي';
                timelineTitle = '⚠️ طلب تصحيح القرار التمييزي';
                 // Un-freeze slightly
                updatedStages[activeStageIndex].status = 'active';
            } else if (type === 'اعتراض الغير') {
                // Objection doesn't necessarily freeze, but we note it
                timelineTitle = '🙋‍♂️ تسجيل اعتراض الغير على الحكم';
                statusLabel = 'اعتراض الغير';
                // Status might remain 'active' or specific if needed, but per prompt: "do not necessarily freeze... unless manually requested"
                // We just add event.
            } else if (type === 'رد القاضي') {
                // 🔥 NEW: Judge Recusal - Freezes the case immediately
                newStatus = 'قيد نظر طلب رد القاضي';
                statusLabel = 'قيد نظر طلب رد القاضي';
                timelineTitle = '⚖️ طلب رد القاضي أو نقل الدعوى';
                // Freeze case completely
                setIsPaused(true);
                setPauseReason('قيد نظر طلب رد القاضي');
            }

            // 2. Update Global Status if changed
            if (newStatus !== status) {
                setStatus(newStatus);
            }

            // 3. Add Timeline Event (High Contrast)
            const newEvent: TimelineEvent = {
                id: `extra_appeal_${Date.now()}`,
                type: 'decision', // Uses decision icon/type base
                date: date,
                title: timelineTitle,
                details: timelineDetails,
                isNew: true,
                isSystemLog: true, // Mark as special system event
                tags: ['#طعن_استثنائي', type] // Add tag for filtering
            };

            updatedStages[activeStageIndex].timeline = [newEvent, ...stageTimeline(currentStage)];
            
            // 4. Update Stage Metadata to reflect this extraordinary state
            updatedStages[activeStageIndex].extraordinaryAppealType = type;

            setStages(updatedStages);
            saveToCloud(updatedStages);
            setShowExtraordinaryAppealModal(false);
            SmartToast.success(`تم تسجيل ${type} بنجاح وتحديث حالة الدعوى ⚖️`);
        };

        // ========================================
        // PROVISIONAL ORDERS HANDLER
        // ========================================
        const handleProvisionalOrderConfirm = (data: { type: string; targetParty: string; [key: string]: unknown }) => {
            const { type, targetParty } = data;
            
            // 1. Update Stage Data (Add to provisionalOrders)
            const updatedStages = [...stages];
            const currentOrders = updatedStages[activeStageIndex].provisionalOrders || [];
            
            updatedStages[activeStageIndex] = {
                ...currentStage,
                provisionalOrders: [...currentOrders, {
                    id: `ord_${Date.now()}`,
                    type,
                    targetParty,
                    date: getLocalTodayYmd()
                }]
            };

            // 2. Add Timeline Event
            updatedStages[activeStageIndex].timeline = [{
                id: `order_${Date.now()}`,
                type: 'decision', // Use decision for legal orders
                title: `🔒 صدر قرار ولائي (${type})`,
                details: `صدر قرار ولائي بـ (${type}) بحق (${targetParty}).\n\n⚠️ هذا الإجراء لا يوقف سير الدعوى ولكنه يفرض قيوداً قانونية.`,
                date: getLocalTodayYmd(),
                isNew: true
            }, ...(stageTimeline(currentStage) || [])];

            setStages(updatedStages);
            saveToCloud(updatedStages);
            setShowProvisionalOrderModal(false);
            SmartToast.warning(`تم إصدار قرار ولائي (${type}) بنجاح`);
        };

        const handleInterlocutoryAppealConfirm = (data: { decisionType: string; decisionDate: string; calculatedDeadline: string; id: string; [key: string]: unknown }) => {
            const { decisionType, decisionDate, calculatedDeadline, id } = data;
            const updatedStages = [...stages];
            
            if (id) {
                // Update existing event
                updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) => 
                    e.id === id ? { 
                        ...e, 
                        details: `نوع القرار: ${decisionType}\nتاريخ صدور القرار: ${decisionDate}\n\n⚠️ تم تسجيل مهلة 7 أيام للطعن.\nالموعد النهائي: ${calculatedDeadline}`,
                        date: decisionDate
                    } : e
                );
                setEditingEvent(null);
            } else {
                // 1. Add Timeline Event
                const newEvent: TimelineEvent = {
                    id: `appeal_${Date.now()}`,
                    type: 'decision', // Use decision type for legal actions
                    title: 'طعن تمييزي في قرار إعدادي (مادة 216) ⚖️',
                    details: `نوع القرار: ${decisionType}\nتاريخ صدور القرار: ${decisionDate}\n\n⚠️ تم تسجيل مهلة 7 أيام للطعن.\nالموعد النهائي: ${calculatedDeadline}`,
                    date: getLocalTodayYmd(),
                    isNew: true
                };

                // 2. Add To-Do Task
                const newTask: Task = {
                    id: `task_appeal_${Date.now()}`,
                    title: `تقديم لائحة الطعن التمييزي (${decisionType})`,
                    dueDate: calculatedDeadline,
                    isCompleted: false
                };

                // Ensure we work with arrays even if undefined
                const currentTimeline = stageTimeline(currentStage) || [];
                const currentTasks = stageTasks(currentStage) || [];

                updatedStages[activeStageIndex].timeline = [newEvent, ...currentTimeline];
                updatedStages[activeStageIndex].tasks = [newTask, ...currentTasks];
            }
            
            setStages(updatedStages);
            saveToCloud(updatedStages);
            const ctx = lawsuitCalendarContext();
            if (!id) {
                const tasks = updatedStages[activeStageIndex].tasks ?? [];
                const appealTask = tasks.find((t) => t.id?.startsWith('task_appeal_'));
                if (appealTask?.dueDate) {
                    syncLawsuitTaskDue({
                        userId: ctx.userId,
                        fileId: ctx.fileId,
                        task: appealTask,
                        caseNo: ctx.caseNo,
                        court: ctx.court,
                        parties: ctx.parties,
                    });
                }
            }
            setShowInterlocutoryModal(false);
        };

        const handleInterruptionConfirm = (data: { reason: string; affectedParty: string; date: string; notes: string; id: string; [key: string]: unknown }) => {
            const { reason, affectedParty, date, notes, id } = data;
            const updatedStages = [...stages];
            const currentTimeline = stageTimeline(currentStage) || [];

            if (id) {
                // Update existing event
                updatedStages[activeStageIndex].timeline = currentTimeline.map((e: TimelineEvent) => 
                    e.id === id ? {
                        ...e,
                        date: date,
                        details: `السبب القانوني: ${reason}\n\nالخصم المعني: ${affectedParty}\n\n${notes ? `ملاحظات: ${notes}\n\n` : ''}⚖️ *الدعوى موقوفة بحكم القانون لحين تبليغ الورثة أو من يقوم مقام الخصم.*`
                    } : e
                );
                
                // Update state if matching
                if (isInterrupted && interruptionData && interruptionData.id === id) {
                     setInterruptionData(data);
                }
                setEditingEvent(null);
            } else {
                // New Interruption
                setStatus('منقطعة');
                setIsInterrupted(true);
                setInterruptionData(data);
                
                // 🆕 Set Interruption Date
                updatedStages[activeStageIndex].interruptionDate = new Date().toISOString();

                const newEvent: TimelineEvent = {
                    id: `interrupt_${Date.now()}`,
                    type: 'decision',
                    date: date,
                    title: 'قرار بانقطاع السير في الدعوى 🛑',
                    details: `السبب القانوني: ${reason}\n\nالخصم المعني: ${affectedParty}\n\n${notes ? `ملاحظات: ${notes}\n\n` : ''}⚖️ *الدعوى موقوفة بحكم القانون لحين تبليغ الورثة أو من يقوم مقام الخصم.*`,
                    isNew: true
                };

                updatedStages[activeStageIndex].timeline = [newEvent, ...currentTimeline];
            }
            
            setShowInterruptionModal(false);
            setStages(updatedStages);
            saveToCloud(updatedStages);
        };

        const handleResumeInterruptionConfirm = () => {
            setStatus('نشطة');
            setIsInterrupted(false);
            setInterruptionData(null);
            
            // Add timeline event for resuming interruption
            const updatedStages = [...stages];
            
            // 🆕 Clear Interruption Date
            updatedStages[activeStageIndex].interruptionDate = undefined;

            const newEvent: TimelineEvent = {
                id: `resume_int_${Date.now()}`,
                type: 'decision',
                date: getLocalTodayYmd(),
                title: '🟢 استئناف السير (زوال سبب الانقطاع)',
                details: 'تم تبليغ من يقوم مقام الخصم أو زوال السبب القانوني للانقطاع، واستئناف السير في الدعوى من النقطة التي وقفت عندها.',
                isNew: true
            };

            updatedStages[activeStageIndex].timeline = [newEvent, ...(stageTimeline(currentStage) || [])];
            
            setStages(updatedStages);
            saveToCloud(updatedStages);
            setShowResumeInterruptionModal(false);
        };

        // ========================================
        // ABANDONMENT & WARNING RADAR LOGIC
        // ========================================
        const handleAbandonment = () => {
            const updatedStages = [...stages];
            const currentCount = currentStage.abandonmentCount || 0;
            
            if (currentCount === 0) {
                // First time allowed
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    abandonmentDate: new Date().toISOString(),
                    abandonmentCount: 1,
                    status: 'abandoned'
                };
                
                // Add timeline event
                updatedStages[activeStageIndex].timeline = [{
                    id: `abandon_${Date.now()}`,
                    type: 'decision',
                    date: getLocalTodayYmd(),
                    title: '⏸️ ترك الدعوى للمراجعة (للمرة الأولى)',
                    details: 'تم ترك الدعوى للمراجعة. يجب تجديدها خلال 10 أيام وإلا تبطل عريضتها.',
                    isNew: true
                }, ...(stageTimeline(currentStage) || [])];
                
                SmartToast.warning("تم ترك الدعوى للمراجعة - انتبه للمهلة القانونية (10 أيام)!");
            } else {
                // Second time! Fatal legal consequence.
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    isVoided: true,
                    abandonmentDate: undefined,
                    status: 'voided'
                };
                
                // Add timeline event
                updatedStages[activeStageIndex].timeline = [{
                    id: `void_${Date.now()}`,
                    type: 'decision',
                    date: getLocalTodayYmd(),
                    title: '❌ إبطال عريضة الدعوى',
                    details: 'تم إبطال عريضة الدعوى قانوناً لتركها للمراجعة للمرة الثانية.',
                    isNew: true
                }, ...(stageTimeline(currentStage) || [])];
                
                SmartToast.error("تم إبطال عريضة الدعوى قانوناً!");
            }

            setStages(updatedStages);
            saveToCloud(updatedStages);
        };

        const handleResumeAbandonment = () => {
            const updatedStages = [...stages];
            updatedStages[activeStageIndex] = {
                ...currentStage,
                abandonmentDate: undefined,
                status: 'active'
                // NOTE: We do NOT reset abandonmentCount. It remains 1.
            };

             // Add timeline event
            updatedStages[activeStageIndex].timeline = [{
                id: `resume_abandon_${Date.now()}`,
                type: 'decision',
                date: getLocalTodayYmd(),
                title: '🔄 تجديد الدعوى',
                details: 'تم تجديد الدعوى بعد تركها للمراجعة.',
                isNew: true
            }, ...(stageTimeline(currentStage) || [])];
            
            setStages(updatedStages);
            saveToCloud(updatedStages);
            SmartToast.success("تم تجديد الدعوى بنجاح");
        };
        
        // ========================================
    return {
        handleAddTask,
        handleToggleTask,
        handleAddIncidentalCase,
        handleSaveFastTrack,
        handleSaveAttachment,
        handleAddCrossAppeal,
        handleCancelCrossAppeal,
        handleJudgeRecusal,
        handleTransferJurisdiction,
        handleCaseConsolidation,
        handleAttorneyResignation,
        handleExecutionTransfer,
        handleExportPDF,
        handleMaterialErrorCorrection,
        handleResolveIncidentalCase,
        handleAddAppointment,
        handleAddAction,
        handleAddNote,
        handleAddDoc,
        handleAddPayment,
        handlePauseConfirm,
        handleResume,
        handleInterruptionToggle,
        handleExtraordinaryAppeal,
        handleProvisionalOrderConfirm,
        handleInterlocutoryAppealConfirm,
        handleInterruptionConfirm,
        handleResumeInterruptionConfirm,
        handleAbandonment,
        handleResumeAbandonment,
    };
}
