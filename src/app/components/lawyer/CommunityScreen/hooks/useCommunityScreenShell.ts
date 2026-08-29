import { useRef, useState } from 'react';
import type { RepositorySortKey } from '../repositoryListFilters';
import { readPersistedCommunitySection, type CommunitySection } from '../communitySectionState';

export function useCommunityScreenShell() {
    const [repositorySearchTerm, setRepositorySearchTerm] = useState('');
    const [repositorySortBy, setRepositorySortBy] = useState<RepositorySortKey>('newest');
    const [repositorySelectedType, setRepositorySelectedType] = useState('الكل');
    const [repositorySelectedTag, setRepositorySelectedTag] = useState<string | null>(null);
    const [activeSection, setActiveSectionState] = useState<CommunitySection>(() =>
        readPersistedCommunitySection(),
    );
    const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);
    const [profileView, setProfileView] = useState<{ userId: string; displayName?: string } | null>(
        null,
    );
    const [forumAppBarDropdownOpen, setForumAppBarDropdownOpen] = useState(false);
    const closeAppBarDropdownsRef = useRef<(() => void) | null>(null);
    const [showFollowingPanel, setShowFollowingPanel] = useState(false);
    const [forumFeedScope, setForumFeedScope] = useState<'all' | 'following'>('all');
    const [commentingPostId, setCommentingPostId] = useState<string | null>(null);

    return {
        repositorySearchTerm,
        setRepositorySearchTerm,
        repositorySortBy,
        setRepositorySortBy,
        repositorySelectedType,
        setRepositorySelectedType,
        repositorySelectedTag,
        setRepositorySelectedTag,
        activeSection,
        setActiveSectionState,
        selectedFilterIndex,
        setSelectedFilterIndex,
        profileView,
        setProfileView,
        forumAppBarDropdownOpen,
        setForumAppBarDropdownOpen,
        closeAppBarDropdownsRef,
        showFollowingPanel,
        setShowFollowingPanel,
        forumFeedScope,
        setForumFeedScope,
        commentingPostId,
        setCommentingPostId,
    };
}
