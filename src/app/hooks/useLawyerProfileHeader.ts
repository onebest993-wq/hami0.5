import { useEffect, useRef, useState } from 'react';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import { fetchLawyerProfile } from '@/app/services/profile/profileCloudLoader';
import { resolveLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import { peekProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import { shouldApplyProfileHeaderUpdate } from '@/app/services/profile/profileHeaderLogic';

export type LawyerProfileHeaderState = {
    displayName: string;
    title: string;
    avatarUrl: string;
};

const DEFAULT_TITLE = 'المحامي والمستشار القانوني';

function applyProfileHeader(
    p: { header: { name?: string; title?: string; profileImage?: string } },
    userId: string,
    userMetadata: Record<string, unknown> | undefined,
    setDisplayName: (v: string) => void,
    setTitle: (v: string) => void,
    setAvatarUrl: (v: string) => void,
) {
    setDisplayName(resolveLawyerDisplayName(p.header.name, userId, userMetadata));
    setTitle(p.header.title?.trim() || DEFAULT_TITLE);
    setAvatarUrl(p.header.profileImage || '');
}

export function useLawyerProfileHeader(
    userId: string | undefined,
    userMetadata: Record<string, unknown> | undefined,
): LawyerProfileHeaderState {
    const [displayName, setDisplayName] = useState(() =>
        userId ? resolveLawyerDisplayName(undefined, userId, userMetadata) : 'المحامي',
    );
    const [title, setTitle] = useState(DEFAULT_TITLE);
    const [avatarUrl, setAvatarUrl] = useState('');
    const userMetaRef = useRef(userMetadata);
    userMetaRef.current = userMetadata;

    useEffect(() => {
        if (!userId) return;

        const apply = (p: { header: { name?: string; title?: string; profileImage?: string } }) => {
            applyProfileHeader(
                p,
                userId,
                userMetaRef.current,
                setDisplayName,
                setTitle,
                setAvatarUrl,
            );
        };

        const cached = peekProfileWarmCache(userId);
        if (cached) apply(cached);

        const refresh = () => {
            void fetchLawyerProfile(userId).then(apply);
        };

        if (!cached) refresh();

        const onProfileUpdated = (ev: Event) => {
            const detail = (ev as CustomEvent<{ userId?: string }>).detail;
            if (!shouldApplyProfileHeaderUpdate(detail?.userId, userId)) return;
            refresh();
        };
        window.addEventListener(LAWYER_PROFILE_UPDATED, onProfileUpdated);
        return () => window.removeEventListener(LAWYER_PROFILE_UPDATED, onProfileUpdated);
    }, [userId]);

    return { displayName, title, avatarUrl };
}
