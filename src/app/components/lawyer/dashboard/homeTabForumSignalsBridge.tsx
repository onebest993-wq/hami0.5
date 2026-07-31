import { useEffect } from 'react';
import { useForumUnreadCount } from '@/app/hooks/useForumUnreadCount';
import { useForumNotificationStream } from '@/app/hooks/useForumNotificationStream';

/** يُحمَّل dynamic — يبقي communityFeedPolicy خارج HomeTab sync */
export function HomeTabForumSignalsBridge({
    userId,
    enabled,
    onCount,
}: {
    userId: string;
    enabled: boolean;
    onCount: (count: number) => void;
}) {
    const count = useForumUnreadCount(userId, enabled);
    useForumNotificationStream(userId, enabled);

    useEffect(() => {
        onCount(count);
    }, [count, onCount]);

    return null;
}
