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
import { mirrorSessionNextHearingToCalendar } from '@/app/services/lawsuitTimelineCalendarMirror';
import {
    isPetitionVoidRevivalExpired,
    PETITION_VOID_APPEAL_DAYS,
    resolvePetitionVoidMenuLabel,
} from '../../smartFile/petitionVoidFlow';
import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';
import { emitDossierNotesChanged } from '@/app/services/dossier-notes/dossierNoteSyncEvents';
import { saveFileToVault } from '@/app/services/vaultUploadService';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';


export function useProceduralTimelineActions(options: UseSmartFileProceduralActionsOptions) {
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

    const lawsuitCalendarContext = () => buildLawsuitCalendarContext(parentData, calendarUserId);
    const buildTimelineVaultDocSnapshot = (doc: Record<string, unknown> | undefined) =>
        doc
            ? {
                  id: typeof doc.id === 'string' ? doc.id : '',
                  title: typeof doc.title === 'string' ? doc.title : '',
                  type: doc.type,
                  tags: Array.isArray(doc.tags) ? doc.tags : [],
                  authorId: typeof doc.authorId === 'string' ? doc.authorId : '',
                  createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : '',
                  updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : '',
                  fileSize: typeof doc.fileSize === 'number' ? doc.fileSize : 0,
                  fileName: typeof doc.fileName === 'string' ? doc.fileName : '',
                  mimeType: typeof doc.mimeType === 'string' ? doc.mimeType : '',
                  storagePath: typeof doc.storagePath === 'string' ? doc.storagePath : '',
                  signedUrl: null,
                  aiSummary: typeof doc.aiSummary === 'string' ? doc.aiSummary : null,
                  lawyerNote: typeof doc.lawyerNote === 'string' ? doc.lawyerNote : null,
                  customCategory: typeof doc.customCategory === 'string' ? doc.customCategory : null,
                  isProcessing: Boolean(doc.isProcessing),
                  boundDossierId: typeof doc.boundDossierId === 'string' ? doc.boundDossierId : null,
              }
            : undefined;

    const resolveAppointmentSubType = (purpose: string, tags: string[]): AppointmentType => {
        const blob = `${purpose} ${tags.join(' ')}`.toLowerCase();
        if (blob.includes('مرافعة')) return 'pleading';
        if (blob.includes('شهود') || blob.includes('شاهد')) return 'witness';
        if (blob.includes('قرار') || blob.includes('حكم')) return 'verdict';
        if (blob.includes('تحقيق') || blob.includes('كشف') || blob.includes('خبير')) return 'investigation';
        return 'other';
    };

    const handleAddAppointment = async (data: {
        date: string;
        title?: string;
        details?: string;
        description?: string;
        purpose?: string;
        id?: string;
        [key: string]: unknown;
    }) => {
        try {
            const isEditing = Boolean(data.id);
            const updatedStages = [...stages];
            let autoLock = false;

            if (data.purpose === 'انتخاب خبير / كشف') {
                const newTask: Task = {
                    id: `task_auto_${Date.now()}`,
                    title: `⚠️ تسديد أمانة الخبير والمصاريف لجلسة ${data.date}`,
                    dueDate: data.date,
                    isCompleted: false,
                };
                updatedStages[activeStageIndex].tasks = [newTask, ...(stageTasks(currentStage) || [])];
                SmartToast.info('تم إضافة مهمة إدارية لتسديد أجور الخبير تلقائياً');
            }

            if (data.purpose === 'استماع شهود') {
                const newTask: Task = {
                    id: `task_auto_${Date.now()}`,
                    title: `⚠️ تسديد نفقات الشهود لجلسة ${data.date}`,
                    dueDate: data.date,
                    isCompleted: false,
                };
                updatedStages[activeStageIndex].tasks = [newTask, ...(stageTasks(currentStage) || [])];
                SmartToast.info('تم إضافة مهمة إدارية لتسديد نفقات الشهود تلقائياً');
            }

            const appointmentTags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
            const apptTitle = String(data.title ?? data.purpose ?? data.description ?? '').trim();
            const apptDetails = String(data.details ?? data.description ?? '').trim();
            const appointmentSubType = resolveAppointmentSubType(
                String(data.purpose ?? apptTitle),
                appointmentTags,
            );

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
                updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) =>
                    e.id === data.id
                        ? {
                              ...e,
                              ...data,
                              type: 'appointment' as const,
                              title: apptTitle,
                              details: apptDetails,
                              subType: appointmentSubType,
                              tags: appointmentTags.length ? appointmentTags : undefined,
                          }
                        : e,
                );
                setEditingEvent(null);
            } else {
                const newApptId = `appt_${Date.now()}`;
                updatedStages[activeStageIndex].timeline = [
                    {
                        id: newApptId,
                        type: 'appointment',
                        date: data.date,
                        title: apptTitle,
                        details: apptDetails,
                        subType: appointmentSubType,
                        tags: appointmentTags.length ? appointmentTags : undefined,
                        isNew: true,
                    },
                    ...(updatedStages[activeStageIndex].timeline || []),
                ];
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

            SmartToast.success(isEditing ? 'تم تحديث الموعد بنجاح ✅' : 'تمت إضافة الموعد بنجاح ✅');
            if (autoLock) {
                SmartToast.success('تم حجز الدعوى للقرار تلقائياً بناءً على نتيجة الجلسة 🔒');
            }
        } catch (error) {
            logError('handleAddAppointment', error, data);
            SmartToast.error('حدث خطأ أثناء حفظ الموعد');
            throw error;
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
        isSessionRecord: data.isSessionRecord === true,
        isOpponentProceedings: data.isOpponentProceedings === true,
    };

    if (data.id) {
         updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) => 
            e.id === data.id ? { ...e, ...newEvent } : e
        );
        setEditingEvent(null);
    } else {
         updatedStages[activeStageIndex].timeline = [newEvent, ...stageTimeline(currentStage)];
    }

    let stagesToPersist = updatedStages;
    if (data.isSessionRecord === true) {
        const ctx = lawsuitCalendarContext();
        stagesToPersist = mirrorSessionNextHearingToCalendar(
            updatedStages,
            activeStageIndex,
            String(newEvent.id),
            typeof data.nextHearingDate === 'string' ? data.nextHearingDate : undefined,
            String(newEvent.title),
            ctx,
        );
    }

    setStages(stagesToPersist);
    saveToCloud(stagesToPersist);
    
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
    let savedNoteId = String(data.id ?? '');
    if (data.id) {
        updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) => 
            e.id === data.id ? { ...e, type: 'note', title: noteTitle, details: noteDetails, tags: noteTags } : e
        );
        setEditingEvent(null);
    } else {
        savedNoteId = `note_${Date.now()}`;
        updatedStages[activeStageIndex].timeline = [{
            id: savedNoteId,
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

    if (savedNoteId) {
        emitDossierNotesChanged({
            dossierId: String(parentData.id ?? ''),
            dossierKind: 'lawsuit',
            noteId: savedNoteId,
        });
    }

    if (autoLock) {
        SmartToast.success("تم حجز الدعوى للقرار تلقائياً 🔒");
    }
};

const handleAddDoc = async (data: { title: string; file: File | string | null; notes?: string; date: string; [key: string]: unknown }) => {
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
        const title = String(data.title ?? '').trim();
        const noteBody = String(data.details ?? data.notes ?? '').trim();
        const file =
            typeof File !== 'undefined' && data.file instanceof File ? data.file : null;
        const fileName =
            (typeof data.fileName === 'string' && data.fileName.trim()) ||
            file?.name ||
            title;
        const fileType =
            (typeof data.fileType === 'string' && data.fileType.trim()) ||
            file?.type ||
            '';
        const ctx = lawsuitCalendarContext();
        let attachmentDocId: string | undefined;
        let savedVaultDoc: Record<string, unknown> | undefined;
        const priorEvent = data.id
            ? stageTimeline(currentStage).find((e: TimelineEvent) => e.id === data.id)
            : null;
        const priorMeta = (priorEvent?.metadata as Record<string, unknown> | undefined) ?? {};
        const priorAttachmentDocId =
            typeof priorMeta.attachmentDocId === 'string' ? priorMeta.attachmentDocId : undefined;

        if (!data.id && !file) {
            SmartToast.error('اختر ملف المستند أولاً');
            return;
        }

        if (file && ctx.userId) {
            const saved = await saveFileToVault(ctx.userId, file, {
                title,
                customCategory: typeof data.category === 'string' ? data.category : null,
                fileName,
                lawyerNote: noteBody || null,
            });
            attachmentDocId = saved.doc.id;
            savedVaultDoc = buildTimelineVaultDocSnapshot(saved.doc);
        }
        
        const docCategory = data.category as DocumentCategory | undefined;
        const evidentiaryWeight = data.evidentiaryWeight as TimelineEvent['evidentiaryWeight'];
        if (data.id) {
            updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) => 
                e.id === data.id ? {
                    ...e,
                    type: 'document',
                    title,
                    details: [`نوع المستند: ${String(docCategory ?? '').trim() || 'عام'}`, fileName ? `الملف: ${fileName}` : '', noteBody]
                        .filter(Boolean)
                        .join('\n'),
                    docCategory,
                    evidentiaryWeight,
                    metadata: {
                        ...(typeof e.metadata === 'object' && e.metadata ? e.metadata : {}),
                        attachmentDocId: attachmentDocId ?? (e.metadata as Record<string, unknown> | undefined)?.attachmentDocId,
                        fileName,
                        fileType,
                        vaultDoc: savedVaultDoc ?? (e.metadata as Record<string, unknown> | undefined)?.vaultDoc,
                    },
                } : e
            );
            setEditingEvent(null);
            if (file && priorAttachmentDocId && attachmentDocId && priorAttachmentDocId !== attachmentDocId && ctx.userId) {
                void SmartVaultDB.deleteDoc(priorAttachmentDocId, ctx.userId).catch(() => undefined);
            }
            SmartToast.success('تم تحديث المستند بنجاح ✅');
        } else {
            updatedStages[activeStageIndex].timeline = [{
                id: `doc_${Date.now()}`,
                type: 'document',
                date: String(data.date || getLocalTodayYmd()),
                title,
                details: [`نوع المستند: ${String(docCategory ?? '').trim() || 'عام'}`, fileName ? `الملف: ${fileName}` : '', noteBody]
                    .filter(Boolean)
                    .join('\n'),
                docCategory,
                evidentiaryWeight,
                metadata: {
                    attachmentDocId,
                    fileName,
                    fileType,
                    vaultDoc: savedVaultDoc,
                },
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


    return {
        handleAddAppointment,
        handleAddAction,
        handleAddNote,
        handleAddDoc,
        handleAddPayment,
    };
}
