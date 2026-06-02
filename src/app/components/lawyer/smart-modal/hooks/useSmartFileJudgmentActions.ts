import type { Dispatch, SetStateAction } from 'react';
import type { CaseStage, Party, TimelineEvent } from '../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { validateJudgmentData } from '@/app/utils/validationUtils';
import { logError } from '@/app/utils/errorHandler';
import { debug } from '@/app/utils/debug';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { applyStageTransition } from '../smartFile/stageTransition';
import type { SmartFileParentData } from '../smartFile/parentDataInit';
import type {
    AppealTransitionPayload,
    CrossAppealPayload,
    JudgmentPayload,
    SmartFileAttachment,
    StageTransitionPayload,
} from '../smartFile/judgmentTypes';
import {
    addDaysYmd,
    parseJudgmentDateInput,
    prependTimeline,
    stageAttachments,
    str,
} from '../smartFile/judgmentTypes';

type SaveToCloud = (
    updatedStages: CaseStage[],
    updatedParent?: SmartFileParentData,
    stageIndex?: number,
) => void;

export type UseSmartFileJudgmentActionsOptions = {
    stages: CaseStage[];
    setStages: Dispatch<SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    setActiveStageIndex: Dispatch<SetStateAction<number>>;
    setViewingStageIndex: Dispatch<SetStateAction<number>>;
    currentStage: CaseStage;
    parentData: SmartFileParentData;
    saveToCloud: SaveToCloud;
    setStatus: Dispatch<SetStateAction<string>>;
    tempJudgmentData: JudgmentPayload | null;
    setTempJudgmentData: (v: JudgmentPayload | null) => void;
    setShowAppealTransitionModal: (v: boolean) => void;
    setShowObjectionRegistrationModal: (v: boolean) => void;
    setShowJudgmentModal: (v: boolean) => void;
    setShowCrossAppealModal: (v: boolean) => void;
    setShowTransitionModal: (v: boolean) => void;
};

