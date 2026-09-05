import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';

function loadCommunityScreenLazySections() {
    return import('@/app/components/lawyer/CommunityScreen/communityScreenLazySections');
}

const INTENT_MOUNT_HOLD_MS = 2_400;

export function useCommunityScreenLazySectionMount(
    activeSection: CommunitySection,
    forumSurfaceOpen: boolean,
) {
    const [repositoryMounted, setRepositoryMounted] = useState(
        () => activeSection === 'repository',
    );
    const [groupsMounted, setGroupsMounted] = useState(() => activeSection === 'groups');
    const activeSectionRef = useRef(activeSection);
    activeSectionRef.current = activeSection;
    const intentTimerRef = useRef<number>(0);

    useEffect(() => {
        if (activeSection === 'repository') {
            void loadCommunityScreenLazySections().then((m) => m.prefetchCommunityRepositorySection());
            setRepositoryMounted(true);
            setGroupsMounted(false);
            return;
        }
        if (activeSection === 'groups') {
            void loadCommunityScreenLazySections().then((m) => m.prefetchCommunityGroupsSection());
            setGroupsMounted(true);
            setRepositoryMounted(false);
            return;
        }
        setRepositoryMounted(false);
        setGroupsMounted(false);
    }, [activeSection]);

    useEffect(() => {
        if (!forumSurfaceOpen) return undefined;
        let cancelled = false;
        let cancelIdle: (() => void) | undefined;
        void loadCommunityScreenLazySections().then((m) => {
            if (cancelled) return;
            m.prefetchOpenForumInnerSectionChunks();
            cancelIdle = m.scheduleIdleCommunityLazySectionPrefetch();
        });
        return () => {
            cancelled = true;
            cancelIdle?.();
        };
    }, [forumSurfaceOpen]);

    const releaseIntentMounts = useCallback(() => {
        const section = activeSectionRef.current;
        if (section === 'repository') {
            setGroupsMounted(false);
            return;
        }
        if (section === 'groups') {
            setRepositoryMounted(false);
            return;
        }
        setRepositoryMounted(false);
        setGroupsMounted(false);
    }, []);

    const warmLazySection = useCallback(
        (section: CommunitySection) => {
            window.clearTimeout(intentTimerRef.current);
            if (section === 'repository') {
                void loadCommunityScreenLazySections().then((m) => m.prefetchCommunityRepositorySection());
                setRepositoryMounted(true);
            } else if (section === 'groups') {
                void loadCommunityScreenLazySections().then((m) => m.prefetchCommunityGroupsSection());
                setGroupsMounted(true);
            }
            intentTimerRef.current = window.setTimeout(releaseIntentMounts, INTENT_MOUNT_HOLD_MS);
        },
        [releaseIntentMounts],
    );

    useEffect(
        () => () => {
            window.clearTimeout(intentTimerRef.current);
        },
        [],
    );

    return { repositoryMounted, groupsMounted, warmLazySection };
}
