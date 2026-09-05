import { lazy } from 'react';

export const forumFilterOverlaysImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/ForumAppBarFilterOverlays').then((m) => ({
        default: m.ForumAppBarFilterOverlays,
    }));

export const LazyForumAppBarFilterOverlays = lazy(forumFilterOverlaysImport);
