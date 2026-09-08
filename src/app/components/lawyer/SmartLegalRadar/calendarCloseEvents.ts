export const CALENDAR_TEARDOWN_EVENT = 'hami:calendar:teardown';
export const CALENDAR_UNREAD_CHANGED_EVENT = 'hami:calendar:unread-changed';
export const CALENDAR_REMINDER_FIRED_EVENT = 'hami:calendar:reminder-fired';
export const CALENDAR_DOSSIER_SYNC_FLUSH_EVENT = 'hami:calendar:dossier-sync-flush';

export {
    blockCalendarEscapeLayer,
    unblockCalendarEscapeLayer,
    resolveCalendarEscapeAction,
    peekCalendarEscapeTopLayer,
    unblockAllCalendarOverlayEscape,
    describeCalendarEscapeStackForDebug,
} from '@/app/components/lawyer/SmartLegalRadar/calendarEscapeStack';

/* حُذفت `peekCalendarEscapeTopLayerSafe`: صفر مستدعٍ في المستودع، وجسمها لا يعمل
   أصلاً — `require` غير معرَّف في حزمة Vite للمتصفّح، فكان الاستدعاء يرمي
   و`catch` يُرجع 0 دائماً. و«الآمِنة» التي تُرجع صفراً دائماً أسوأ من غيابها.
   الوظيفة نفسها مُصدَّرة استاتيكياً أعلاه: `peekCalendarEscapeTopLayer`. */
