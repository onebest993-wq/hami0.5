import { useMemo } from 'react';
import { timeValue } from '@/app/components/lawyer/SmartLegalRadar/utils';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

export function useSmartLegalRadarDayInsights(selectedEvents: UnifiedEvent[]) {
    const conflictMessage = useMemo(() => {
        if (selectedEvents.length < 2) return null;
        const timed = selectedEvents.filter((e) => e.time);
        for (let i = 1; i < timed.length; i++) {
            const prev = timed[i - 1];
            const curr = timed[i];
            const gap = timeValue(curr.time) - timeValue(prev.time);
            if (
                gap < 60 &&
                gap >= 0 &&
                prev.location &&
                curr.location &&
                prev.location !== curr.location
            ) {
                return `تنبيه ذكي: تعارض زمني/مكاني محتمل بين "${prev.title}" و "${curr.title}". المسافة بين الموقعين لا تسمح بالوصول في الوقت المحدد.`;
            }
        }
        return null;
    }, [selectedEvents]);

    const aiBriefing = useMemo(() => {
        if (selectedEvents.length === 0) return null;
        const critical = selectedEvents.filter((e) => e.type === 'deadline' || e.type === 'hearing');
        const consultations = selectedEvents.filter((e) => e.type === 'consultation');
        const parts: string[] = [`لديك (${selectedEvents.length}) مواعيد`];
        if (critical.length > 0) {
            parts.push(`الجلسات المهمة: ${critical.map((e) => `"${e.title}"`).join('، ')}`);
        }
        if (consultations.length > 0) parts.push(`لديك ${consultations.length} استشارات`);
        if (conflictMessage) parts.push('لديك تعارض محتمل في المواعيد يتطلب تدخلك.');
        return parts.join('. ');
    }, [selectedEvents, conflictMessage]);

    return { conflictMessage, aiBriefing };
}
