import { createContext, useContext } from 'react';

/** هل استقر جسم الرادار الحي داخل صدفة الكروم؟ الافتراضي true للرادار المستقل في الاختبارات */
export const CalendarLiveHandoffContext = createContext(true);

export function useCalendarLiveHandoff(): boolean {
    return useContext(CalendarLiveHandoffContext);
}
