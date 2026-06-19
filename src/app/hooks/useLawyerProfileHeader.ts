import { useEffect, useState } from 'react';
import { LAWYER_PROFILE_UPDATED, ProfileDB } from '@/app/services/lawyer-cloud';

export type LawyerProfileHeaderState = {
    displayName: string;
    title: string;
    avatarUrl: string;
};

const DEFAULT_TITLE = 'المحامي والمستشار القانوني';

export function useLawyerProfileHeader(
    userId: string | undefined,
    userMetadata: Record<string, unknown> | undefined,
): LawyerProfileHeaderState {
    const [displayName, setDisplayName] = useState('المحامي');
    const [title, setTitle] = useState(DEFAULT_TITLE);
    const [avatarUrl, setAvatarUrl] = useState('');

    useEffect(() => {
        if (!userId) return;

        const refresh = () => {
            void ProfileDB.getProfile(userId).then((p) => {
                const metaName =
                    typeof userMetadata?.full_name === 'string'
                        ? userMetadata.full_name
                        : typeof userMetadata?.fullName === 'string'
                          ? userMetadata.fullName
                          : '';
                setDisplayName(p.header.name?.trim() || metaName || 'المحامي');
                setTitle(p.header.title?.trim() || DEFAULT_TITLE);
                setAvatarUrl(p.header.profileImage || '');
            });
        };

        refresh();
        const onProfileUpdated = (ev: Event) => {
            const detail = (ev as CustomEvent<{ userId?: string }>).detail;
            if (!detail?.userId || detail.userId === userId) refresh();
        };
        window.addEventListener(LAWYER_PROFILE_UPDATED, onProfileUpdated);
        return () => window.removeEventListener(LAWYER_PROFILE_UPDATED, onProfileUpdated);
    }, [userId, userMetadata]);

    return { displayName, title, avatarUrl };
}
