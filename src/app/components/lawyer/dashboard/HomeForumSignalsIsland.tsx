/**
 * جزيرة إشارات المنتدى — تُحمَّل فقط بعد forumSignalsReady حتى لا تُسحب
 * useForumUnreadCount / useForumNotificationStream إلى حزمة HomeTab الباردة.
 * لا تغيير بصري: نفس التوقيت الشرطي السابق.
 */
import { useForumUnreadCount } from '@/app/hooks/useForumUnreadCount';
import { useForumNotificationStream } from '@/app/hooks/useForumNotificationStream';
import { useEffect } from 'react';

export type HomeForumSignalsIslandProps = {
    userId: string;
    enabled: boolean;
    onUnreadCount: (count: number) => void;
};

export default function HomeForumSignalsIsland({
    userId,
    enabled,
    onUnreadCount,
}: HomeForumSignalsIslandProps) {
    const { count: forumUnreadCount, isLoading } = useForumUnreadCount(userId, enabled);
    useForumNotificationStream(userId, enabled);

    useEffect(() => {
        if (isLoading && forumUnreadCount === 0) return;
        onUnreadCount(forumUnreadCount);
    }, [forumUnreadCount, isLoading, onUnreadCount]);

    return null;
}