export function useSmartFileJudgmentActions(options: UseSmartFileJudgmentActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        parentData,
        saveToCloud,
        setStatus,
        tempJudgmentData,
        setTempJudgmentData,
        setShowAppealTransitionModal,
        setShowObjectionRegistrationModal,
        setShowJudgmentModal,
        setShowCrossAppealModal,
        setShowTransitionModal,
    } = options;

        // CRITICAL: SMART JUDGMENT HANDLER (Time & State Engine)
        // ========================================
        const handleJudgmentConfirm = (judgmentData: JudgmentPayload) => {
            try {
                const validation = validateJudgmentData(judgmentData);
                if (!validation.valid) {
                    SmartToast.error(validation.error || 'بيانات الحكم غير صحيحة');
                    return;
                }

                const action = str(judgmentData.action);
                const judgmentType = str(judgmentData.judgmentType);
                const judgmentForm = str(judgmentData.judgmentForm);
                const judgmentDate = str(judgmentData.judgmentDate);
                const notes = str(judgmentData.notes);
                const nextStage = str(judgmentData.nextStage);
                const openAppealTransitionModal = Boolean(judgmentData.openAppealTransitionModal);

                debug.log('⚖️ بدء معالجة قرار الحكم:', action);

                if (openAppealTransitionModal) {
                    debug.log('🔄 فتح نافذة بوابة الطعن...');
                    setTempJudgmentData(judgmentData);
                    setShowAppealTransitionModal(true);
                    return;
                }

            const updatedStages = [...stages];
            const now = parseJudgmentDateInput(judgmentDate);
            const addDays = (date: Date, days: number) => addDaysYmd(date, days);
            const stageName = currentStage.stageName ?? '';

            // ========================================
            // SCENARIO 1: تجميد وانتظار (Waiting for Appeal / Default Objection)
            // ========================================
            if (action === 'waiting_for_appeal') {
                // Calculate Appeal Deadline
                let appealDeadline = undefined;
                if (judgmentForm === 'غيابي') {
                    appealDeadline = addDays(now, 10);
                } else if (judgmentForm === 'حضوري' && stageName.includes('البداءة')) {
                     appealDeadline = addDays(now, 15);
                }

                // Determine Decision Text based on Type
                let decisionText = `محسومة - بانتظار الطعن (${judgmentType})`;
                if (judgmentType === 'إجابة الدعوى' || judgmentType === 'إجابة الدعوى بالكامل') decisionText = 'محسومة لصالح الموكل - بانتظار الطعن';
                else if (judgmentType === 'رد الدعوى' || judgmentType === 'رد الدعوى كلياً') decisionText = 'محسومة ضد الموكل - بانتظار الطعن';
                else if (judgmentType === 'رد الدعوى جزئياً') decisionText = 'محسومة جزئياً - بانتظار الطعن';

                // Mark current stage as completed
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    status: 'completed',
                    finalDecision: decisionText,
                    judgmentForm:
                        judgmentForm === 'غيابي' || judgmentForm === 'حضوري'
                            ? judgmentForm
                            : undefined,
                    lastJudgmentType:
                        judgmentForm === 'غيابي' || judgmentForm === 'حضوري'
                            ? judgmentForm
                            : undefined,
                    decisionDate: judgmentDate,
                    isPleadingsClosed: true, 
                    appealDeadline: appealDeadline,
                    legalTimers: {
                        appealDeadline: appealDeadline || addDays(now, 15),
                        cassationDeadline: addDays(now, 30),
                        defaultObjectionDeadline: judgmentForm === 'غيابي' ? addDays(now, 10) : undefined
                    }
                };

                // Add timeline event
                updatedStages[activeStageIndex].timeline = [{
                    id: `judgment_${Date.now()}`,
                    type: 'decision',
                    date: judgmentDate,
                    title: `✅ حكم بـ ${judgmentType} (${judgmentForm})`,
                    details: `${notes}\n\n⚖️ صدر الحكم بـ "${judgmentType}".\n⏳ الحالة: بانتظار انتهاء المدة القانونية للطعن.\n\n📅 مواعيد الطعن القانونية:\n- الاستئناف: متاح حتى ${addDays(now, 15)}\n- التمييز: متاح حتى ${addDays(now, 30)}`,
                    isNew: true
                }, ...(currentStage.timeline ?? [])];

                debug.log(`✅ المرحلة "${stageName}" تم ختمها كـ "${decisionText}"`);

                // 🔥 NEW: Check for Auto-Objection Trigger (from SmartJudgmentModal)
                // If user clicked "Save and Object", we open the objection modal now.
                if (judgmentData.openObjectionModal) {
                    setTimeout(() => setShowObjectionRegistrationModal(true), 500);
                }
            }

            // ========================================
            // SCENARIO 2: مراجعة (Left for Review) - LEGACY SUPPORT ONLY
            // ========================================
            else if (action === 'archive_review') {
                // ... existing logic ...
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    status: 'completed',
                    finalDecision: 'متروكة للمراجعة',
                    decisionDate: judgmentDate,
                    legalTimers: {
                        reviewDeadline: addDays(now, 10)
                    }
                };

                updatedStages[activeStageIndex].timeline = [{
                    id: `judgment_${Date.now()}`,
                    type: 'decision',
                    date: judgmentDate,
                    title: '🔄 قرار بترك الدعوى للمراجعة',
                    details: `${notes}\n\n⚠️ الدعوى متروكة للمراجعة.\n⏳ سيتم الإبطال التلقائي إذا لم تتم المراجعة خلال:\n\n📅 موعد المراجعة النهائي: ${addDays(now, 10)}`,
                    isNew: true
                }, ...(currentStage.timeline ?? [])];
            }

            // ========================================
            // SCENARIO 3: إبطال (Annulled)
            // ========================================
            else if (action === 'archive_annulled') {
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    status: 'completed',
                    finalDecision: 'مبطلة',
                    decisionDate: judgmentDate
                };

                updatedStages[activeStageIndex].timeline = [{
                    id: `judgment_${Date.now()}`,
                    type: 'decision',
                    date: judgmentDate,
                    title: '⚫ قرار بإبطال الدعوى',
                    details: `${notes}\n\n⚖️ تم إبطال الدعوى رسمياً.\n📁 الملف تم أرشفته كدعوى ملغاة.`,
                    isNew: true
                }, ...(currentStage.timeline ?? [])];
            }

            // ========================================
            // 🔥 NEW SCENARIO 3.5: NON-MERIT TERMINATIONS (النهايات الرضائية)
            // ========================================
            else if (action === 'finalize_non_merit') {
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    status: 'completed',
                    finalDecision: 'مكتسبة الدرجة القطعية',
                    decisionDate: judgmentDate,
                    isPleadingsClosed: true
                };

                let titleText = '📜 ';
                let detailsText = '';

                if (judgmentType === 'تصديق الصلح والتسوية') {
                    titleText += 'تصديق الصلح والتسوية (مكتسبة الدرجة القطعية)';
                    detailsText = `${notes}\n\n✅ تم تصديق الصلح بين الأطراف.\n🏛️ يعتبر تصديق الصلح بمثابة حكم مكتسب الدرجة القطعية.\n🔒 لا يقبل أي طعن (مادة 455 مرافعات).`;
                } else if (judgmentType === 'التنازل عن الدعوى') {
                    titleText += 'التنازل عن الدعوى (مكتسبة الدرجة القطعية)';
                    detailsText = `${notes}\n\n✅ تنازل المدعي عن دعواه.\n🏛️ يعتبر التنازل إنهاءً نهائياً للدعوى.\n🔒 لا يقبل أي طعن.`;
                } else if (judgmentType === 'إبطال عريضة الدعوى') {
                    titleText += 'إبطال عريضة الدعوى (مكتسبة الدرجة القطعية)';
                    detailsText = `${notes}\n\n⚫ تم إبطال عريضة الدعوى قانوناً.\n🏛️ إنهاء نهائي للدعوى.\n🔒 لا يقبل أي طعن.`;
                }

                updatedStages[activeStageIndex].timeline = [{
                    id: `non_merit_${Date.now()}`,
                    type: 'milestone',
                    date: judgmentDate,
                    title: titleText,
                    details: detailsText,
                    isNew: true,
                    color: 'emerald'
                }, ...(currentStage.timeline ?? [])];

                // Update parent status
                setStatus('مكتسبة الدرجة القطعية');

                SmartToast.success(`تم إنهاء الدعوى: ${judgmentType} ✅`);
            }

            // ========================================
            // SCENARIO 4: الانتقال للمرحلة الأخرى (Transition) - DYNAMIC
            // ========================================
            else if (action === 'transition') {
                debug.log('🔄 بدء عملية الانتقال للمرحلة التالية...');
                
                // Determine Decision Text based on Type
                let decisionText = `انتقال للمرحلة التالية (${judgmentType})`;
                let timelineTitle = `➡️ حكم بـ ${judgmentType} والانتقال`;
                
                if (judgmentType === 'إجابة الدعوى' || judgmentType === 'إجابة الدعوى بالكامل') {
                    decisionText = 'إجابة الدعوى (حكم لصالح الموكل)';
                    timelineTitle = '✅ حكم بإجابة الدعوى (حكم لصالح الموكل)';
                } else if (judgmentType === 'رد الدعوى' || judgmentType === 'رد الدعوى كلياً') {
                    decisionText = 'رد الدعوى (حكم ضد الموكل)';
                    timelineTitle = '❌ حكم برد الدعوى (حكم ضد الموكل)';
                } else if (judgmentType === 'رد الدعوى جزئياً') {
                    decisionText = 'رد الدعوى جزئياً (حكم جزئي)';
                    timelineTitle = '⚠️ حكم برد الدعوى جزئياً';
                }

                // STEP 1: Archive Current Stage
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    status: 'locked', 
                    finalDecision: decisionText, // ✅ DYNAMIC DECISION
                    decisionDate: judgmentDate,
                    judgmentForm: judgmentForm
                };

                // Add judgment event to archived stage
                updatedStages[activeStageIndex].timeline = [{
                    id: `judgment_${Date.now()}`,
                    type: 'decision',
                    date: judgmentDate,
                    title: timelineTitle, // ✅ DYNAMIC TITLE
                    details: `${notes}\n\n⚖️ صدر الحكم بـ "${judgmentType}".\n➡️ تم الانتقال مباشرة للمرحلة القادمة: ${nextStage}\n\n📁 تم أرشفة هذه المرحلة وحفظها كملف فرعي.`,
                    isNew: true
                }, ...(currentStage.timeline ?? [])];

                debug.log(`📁 تم أرشفة مرحلة "${currentStage.stageName}" بالكامل`);

                // STEP 2: Wipe Parties (As requested by user)
                // No carrying over names or roles. Completely blank slate.
                const newParties: Party[] = [
                    { id: Date.now(), role: 'صفة اطرف الأول', name: '', isClient: true, side: 'right' },
                    { id: Date.now() + 1, role: 'صفة الطرف الثاني', name: '', isClient: false, side: 'left' },
                ];

                debug.log(`✨ تم تصفية أطراف الدعوى للمرحلة الجديدة: "${nextStage}"`);

                // STEP 4: CREATE THE NEW CLEAN SLATE STAGE (Child File)
                const newStageId = `stage_${Date.now()}`;
                const newStageObject: CaseStage = {
                    id: newStageId,
                    name: nextStage,
                    stageName: nextStage,
                    type: currentStage.type,
                    caseNo: '',
                    court: '',
                    judge: '',
                    timeline: [],
                    tasks: [],
                    incidentalCases: [],
                    parties: newParties,
                    createdDate: getLocalTodayYmd(),
                    finalDecision: null,
                    decisionDate: null,
                    status: 'active',
                };

                debug.log(`✨ تم إنشاء مرحلة جديدة نظيفة: "${nextStage}"`);
                debug.log('📋 Timeline الجديد فارغ تماماً:', newStageObject.timeline?.length === 0);

                updatedStages.push(newStageObject);
                setActiveStageIndex(updatedStages.length - 1);

                // STEP 6: CRITICAL - Dynamic Stepper Update
                // Instead of searching by name, we rebuild stepper from actual stages
                // This allows for infinite custom stage names (e.g., "إعادة المحاكمة", "التنفيذ")
                debug.log(`🎯 تم تفعيل المرحلة الجديدة: \"${nextStage}\" بشكل ديناميكي`);
                debug.log(`📊 عدد المراحل الكلي: ${updatedStages.length}`);
            }

            // ========================================
            // SCENARIO 5: رد الدعوى -> انتهاء الدعوى تماماً (Final Close)
            // ========================================
            else if (action === 'final_close') {
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    status: 'completed',
                    finalDecision: 'منتهية نهائياً (30 يوم للطعن)',
                    decisionDate: judgmentDate,
                    // ✨ INJECT FINAL APPEAL TIMER
                    legalTimers: {
                        finalAppealDeadline: addDays(now, 30)
                    }
                };

                updatedStages[activeStageIndex].timeline = [{
                    id: `judgment_${Date.now()}`,
                    type: 'decision',
                    date: judgmentDate,
                    title: '🛑 انتهاء الدعوى نهائياً (حكم برد الدعوى)',
                    details: `${notes}\n\n❌ تم رد الدعوى.\n⚠️ الدعوى في مرحلة الإغلاق النهائي.\n\n⏰ مدة 30 يوماً للطعن تبدأ من تاريخ الحكم.\n📅 الموعد النهائي للطعن: ${addDays(now, 30)}\n\n🔒 سيتم إغلاق الملف نهائياً بعد انقضاء المدة القانونية.`,
                    isNew: true
                }, ...(currentStage.timeline ?? [])];

                // Also update the PARENT status
                setStatus('منتهية');

                debug.log(`🛑 الدعوى منتهية نهائياً. موعد الطعن النهائي: ${addDays(now, 30)}`);
            }

            // ========================================
            // SCENARIO 6: CASSATION - FINAL RATIFICATION (التصديق والدرجة القطعية)
            // ========================================
            else if (action === 'final_ratification') {
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    status: 'completed', // Locked and done
                    finalDecision: 'مكتسبة الدرجة القطعية',
                    decisionDate: judgmentDate,
                    isPleadingsClosed: true
                };

                updatedStages[activeStageIndex].timeline = [{
                    id: `cassation_final_${Date.now()}`,
                    type: 'milestone', // Golden event
                    date: judgmentDate,
                    title: '🏛️ تم تصديق الحكم واكتساب الدعوى الدرجة القطعية',
                    details: `${notes}\n\n🎉 صدق محكمة التمييز الحكم المطعون فيه.\n✅ اكتسب الحكم الدرجة القطعية ولا يقبل أي طعن آخر (إلا تصحيح القرار في حالات نادرة).\n🔒 تم غلق ملف الدعوى نهائياً.`,
                    isNew: true,
                    color: 'gold' // Make it shine
                }, ...(currentStage.timeline ?? [])];
                
                // Also update the PARENT status
                setStatus('مكتسبة الدرجة القطعية');
                
                SmartToast.success("مبروك! اكتسب الحكم الدرجة القطعية");
            }

            // ========================================
            // SCENARIO 7: CASSATION - REMAND (نقض وإعادة)
            // ========================================
            else if (action === 'remand_to_lower') {
                // We keep it active because work continues (in the lower court, but tracked here for now)
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    status: 'active',
                    finalDecision: 'منقوضة ومعادة (بانتظار المرافعة بعد النقض)',
                    decisionDate: judgmentDate
                };

                updatedStages[activeStageIndex].timeline = [{
                    id: `cassation_remand_${Date.now()}`,
                    type: 'alert', // Red/Amber event
                    date: judgmentDate,
                    title: '⚠️ تم نقض الحكم التمييزي وإعادة الإضبارة',
                    details: `${notes}\n\n↩️ قررت محكمة التمييز نقض الحكم وإعادة الإضبارة للمحكمة المختصة.\n📢 يجب متابعة تحديد موعد المرافعة الجديد لاتباع القرار التمييزي.`,
                    isNew: true,
                    color: 'red'
                }, ...(currentStage.timeline ?? [])];

                SmartToast.error("تم نقض الحكم! استعد لجولات جديدة");
            }

            // ========================================
            // SCENARIO 8: CASSATION - CORRECTION REQUEST (تصحيح القرار)
            // ========================================
            else if (action === 'correction_request') {
                 // Just a timeline event, stage remains active/waiting
                updatedStages[activeStageIndex].timeline = [{
                    id: `cassation_correction_${Date.now()}`,
                    type: 'milestone',
                    date: judgmentDate,
                    title: '📝 تم تقديم طلب تصحيح قرار تمييزي',
                    details: `${notes}\n\n⚠️ تم تقديم طلب لتصحيح الخطأ القانوني في القرار التمييزي.\n⏳ بانتظار نتيجة التدقيق.`,
                    isNew: true,
                    color: 'blue'
                }, ...(currentStage.timeline ?? [])];
                
                SmartToast.info("تم تسجيل طلب تصحيح القرار");
            }

            // ========================================
            // 🔥 CRITICAL: AUTOMATED JUDGMENT SYNCHRONIZATION (Article 245)
            // Automatically Update Attachment Status Based on Judgment
            // ========================================
            const attachmentList = stageAttachments(currentStage);
            if (attachmentList.length > 0) {
                const activeAttachments = attachmentList.filter((a) => a.isActive);
                
                if (activeAttachments.length > 0) {
                    debug.log('🔒 درع الحجز: بدء التحديث التلقائي بناءً على الحكم...');
                    
                    const isPlaintiffWin = judgmentType === 'إجابة الدعوى' || 
                                          judgmentType === 'إجابة الدعوى بالكامل' ||
                                          judgmentType === 'إجابة الدعوى جزئياً';
                                          
                    const isPlaintiffLoss = judgmentType === 'رد الدعوى' || 
                                           judgmentType === 'رد الدعوى كلياً';
                    
                    updatedStages[activeStageIndex].attachments = attachmentList.map((attachment: SmartFileAttachment) => {
                        if (!attachment.isActive) return attachment; // Skip inactive ones
                        
                        let newStatus = attachment.status;
                        let syncNote = '';
                        
                        if (isPlaintiffWin) {
                            newStatus = 'مصدق تلقائياً ✅';
                            syncNote = 'تأكيد: الحكم لصالح المدعي يتضمن تصديق الحجز (المادة 245)';
                            debug.log('✅ الحجز تم تصديقه تلقائياً - حكم لصالح المدعي');
                        } else if (isPlaintiffLoss) {
                            newStatus = 'مرفوع تلقائياً ❌';
                            syncNote = 'تأكيد: الحكم برد الدعوى يتضمن رفع الحجز (المادة 245)';
                            debug.log('❌ الحجز تم رفعه تلقائياً - حكم برد الدعوى');
                        }
                        
                        // Add sync timeline event
                        if (syncNote) {
                            const stageRef = updatedStages[activeStageIndex]!;
                            stageRef.timeline = prependTimeline(stageRef, {
                                id: `attach_sync_${Date.now()}_${attachment.id}`,
                                type: 'action',
                                date: judgmentDate,
                                title: `🔒 ${syncNote}`,
                                details: `المال المحجوز: ${attachment.attachedProperty}\nالحالة الجديدة: ${newStatus}`,
                                isAttachment: true,
                                attachmentStatus: newStatus,
                                isNew: true,
                            });
                        }
                        
                        return {
                            ...attachment,
                            status: newStatus,
                            isActive: isPlaintiffWin, // Keep active only if ratified
                            judgmentSyncDate: judgmentDate,
                            judgmentSyncNote: syncNote
                        };
                    });
                    
                    debug.log('🔒 درع الحجز: اكتمل التحديث التلقائي ✓');
                }
            }

            // ========================================
            // SAVE & CLOSE
            // ========================================
            setStages(updatedStages);
            saveToCloud(updatedStages, parentData);
            setShowJudgmentModal(false);

            debug.log('✅ تم حفظ قرار الحكم بنجاح');
            SmartToast.success('تم حفظ قرار الحكم بنجاح ⚖️');
            } catch (error) {
                logError('handleJudgmentConfirm', error, judgmentData);
                SmartToast.error('حدث خطأ أثناء حفظ قرار الحكم');
            }
        };

        // ========================================
        // 🔥 NEW: APPEAL TRANSITION HANDLER (بوابة الطعن)
        // ========================================
        const handleAppealTransition = (appealData: AppealTransitionPayload) => {
            debug.log('🔄 بدء معالجة الانتقال للطعن:', appealData);

            if (!tempJudgmentData) {
                debug.error('❌ خطأ: لا توجد بيانات حكم مؤقتة');
                return;
            }

            const judgmentType = str(tempJudgmentData.judgmentType);
            const judgmentForm = str(tempJudgmentData.judgmentForm);
            const judgmentDate = str(tempJudgmentData.judgmentDate);
            const judgmentNotes = str(tempJudgmentData.notes);
            const { appealType, appellant, filingDate, newCaseNumber, notes: appealNotes } = appealData;

            const updatedStages = [...stages];
            const now = parseJudgmentDateInput(judgmentDate);

            // Determine Decision Text based on Type
            let decisionText = `انتقال لمرحلة ${appealType} (${judgmentType})`;
            let timelineTitle = `➡️ حكم بـ ${judgmentType} والانتقال`;
            
            if (judgmentType === 'إجابة الدعوى' || judgmentType === 'إجابة الدعوى بالكامل') {
                decisionText = 'إجابة الدعوى (حكم لصالح الموكل)';
                timelineTitle = '✅ حكم بإجابة الدعوى (حكم لصالح الموكل)';
            } else if (judgmentType === 'رد الدعوى' || judgmentType === 'رد الدعوى كلياً') {
                decisionText = 'رد الدعوى (حكم ضد الموكل)';
                timelineTitle = '❌ حكم برد الدعوى (حكم ضد الموكل)';
            } else if (judgmentType === 'رد الدعوى جزئياً') {
                decisionText = 'رد الدعوى جزئياً (حكم جزئي)';
                timelineTitle = '⚠️ حكم برد الدعوى جزئياً';
            }

            // STEP 1: Archive Current Stage
            updatedStages[activeStageIndex] = {
                ...currentStage,
                status: 'locked', 
                finalDecision: decisionText,
                decisionDate: judgmentDate,
                judgmentForm: judgmentForm === 'غيابي' || judgmentForm === 'حضوري' ? judgmentForm : undefined,
                previousCaseNumber: currentStage.caseNo,
            };

            // Add judgment event to archived stage
            updatedStages[activeStageIndex].timeline = [{
                id: `judgment_${Date.now()}`,
                type: 'decision',
                date: judgmentDate,
                title: timelineTitle,
                details: `${judgmentNotes}\n\n⚖️ صدر الحكم بـ "${judgmentType}".\n➡️ تم الطعن في الحكم والانتقال لمرحلة ${appealType}\n\n📋 تفاصيل الطعن:\n- مقدم الطعن (المستأنف): ${appellant}\n- رقم دعوى ${appealType}: ${newCaseNumber}\n- تاريخ تقديم اللائحة: ${filingDate}\n\n📁 تم أرشفة هذه المرحلة وحفظها كملف فرعي.`,
                isNew: true
            }, ...(currentStage.timeline ?? [])];

            debug.log(`📁 تم أرشفة مرحلة "${currentStage.stageName}" بالكامل`);

            // STEP 2: Role Flipping (انقلاب المراكز القانونية)
            // 🔥 DYNAMIC ROLE TERMINOLOGY (Cassation vs Appeal)
            const isCassation = appealType === 'تمييز';
            const appellantTitle = isCassation ? 'المميز' : 'المستأنف';
            const appelleeTitle = isCassation ? 'المميز عليه' : 'المستأنف عليه';

            const parties = currentStage.parties ?? [];
            const newParties = parties.map((party) => {
                let newRole = party.role;
                
                // Determine new roles based on who filed the appeal
                if (appellant === 'المدعي') {
                    // Plaintiff filed appeal
                    if (party.role === 'المدعي' || party.role.includes('مدعي')) {
                        newRole = `${appellantTitle} (المدعي)`;
                    } else if (party.role === 'المدعى عليه' || party.role.includes('مدعى عليه')) {
                        newRole = `${appelleeTitle} (المدعى عليه)`;
                    }
                } else {
                    // Defendant filed appeal
                    if (party.role === 'المدعى عليه' || party.role.includes('مدعى عليه')) {
                        newRole = `${appellantTitle} (المدعى عليه)`;
                    } else if (party.role === 'المدعي' || party.role.includes('مدعي')) {
                        newRole = `${appelleeTitle} (المدعي)`;
                    }
                }

                return {
                    ...party,
                    role: newRole,
                    name: '' // 🔥 CRITICAL: Wipe names as requested
                };
            });

            debug.log(`✨ تم انقلاب المراكز القانونية - المستأنف: ${appellant}`);

            // STEP 3: CREATE THE NEW CLEAN SLATE STAGE (Child File)
            const newStageId = `stage_${Date.now()}`;
            const appealStageName = appealType === 'استئناف' ? 'الاستئناف' : 'التمييز';
            const newStageObject: CaseStage = {
                id: newStageId,
                name: appealStageName,
                stageName: appealStageName,
                type: currentStage.type,
                caseNo: newCaseNumber,
                court: '',
                judge: '',
                timeline: [
                    {
                        id: `appeal_filed_${Date.now()}`,
                        type: 'milestone',
                        date: filingDate,
                        title: `🚀 تم الطعن بالقرار وانتقال الدعوى إلى مرحلة ${appealType}`,
                        details: `تم تقديم لائحة ${appealType} برقم ${newCaseNumber}\n\nمقدم الطعن: ${appellant}\n${appealNotes ? `\nملاحظات: ${appealNotes}` : ''}`,
                        isNew: true,
                    },
                ],
                tasks: [],
                incidentalCases: [],
                parties: newParties,
                createdDate: filingDate,
                finalDecision: null,
                decisionDate: null,
                status: 'active',
                appealMetadata: {
                    appealType,
                    appellant,
                    filingDate,
                    previousCaseNumber: currentStage.caseNo,
                    previousStage: currentStage.stageName,
                    hasCrossAppeal: false,
                },
            };

            debug.log(`✨ تم إنشاء مرحلة جديدة نظيفة: "${appealType}"`);
            debug.log('📋 Timeline الجديد فارغ تماماً:', newStageObject.timeline?.length === 1);
            debug.log('👥 الأطراف بعد انقلاب المراكز:', newParties.map((p) => p.role).join(', '));

            updatedStages.push(newStageObject);
            setActiveStageIndex(updatedStages.length - 1);
            setViewingStageIndex(updatedStages.length - 1);

            // STEP 5: Save & Close
            setStages(updatedStages);
            saveToCloud(updatedStages, parentData);
            setShowAppealTransitionModal(false);
            setTempJudgmentData(null);

            SmartToast.success(`تم الانتقال بنجاح لمرحلة ${appealType}`);
            debug.log(`✅ تم الانتقال بنجاح لمرحلة ${appealType} برقم ${newCaseNumber}`);
        };

        // ========================================
        // 🔥 NEW: CROSS-APPEAL HANDLER (الاستئناف المتقابل)
        // ========================================
        const handleCrossAppeal = (crossAppealData: CrossAppealPayload) => {
            debug.log('🔄 بدء معالجة الاستئناف المتقابل:', crossAppealData);

            const updatedStages = [...stages];
            const { filingDate, receiptNumber, notes } = crossAppealData;

            // Mark that cross-appeal has been filed
            if (currentStage.appealMetadata) {
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    appealMetadata: {
                        ...currentStage.appealMetadata,
                        hasCrossAppeal: true,
                        crossAppealDate: filingDate,
                        crossAppealReceipt: receiptNumber
                    }
                };
            }

            // Update parties roles to add "(مستأنف متقابل)" to the appellee
            const updatedParties = (currentStage.parties ?? []).map((party) => {
                if (party.role.includes('المستأنف عليه') && !party.role.includes('متقابل')) {
                    return {
                        ...party,
                        role: `${party.role} (مستأنف متقابل)`,
                    };
                }
                return party;
            });

            updatedStages[activeStageIndex] = {
                ...updatedStages[activeStageIndex],
                parties: updatedParties
            };

            // Add Teal/Green Timeline Event
            updatedStages[activeStageIndex].timeline = [{
                id: `cross_appeal_${Date.now()}`,
                type: 'milestone',
                date: filingDate,
                title: '🔄 تم تقديم لائحة استئناف متقابل',
                details: `تم تقديم لائحة استئناف متقابل من قبل المستأنف عليه\n${receiptNumber ? `\nرقم وصل الرسوم: ${receiptNumber}` : ''}\n${notes ? `\nملاحظات: ${notes}` : ''}`,
                isNew: true,
                color: 'teal' // Special color for cross-appeal
            }, ...(currentStage.timeline ?? [])];

            setStages(updatedStages);
            saveToCloud(updatedStages, parentData);
            setShowCrossAppealModal(false);

            SmartToast.success('تم تسجيل الاستئناف المتقابل بنجاح');
            debug.log('✅ تم تسجيل الاستئناف المتقابل بنجاح');
        };
        
        // ========================================
        // CASSATION OUTCOME HANDLER (Ratified / Quashed)
        // ========================================
        const handleCassationDecision = (decision: 'ratified' | 'quashed') => {
            const updatedStages = [...stages];
            const now = getLocalTodayYmd();

            if (decision === 'ratified') {
                // Ratified: Close the case stage as successful/final
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    status: 'completed',
                    finalDecision: 'مصدق (القرار اكتسب الدرجة القطعية)',
                    decisionDate: now
                };
                
                updatedStages[activeStageIndex].timeline = [{
                    id: `cass_ratified_${Date.now()}`,
                    type: 'decision',
                    date: now,
                    title: '✅ قرار تصديق الحكم (مصدق)',
                    details: 'قررت محكمة التمييز الاتحادية تصديق الحكم المميز ورد الطعون، واكتسب القرار الدرجة القطعية.',
                    isNew: true
                }, ...(currentStage.timeline ?? [])];

                SmartToast.success('تم تصديق الحكم واكتسب الدرجة القطعية');
            } else {
                // Quashed: Mark current as completed (Quashed) AND Revert to Appeal
                updatedStages[activeStageIndex] = {
                    ...currentStage,
                    status: 'completed',
                    finalDecision: 'منقوض (إعادة للمحاكمة)',
                    decisionDate: now
                };

                updatedStages[activeStageIndex].timeline = [{
                    id: `cass_quashed_${Date.now()}`,
                    type: 'decision',
                    date: now,
                    title: '❌ قرار بنقض الحكم (منقوض)',
                    details: 'قررت محكمة التمييز نقض الحكم المميز وإعادة الإضبارة إلى محكمتها للسير فيها مجدداً.',
                    isNew: true
                }, ...(currentStage.timeline ?? [])];

                // Create NEW stage 'الاستئناف' (Appeal) with preserved parties
                // Note: We carry over parties because it's the SAME case going back
                const newStageObject: CaseStage = {
                    id: `stage_${Date.now()}`,
                    name: 'الاستئناف',
                    stageName: 'الاستئناف',
                    type: currentStage.type,
                    caseNo: currentStage.caseNo,
                    court: currentStage.court,
                    judge: '',
                    parties: currentStage.parties,
                    timeline: [],
                    tasks: [],
                    incidentalCases: [],
                    createdDate: now,
                    finalDecision: null,
                    decisionDate: null,
                    status: 'active',
                    firstInstanceCaseNumber: currentStage.firstInstanceCaseNumber,
                    firstInstanceCourt: currentStage.firstInstanceCourt,
                };

                updatedStages.push(newStageObject);
                setActiveStageIndex(updatedStages.length - 1);
                
                SmartToast.error('تم نقض الحكم وإعادة الإضبارة لمرحلة الاستئناف');
            }

            setStages(updatedStages);
            saveToCloud(updatedStages, parentData);
        };

        // ========================================
        // CRITICAL: TRANSITION HANDLER (Parent-Child Architecture)
        // ========================================
        const handleTransitionConfirm = (transitionData: StageTransitionPayload) => {
            const { newStage, newCaseNo, result, date } = transitionData;

            debug.log('🔄 بدء عملية الانتقال للمرحلة الجديدة...');

            const { updatedStages, newActiveIndex } = applyStageTransition(stages, activeStageIndex, currentStage, {
                newStage,
                result,
                date,
            });

            debug.log(`✅ تم ختم المرحلة "${currentStage.stageName}" بمنطوق: ${result}`);
            setStages(updatedStages);
            setActiveStageIndex(newActiveIndex);
            saveToCloud(updatedStages, parentData, newActiveIndex);

            debug.log(`✅ تم إنشاء إضبارة فرعية جديدة "${newStage}" برقم: ${newCaseNo}`);
            debug.log(`📦 إجمالي المراحل: ${updatedStages.length}`);

            setShowTransitionModal(false);
        };

    return {
        handleJudgmentConfirm,
        handleAppealTransition,
        handleCrossAppeal,
        handleCassationDecision,
        handleTransitionConfirm,
    };
}
