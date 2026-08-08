import { useMemo } from 'react';
import { timeValue } from '@/app/components/lawyer/SmartLegalRadar/utils';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { detectConflictsFromUnifiedEvents } from '@/app/services/calendar/scheduleConflictDetector';
import {
    resolveExplicitCalendarEventDurationMinutes,
} from '@/app/services/calendar/calendarDurationUtils';

const TRAVEL_GAP_MINUTES = 60;

function travelGapMinutes(prev: UnifiedEvent, curr: UnifiedEvent): number {
    const prevStart = timeValue(prev.time);
    const currStart = timeValue(curr.time);
    const prevDuration = resolveExplicitCalendarEventDurationMinutes(prev) ?? 0;
    return currStart - (prevStart + prevDuration);
}

export function useSmartLegalRadarDayInsights(selectedEvents: UnifiedEvent[]) {
    const scheduleConflict = useMemo(
        () => detectConflictsFromUnifiedEvents(selectedEvents),
        [selectedEvents],
    );

    const conflictMessage = useMemo(() => {
        /* كاشف الإثقال/المواقع يملك الملخص الرسمي — لا تكرار */
        if (scheduleConflict.hasConflict) return null;
        if (selectedEvents.length < 2) return null;
        const timed = selectedEvents.filter((e) => e.time);
        for (let i = 1; i < timed.length; i++) {
            const prev = timed[i - 1];
            const curr = timed[i];
            const gap = travelGapMinutes(prev, curr);
            if (
                gap < TRAVEL_GAP_MINUTES &&
                gap >= 0 &&
                prev.location &&
                curr.location &&
                prev.location !== curr.location
            ) {
                return `تنبيه ذكي: تعارض زمني/مكاني محتمل بين "${prev.title}" و "${curr.title}". المسافة بين الموقعين لا تسمح بالوصول في الوقت المحدد.`;
            }
        }
        return null;
    }, [scheduleConflict.hasConflict, selectedEvents]);

    const aiBriefing = useMemo(() => {
        if (selectedEvents.length === 0) return null;
        const critical = selectedEvents.filter((e) => e.type === 'deadline' || e.type === 'hearing');
        const consultations = selectedEvents.filter((e) => e.type === 'consultation');
        const parts: string[] = [`لديك (${selectedEvents.length}) مواعيد`];
        if (critical.length > 0) {
            parts.push(`الجلسات المهمة: ${critical.map((e) => `"${e.title}"`).join('، ')}`);
        }
        if (consultations.length > 0) parts.push(`لديك ${consultations.length} استشارات`);
        if (scheduleConflict.hasConflict || conflictMessage) {
            parts.push('لديك تعارض محتمل في المواعيد يتطلب تدخلك.');
        }
        return parts.join('. ');
    }, [selectedEvents, conflictMessage, scheduleConflict.hasConflict]);

    return { conflictMessage, aiBriefing, scheduleConflict };
}
