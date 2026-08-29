import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { ForumSectionId } from '../components/ForumSectionSwitch';

type UseForumAppBarChromeParams = {
    activeSection: ForumSectionId;
    forumSurfaceOpen: boolean;
    onAppBarDropdownChange?: (open: boolean) => void;
    closeAppBarDropdownsRef?: MutableRefObject<(() => void) | null>;
    setShowNotifPanel: (open: boolean) => void;
    handleBellClick: (onDropdownChange?: (open: boolean) => void) => void;
};

export function useForumAppBarChrome({
    activeSection,
    forumSurfaceOpen,
    onAppBarDropdownChange,
    closeAppBarDropdownsRef,
    setShowNotifPanel,
    handleBellClick,
}: UseForumAppBarChromeParams) {
    const [showForumFilterPanel, setShowForumFilterPanel] = useState(false);
    const [showRepositoryFilterPanel, setShowRepositoryFilterPanel] = useState(false);
    const forumFilterTriggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel(false);
    }, [activeSection]);

    useEffect(() => {
        if (forumSurfaceOpen) return;
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel(false);
        setShowNotifPanel(false);
        onAppBarDropdownChange?.(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- إغلاق محلي عند hide السطح فقط
    }, [forumSurfaceOpen]);

    const closeFilters = useCallback(() => {
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel(false);
    }, []);

    const onBellClick = useCallback(() => {
        closeFilters();
        handleBellClick(onAppBarDropdownChange);
    }, [closeFilters, handleBellClick, onAppBarDropdownChange]);

    const onForumSearchOpen = useCallback(
        (openSearch: () => void) => {
            closeFilters();
            setShowNotifPanel(false);
            onAppBarDropdownChange?.(false);
            openSearch();
        },
        [closeFilters, onAppBarDropdownChange, setShowNotifPanel],
    );

    const onOpenFollowing = useCallback(
        (openFollowing?: () => void) => {
            closeFilters();
            setShowNotifPanel(false);
            onAppBarDropdownChange?.(false);
            openFollowing?.();
        },
        [closeFilters, onAppBarDropdownChange, setShowNotifPanel],
    );

    const onForumFilterToggle = useCallback(() => {
        setShowNotifPanel(false);
        setShowRepositoryFilterPanel(false);
        setShowForumFilterPanel((v) => {
            const next = !v;
            onAppBarDropdownChange?.(next);
            return next;
        });
    }, [onAppBarDropdownChange, setShowNotifPanel]);

    const onRepositoryFilterToggle = useCallback(() => {
        setShowNotifPanel(false);
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel((v) => {
            const next = !v;
            onAppBarDropdownChange?.(next);
            return next;
        });
    }, [onAppBarDropdownChange, setShowNotifPanel]);

    const closeAppBarDropdowns = useCallback(() => {
        setShowNotifPanel(false);
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel(false);
        onAppBarDropdownChange?.(false);
    }, [onAppBarDropdownChange, setShowNotifPanel]);

    useEffect(() => {
        if (!closeAppBarDropdownsRef) return;
        closeAppBarDropdownsRef.current = closeAppBarDropdowns;
        return () => {
            closeAppBarDropdownsRef.current = null;
        };
    }, [closeAppBarDropdownsRef, closeAppBarDropdowns]);

    return {
        showForumFilterPanel,
        setShowForumFilterPanel,
        showRepositoryFilterPanel,
        setShowRepositoryFilterPanel,
        forumFilterTriggerRef,
        onBellClick,
        onForumSearchOpen,
        onOpenFollowing,
        onForumFilterToggle,
        onRepositoryFilterToggle,
    };
}
