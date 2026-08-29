import type { DocumentCategory, TimelineEvent } from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    validateDocumentData,
    validatePaymentData,
} from '@/app/utils/validationUtils';
import { logError } from '@/app/utils/errorLog';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { emitDossierNotesChanged } from '@/app/services/dossier-notes/dossierNoteSyncEvents';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import { stageTimeline } from '../../smartFile/proceduralTypes';
import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';
import {
    buildTimelineVaultDocSnapshot,
    textImpliesPleadingsClosed,
} from './proceduralTimelineHelpers';

export function createProceduralTimelineNoteDocPaymentHandlers(
    options: UseSmartFileProceduralActionsOptions,
) {
    const {
        stages,
        setStages,
        activeStageIndex,
        currentStage,
        parentData,
        setParentData,
        saveToCloud,
        setEditingEvent,
        calendarUserId,
    } = options;

    const lawsuitCalendarContext = () => buildLawsuitCalendarContext(parentData, calendarUserId);

    const handleAddNote = (data: { text: string; date: string; [key: string]: unknown }) => {
        const updatedStages = [...stages];
        let autoLock = false;

        const noteTitle = String(data.title ?? '');
        const noteDetails = String(data.details ?? data.text ?? '');
        if (textImpliesPleadingsClosed(noteTitle, noteDetails)) {
            updatedStages[activeStageIndex].isPleadingsClosed = true;
            autoLock = true;
        }

        const noteTags = Array.isArray(data.tags) ? (data.tags as string[]) : undefined;
        let savedNoteId = String(data.id ?? '');
        if (data.id) {
            updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) =>
                e.id === data.id
                    ? { ...e, type: 'note', title: noteTitle, details: noteDetails, tags: noteTags }
                    : e,
            );
            setEditingEvent(null);
        } else {
            savedNoteId = `note_${Date.now()}`;
            updatedStages[activeStageIndex].timeline = [
                {
                    id: savedNoteId,
                    type: 'note',
                    date: getLocalTodayYmd(),
                    title: noteTitle,
                    details: noteDetails,
                    tags: noteTags,
                    isNew: true,
                },
                ...stageTimeline(currentStage),
            ];
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
            SmartToast.success('تم حجز الدعوى للقرار تلقائياً 🔒');
        }
    };

    const handleAddDoc = async (data: {
        title: string;
        file: File | string | null;
        notes?: string;
        date: string;
        [key: string]: unknown;
    }) => {
        try {
            // ✅ Validation
            const validation = validateDocumentData({
                docName: data.title,
                docType: data.category,
                date: data.date || getLocalTodayYmd(),
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
                const { saveFileToVault } = await import('@/app/services/vaultUploadService');
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
                updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map(
                    (e: TimelineEvent) =>
                        e.id === data.id
                            ? {
                                  ...e,
                                  type: 'document',
                                  title,
                                  details: [
                                      `نوع المستند: ${String(docCategory ?? '').trim() || 'عام'}`,
                                      fileName ? `الملف: ${fileName}` : '',
                                      noteBody,
                                  ]
                                      .filter(Boolean)
                                      .join('\n'),
                                  docCategory,
                                  evidentiaryWeight,
                                  metadata: {
                                      ...(typeof e.metadata === 'object' && e.metadata ? e.metadata : {}),
                                      attachmentDocId:
                                          attachmentDocId ??
                                          (e.metadata as Record<string, unknown> | undefined)
                                              ?.attachmentDocId,
                                      fileName,
                                      fileType,
                                      vaultDoc:
                                          savedVaultDoc ??
                                          (e.metadata as Record<string, unknown> | undefined)?.vaultDoc,
                                  },
                              }
                            : e,
                );
                setEditingEvent(null);
                if (
                    file &&
                    priorAttachmentDocId &&
                    attachmentDocId &&
                    priorAttachmentDocId !== attachmentDocId &&
                    ctx.userId
                ) {
                    void import('@/app/services/vault/smartVaultRuntime')
                        .then((m) => m.SmartVaultDB.deleteDoc(priorAttachmentDocId, ctx.userId))
                        .catch(() => undefined);
                }
                SmartToast.success('تم تحديث المستند بنجاح ✅');
            } else {
                updatedStages[activeStageIndex].timeline = [
                    {
                        id: `doc_${Date.now()}`,
                        type: 'document',
                        date: String(data.date || getLocalTodayYmd()),
                        title,
                        details: [
                            `نوع المستند: ${String(docCategory ?? '').trim() || 'عام'}`,
                            fileName ? `الملف: ${fileName}` : '',
                            noteBody,
                        ]
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
                        isNew: true,
                    },
                    ...stageTimeline(currentStage),
                ];
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
                feesPaid: Number(parentData.feesPaid) + amount,
            };
            setParentData(updatedParent);

            // Add timeline event to current stage
            const updatedStages = [...stages];
            updatedStages[activeStageIndex].timeline = [
                {
                    id: `pay_${Date.now()}`,
                    type: 'note',
                    date: date,
                    title: 'دفعة مالية مستلمة',
                    details: `تم استلام مبلغ ${amount.toLocaleString()} د.ع كجزء من الأتعاب.`,
                    isNew: true,
                },
                ...stageTimeline(currentStage),
            ];

            setStages(updatedStages);
            saveToCloud(updatedStages, updatedParent);
            SmartToast.success(`تم تسجيل دفعة ${amount.toLocaleString()} د.ع بنجاح ✅`);
        } catch (error) {
            logError('handleAddPayment', error, { amount, date });
            SmartToast.error('حدث خطأ أثناء تسجيل الدفعة');
        }
    };

    return {
        handleAddNote,
        handleAddDoc,
        handleAddPayment,
    };
}
