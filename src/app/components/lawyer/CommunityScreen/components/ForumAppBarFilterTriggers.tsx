import type { Ref, RefObject } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { FORUM_TEXT_APRICOT } from '../forumPlumTheme';
import type { ForumSectionId } from './ForumSectionSwitch';

type ForumAppBarFilterTriggersProps = {
    activeSection: ForumSectionId;
    hasForumFilter: boolean;
    hasRepositoryFilter: boolean;
    activeFilterLabel: string;
    repositoryFilterHint: string;
    showForumFilterPanel: boolean;
    showRepositoryFilterPanel: boolean;
    forumFilterTriggerRef: RefObject<HTMLButtonElement | null>;
    onForumFilterToggle: () => void;
    onRepositoryFilterToggle: () => void;
};

export function ForumAppBarFilterTriggers({
    activeSection,
    hasForumFilter,
    hasRepositoryFilter,
    activeFilterLabel,
    repositoryFilterHint,
    showForumFilterPanel,
    showRepositoryFilterPanel,
    forumFilterTriggerRef,
    onForumFilterToggle,
    onRepositoryFilterToggle,
}: ForumAppBarFilterTriggersProps) {
    return (
        <>
            {activeSection === 'forum' ? (
                <>
                    <div className="w-px h-6 bg-white/10 shrink-0" aria-hidden />
                    <button
                        ref={forumFilterTriggerRef as Ref<HTMLButtonElement>}
                        type="button"
                        onClick={onForumFilterToggle}
                        aria-label="تصنيفات المنتدى"
                        aria-expanded={showForumFilterPanel}
                        className={`relative h-11 px-3 flex items-center gap-1.5 shrink-0 transition-colors ${
                            showForumFilterPanel || hasForumFilter
                                ? `${FORUM_TEXT_APRICOT} bg-[#E6C673]/10`
                                : 'text-[#9AA3B2] hover:text-[#E6C673] hover:bg-[#E6C673]/08'
                        }`}
                    >
                        <span className="truncate text-xs font-bold">التصنيف</span>
                        {hasForumFilter ? (
                            <span className="max-w-[64px] truncate rounded-full bg-[#E6C673]/12 px-2 py-0.5 text-[10px] leading-none">
                                {activeFilterLabel}
                            </span>
                        ) : null}
                        <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${showForumFilterPanel ? 'rotate-180' : ''}`}
                        />
                    </button>
                </>
            ) : null}

            {activeSection === 'repository' ? (
                <>
                    <div className="w-px h-6 bg-white/10 shrink-0" aria-hidden />
                    <button
                        type="button"
                        onClick={onRepositoryFilterToggle}
                        aria-label="ترتيب وتصفية المستودع"
                        aria-expanded={showRepositoryFilterPanel}
                        className={`relative h-11 px-3 flex items-center gap-1.5 shrink-0 transition-colors ${
                            showRepositoryFilterPanel || hasRepositoryFilter
                                ? `${FORUM_TEXT_APRICOT} bg-[#E6C673]/10`
                                : 'text-[#9AA3B2] hover:text-[#E6C673] hover:bg-[#E6C673]/08'
                        }`}
                    >
                        <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${showRepositoryFilterPanel ? 'rotate-180' : ''}`}
                        />
                        {hasRepositoryFilter ? (
                            <span className="max-w-[88px] truncate text-[10px] font-bold leading-none">
                                {repositoryFilterHint}
                            </span>
                        ) : null}
                    </button>
                </>
            ) : null}
        </>
    );
}
