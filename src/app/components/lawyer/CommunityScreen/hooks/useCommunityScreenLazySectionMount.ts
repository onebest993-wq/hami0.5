import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';
import {
    prefetchCommunityGroupsSection,
    prefetchCommunityLazySectionChunks,
    prefetchCommunityRepositorySection,
    scheduleIdleCommunityLazySectionPrefetch,
} from '@/app/components/lawyer/CommunityScreen/communityScreenLazySections';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';

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
            void prefetchCommunityRepositorySection();
            setRepositoryMounted(true);
            setGroupsMounted(false);
            return;
        }
        if (activeSection === 'groups') {
            void prefetchCommunityGroupsSection();
            setGroupsMounted(true);
            setRepositoryMounted(false);
            return;
        }
        setRepositoryMounted(false);
        setGroupsMounted(false);
    }, [activeSection]);

    useEffect(() => {
        if (!forumSurfaceOpen) return undefined;
        if (!isLitePerformanceActive()) {
            void prefetchCommunityLazySectionChunks();
        }
        return scheduleIdleCommunityLazySectionPrefetch();
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
                void prefetchCommunityRepositorySection();
                setRepositoryMounted(true);
            } else if (section === 'groups') {
                void prefetchCommunityGroupsSection();
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
