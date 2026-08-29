/**
 * إشعارات المجال القانوني — الطبقة العليا فوق جسر الإشعارات.
 *
 * كانت دوالّ ثلاثاً ساكنة داخل `PushNotificationService`، فاضطرت الخدمة إلى
 * استيراد الجسر بينما الجسر يستوردها للاحتياطي على الويب — دائرة استيراد.
 * الترتيب الصحيح للطبقات: خدمة الويب الدنيا ← الجسر (موجّه أصلي/ويب) ←
 * إشعارات المجال. هذا الملف هو الطبقة الثالثة.
 */
import {
    canSendPushNotifications,
    isNotificationChannelAllowed,
} from '@/app/services/settings/settingsRuntime';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { showHamiNotification } from '@/app/services/notifications/HamiNotificationBridge';

export async function notifyNewExecution(caseNo: string): Promise<void> {
    const settings = getLawyerSettingsSnapshot();
    if (!canSendPushNotifications(settings) || !isNotificationChannelAllowed('execution')) return;
    await showHamiNotification('execution', {
        title: '📩 ملف تنفيذ جديد',
        body: `تم إضافة ملف تنفيذ رقم ${caseNo}`,
        tag: 'new-execution',
        data: { type: 'execution', caseNo, path: 'execution_home' },
    });
}

export async function notifyNewLawsuit(caseNo: string): Promise<void> {
    const settings = getLawyerSettingsSnapshot();
    if (!canSendPushNotifications(settings) || !isNotificationChannelAllowed('lawsuits')) return;
    await showHamiNotification('lawsuits', {
        title: '📩 ملف دعوى جديد',
        body: `تم إضافة ملف دعوى رقم ${caseNo}`,
        tag: 'new-lawsuit',
        data: { type: 'lawsuit', caseNo, path: 'lawsuit_home' },
    });
}

export async function notifyForumActivity(notif: {
    title: string;
    message: string;
    postId?: string;
    type?: string;
}): Promise<void> {
    const settings = getLawyerSettingsSnapshot();
    if (!canSendPushNotifications(settings) || !isNotificationChannelAllowed('community')) return;
    await showHamiNotification('community', {
        title: notif.title,
        body: notif.message,
        tag: `forum-${notif.type ?? 'activity'}-${notif.postId ?? 'general'}`,
        data: {
            type: 'forum',
            category: 'forum',
            path: 'community',
            postId: notif.postId,
            forumType: notif.type,
        },
    });
}
