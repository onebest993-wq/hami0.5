import type { Party, Task, TimelineEvent } from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { parseLocalNotificationDate } from '@/app/utils/executionStateMachineChrono';
import { addCalendarDaysYmd } from '@/app/utils/executionYmdCalendar';
import { overlayMirrorSessionNextHearingToCalendar } from '@/app/services/lawsuitTimelineCalendarMirrorLazy';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import {
    formatDateToLocalYmd,
    stageTasks,
    stageTimeline,
    ymdPlusDays,
} from '../../smartFile/proceduralTypes';
import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';

export function createProceduralTimelineActionHandlers(
    options: UseSmartFileProceduralActionsOptions,
) {
    const {
        stages,
        setStages,
        activeStageIndex,
        currentStage,
        parentData,
        saveToCloud,
        setStatus,
        setIsPaused,
        setPauseReason,
        setEditingEvent,
        calendarUserId,
    } = options;

    const lawsuitCalendarContext = () => buildLawsuitCalendarContext(parentData, calendarUserId);

    const handleAddAction = (data: {
        title: string;
        date: string;
        description: string;
        [key: string]: unknown;
    }) => {
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
                              })(),
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
                    tags: ['#عوارض_الخصومة', '#غياب'],
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
                    tags: ['#عوارض_الخصومة', '#وقف_اتفاقي'],
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
                tags: ['#دعوى_حادثة', data.incidentalType === 'third_party' ? '#شخص_ثالث' : '#طلب_عارض'],
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
            SmartToast.success('تم تسجيل الدعوى الحادثة بنجاح ⚖️');
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
                e.id === data.id ? { ...e, ...newEvent } : e,
            );
            setEditingEvent(null);
        } else {
            updatedStages[activeStageIndex].timeline = [newEvent, ...stageTimeline(currentStage)];
        }

        setStages(updatedStages);
        saveToCloud(updatedStages);
        if (data.isSessionRecord === true) {
            overlayMirrorSessionNextHearingToCalendar(
                updatedStages,
                activeStageIndex,
                String(newEvent.id),
                typeof data.nextHearingDate === 'string' ? data.nextHearingDate : undefined,
                String(newEvent.title),
                lawsuitCalendarContext(),
                (mirrored) => {
                    setStages(mirrored);
                    saveToCloud(mirrored);
                },
            );
        }

        if (data.isStayed) {
            SmartToast.warning('تم استئخار الدعوى وتجميد الإجراءات ⏸️');
        }
    };

    return { handleAddAction };
}
