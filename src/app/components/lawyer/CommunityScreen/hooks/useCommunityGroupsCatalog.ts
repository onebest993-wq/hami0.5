import { useCallback, useEffect, useMemo, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import type { CommunitySection } from '../communitySectionState';
import { withForumAsyncTimeout } from '../forumAsync';
import { createForumGroupResilient } from '../forumGroupCreate';
import { resolveForumGroupCreateFields } from '../forumGroupCreateGuard';
import {
    peekForumGroupsCache,
    setForumGroupsCache,
} from '@/app/services/forum/forumGroupsWarmCache';

export type UseCommunityGroupsCatalogParams = {
    currentUserId: string | null;
    authIsLoading: boolean;
    activeSection: CommunitySection;
    surfaceOpen?: boolean;
};

export function useCommunityGroupsCatalog({
    currentUserId,
    authIsLoading,
    activeSection,
    surfaceOpen = true,
}: UseCommunityGroupsCatalogParams) {
    const [groups, setGroups] = useState<ForumGroup[]>(() => peekForumGroupsCache() ?? []);
    const [groupsLoading, setGroupsLoading] = useState(() => peekForumGroupsCache() == null);
    const [groupsSearchQuery, setGroupsSearchQuery] = useState('');
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [submittingGroup, setSubmittingGroup] = useState(false);
    const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
    const [leavingGroup, setLeavingGroup] = useState(false);

    useEffect(() => {
        if (surfaceOpen === false) return;
        if (authIsLoading || activeGroupId || activeSection !== 'groups') return;
        let cancelled = false;
        const cached = !groupsSearchQuery.trim() ? peekForumGroupsCache() : null;
        if (cached) {
            setGroups(cached);
            setGroupsLoading(false);
        } else {
            setGroupsLoading(true);
        }
        void withForumAsyncTimeout(ForumApiService.listGroups(groupsSearchQuery), 8_000, cached ?? [])
            .then((rows) => {
                if (cancelled) return;
                setGroups(rows);
                if (!groupsSearchQuery.trim()) setForumGroupsCache(rows);
            })
            .catch(() => {
                if (!cancelled) SmartToast.error('تعذّر تحميل المجموعات');
            })
            .finally(() => {
                if (!cancelled) setGroupsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [authIsLoading, activeGroupId, groupsSearchQuery, activeSection, surfaceOpen]);

    const activeGroup = useMemo(
        () => (activeGroupId ? groups.find((g) => g.id === activeGroupId) ?? null : null),
        [activeGroupId, groups],
    );

    const clearActiveGroup = useCallback(() => setActiveGroupId(null), []);

    const handleJoinGroup = useCallback(
        async (groupId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول للانضمام');
                return;
            }
            setJoiningGroupId(groupId);
            try {
                const updated = await ForumApiService.joinGroup(groupId, currentUserId);
                setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
                SmartToast.success('انضممت للمجموعة');
            } catch (err) {
                const message =
                    err instanceof Error && err.message.trim()
                        ? err.message
                        : 'تعذّر الانضمام للمجموعة';
                SmartToast.error(message);
            } finally {
                setJoiningGroupId(null);
            }
        },
        [currentUserId],
    );

    const handleOpenGroup = useCallback(
        (groupId: string) => {
            const group = groups.find((g) => g.id === groupId);
            if (!group?.isMember) return;
            setActiveGroupId(groupId);
        },
        [groups],
    );

    const handleLeaveGroup = useCallback(async () => {
        if (!activeGroupId) return;
        setLeavingGroup(true);
        try {
            await ForumApiService.leaveGroup(activeGroupId, currentUserId);
            setActiveGroupId(null);
            const rows = await ForumApiService.listGroups(groupsSearchQuery);
            setGroups(rows);
            SmartToast.success('غادرت المجموعة');
        } catch (err) {
            const message =
                err instanceof Error && err.message.trim()
                    ? err.message
                    : 'تعذّر مغادرة المجموعة';
            SmartToast.error(message);
        } finally {
            setLeavingGroup(false);
        }
    }, [activeGroupId, currentUserId, groupsSearchQuery]);

    const handleCreateGroup = useCallback(async () => {
        const resolved = resolveForumGroupCreateFields(newGroupName, newGroupDesc, currentUserId);
        if (!resolved.ok) {
            SmartToast.warning(resolved.warning);
            return;
        }
        setSubmittingGroup(true);
        try {
            const group = await createForumGroupResilient(
                { name: resolved.name, description: resolved.description },
                currentUserId as string,
            );
            setGroups((prev) => [group, ...prev.filter((g) => g.id !== group.id)]);
            setIsCreateGroupOpen(false);
            setNewGroupName('');
            setNewGroupDesc('');
            SmartToast.success('تم إنشاء المجموعة');
        } catch (err) {
            const message =
                err instanceof Error && err.message.trim()
                    ? err.message
                    : 'تعذّر إنشاء المجموعة';
            SmartToast.error(message);
        } finally {
            setSubmittingGroup(false);
        }
    }, [currentUserId, newGroupDesc, newGroupName]);

    return {
        groups,
        groupsLoading,
        groupsSearchQuery,
        setGroupsSearchQuery,
        activeGroupId,
        setActiveGroupId,
        clearActiveGroup,
        activeGroup,
        isCreateGroupOpen,
        setIsCreateGroupOpen,
        newGroupName,
        setNewGroupName,
        newGroupDesc,
        setNewGroupDesc,
        submittingGroup,
        joiningGroupId,
        leavingGroup,
        handleJoinGroup,
        handleOpenGroup,
        handleLeaveGroup,
        handleCreateGroup,
    };
}
