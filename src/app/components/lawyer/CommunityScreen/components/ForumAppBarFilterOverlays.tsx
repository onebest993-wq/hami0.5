import { AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { ForumCategoryPanel } from './ForumCategoryPanel';
import { RepositoryFilterPanel } from './RepositoryFilterPanel';
import type { RefObject } from 'react';
import type { RepositorySortKey } from '../repositoryListFilters';

type ForumAppBarFilterOverlaysProps = {
    showForumFilterPanel: boolean;
    showRepositoryFilterPanel: boolean;
    selectedFilterIndex: number;
    onFilterSelect: (index: number) => void;
    onCloseForumFilter: () => void;
    forumFilterTriggerRef: RefObject<HTMLButtonElement | null>;
    repositorySortBy: RepositorySortKey;
    repositorySelectedType: string;
    repositorySelectedTag: string | null;
    onRepositorySortChange: (value: RepositorySortKey) => void;
    onRepositoryTypeChange: (value: string) => void;
    onRepositoryTagChange: (tag: string | null) => void;
    onCloseRepositoryFilter: () => void;
};

export function ForumAppBarFilterOverlays(props: ForumAppBarFilterOverlaysProps) {
    return (
        <>
            <AnimatePresence>
                {props.showForumFilterPanel ? (
                    <>
                        <div className="fixed inset-0 z-40" onClick={props.onCloseForumFilter} aria-hidden />
                        <ForumCategoryPanel
                            key="forum-category-panel"
                            selectedFilterIndex={props.selectedFilterIndex}
                            onFilterSelect={props.onFilterSelect}
                            onClose={props.onCloseForumFilter}
                            anchorRef={props.forumFilterTriggerRef}
                        />
                    </>
                ) : null}
            </AnimatePresence>

            <AnimatePresence>
                {props.showRepositoryFilterPanel ? (
                    <>
                        <div className="fixed inset-0 z-40" onClick={props.onCloseRepositoryFilter} aria-hidden />
                        <RepositoryFilterPanel
                            key="repository-filter-panel"
                            sortBy={props.repositorySortBy}
                            selectedType={props.repositorySelectedType}
                            selectedTag={props.repositorySelectedTag}
                            onSortChange={props.onRepositorySortChange}
                            onTypeChange={props.onRepositoryTypeChange}
                            onTagChange={props.onRepositoryTagChange}
                            onClose={props.onCloseRepositoryFilter}
                        />
                    </>
                ) : null}
            </AnimatePresence>
        </>
    );
}
