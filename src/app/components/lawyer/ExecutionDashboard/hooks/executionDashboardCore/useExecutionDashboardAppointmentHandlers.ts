/** Phase C — حفظ/تعديل مواعيد الإضبارة + مزامنة التقويم */
import { useCallback, useMemo, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { CalendarBridge, normalizeDateToYmd } from '@/app/services/calendarBridge';
import { toastAfterExecutionPersist } from '../../helpers/toastAfterExecutionPersist';

export type UseExecutionDashboardAppointmentHandlersParams = {
    appointmentPurpose: string;
    appointmentDateOnly: string;
    appointmentTimeOptional: string;
    editingAppointmentId: string | null;
    timelineEventsRef: MutableRefObject<TimelineEvent[]>;
    currentFileId: string;
    executionData: ExecutionFile | null | undefined;
    file: ExecutionFile | null | undefined;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setAppointmentPurpose: Dispatch<SetStateAction<string>>;
    setAppointmentDateOnly: Dispatch<SetStateAction<string>>;
    setAppointmentTimeOptional: Dispatch<SetStateAction<string>>;
    setEditingAppointmentId: Dispatch<SetStateAction<string | null>>;
};

export function useExecutionDashboardAppointmentHandlers({
    appointmentPurpose,
    appointmentDateOnly,
    appointmentTimeOptional,
    editingAppointmentId,
    timelineEventsRef,
    currentFileId,
    executionData,
    file,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
    setAppointmentPurpose,
    setAppointmentDateOnly,
    setAppointmentTimeOptional,
    setEditingAppointmentId,
}: UseExecutionDashboardAppointmentHandlersParams) {
    const draftRef = useRef({
        appointmentPurpose,
        appointmentDateOnly,
        appointmentTimeOptional,
        editingAppointmentId,
    });
    draftRef.current = {
        appointmentPurpose,
        appointmentDateOnly,
        appointmentTimeOptional,
        editingAppointmentId,
    };

    const handleSaveAppointment = useCallback(() => {
        const {
            appointmentPurpose: purpose,
            appointmentDateOnly: dateOnly,
            appointmentTimeOptional: timeOptional,
            editingAppointmentId: editingId,
        } = draftRef.current;

        if (!purpose.trim() || !dateOnly) {
            showToast('يرجى إدخال الغرض وتاريخ الموعد', 'warning');
            return;
        }

        const recorded = new Date().toISOString();
        const eventIso = timeOptional
            ? `${dateOnly}T${timeOptional}:00`
            : `${dateOnly}T12:00:00`;

        const eventDateLabel = new Date(dateOnly).toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const timePart = timeOptional
            ? new Date(eventIso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            : null;

        const title = `📅 ${purpose.trim()}`;
        const description = timePart
            ? `موعد في ${eventDateLabel} — الساعة ${timePart}`
            : `موعد بتاريخ ${eventDateLabel} (بدون وقت محدد)`;

        const syncedTimelineId = editingId ? String(editingId) : nextTimelineId();
        if (editingId) {
            const nextTimeline = (timelineEventsRef.current || []).map((ev: TimelineEvent) =>
                String(ev?.id) === String(editingId)
                    ? {
                          ...ev,
                          type: 'appointment',
                          date: eventIso,
                          timestamp: recorded,
                          title,
                          description,
                          source: 'تعديل موعد',
                      }
                    : ev,
            );
            setTimelineEvents(nextTimeline);
            toastAfterExecutionPersist(
                persistExecutionMerge({ timelineEvents: nextTimeline }),
                showToast,
                'تم تعديل الموعد بنجاح',
            );
        } else {
            const newEvent: TimelineEvent = {
                id: syncedTimelineId,
                type: 'appointment',
                date: eventIso,
                timestamp: recorded,
                title,
                description,
                source: 'إضافة موعد',
            };
            const nextTimeline = [newEvent, ...(timelineEventsRef.current || [])];
            setTimelineEvents(nextTimeline);
            toastAfterExecutionPersist(
                persistExecutionMerge({ timelineEvents: nextTimeline }),
                showToast,
                'تم حفظ الموعد بنجاح',
            );
        }

        const execYmd = normalizeDateToYmd(dateOnly) ?? dateOnly;
        CalendarBridge.syncExecutionAppointment({
            executionId: currentFileId,
            timelineEventId: syncedTimelineId,
            date: execYmd,
            time: timeOptional || undefined,
            purpose: purpose.trim(),
            description,
            caseNo:
                String(executionData?.fileNumber ?? executionData?.caseNo ?? file?.fileNumber ?? '').trim() ||
                undefined,
            clientName:
                String(
                    executionData?.creditors?.[0]?.name ??
                        executionData?.clientName ??
                        file?.creditors?.[0]?.name ??
                        '',
                ).trim() || undefined,
        });
        setAppointmentPurpose('');
        setAppointmentDateOnly('');
        setAppointmentTimeOptional('');
        setEditingAppointmentId(null);
    }, [
        timelineEventsRef,
        showToast,
        nextTimelineId,
        persistExecutionMerge,
        currentFileId,
        executionData,
        file,
        setTimelineEvents,
        setAppointmentPurpose,
        setAppointmentDateOnly,
        setAppointmentTimeOptional,
        setEditingAppointmentId,
    ]);

    return useMemo(() => ({ handleSaveAppointment }), [handleSaveAppointment]);
}
