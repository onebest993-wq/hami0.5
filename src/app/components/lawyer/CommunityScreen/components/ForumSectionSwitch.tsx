import React, { memo } from 'react';
import {
    prefetchCommunityGroupsSection,
    prefetchCommunityRepositorySection,
    prefetchCommunityRepositorySectionChunk,
} from '../communityScreenLazySections';

export type ForumSectionId = 'forum' | 'groups' | 'repository';

interface ForumSectionSwitchProps {
    activeSection: ForumSectionId;
    onSectionChange: (section: ForumSectionId) => void;
    onSectionIntent?: (section: ForumSectionId) => void;
}

const SECTIONS = [
    { id: 'forum' as const, label: 'المنتدى' },
    { id: 'groups' as const, label: 'المجموعات' },
    { id: 'repository' as const, label: 'المستودع' },
];

function prefetchForumSection(id: ForumSectionId, mode: 'full' | 'chunk'): void {
    if (id === 'repository') {
        if (mode === 'full') prefetchCommunityRepositorySection();
        else void prefetchCommunityRepositorySectionChunk();
        return;
    }
    if (id === 'groups') prefetchCommunityGroupsSection();
}

export const ForumSectionSwitch = memo(function ForumSectionSwitch({
    activeSection,
    onSectionChange,
    onSectionIntent,
}: ForumSectionSwitchProps) {
    return (
        <div
            data-testid="forum-section-switch"
            className="hami-forum-section-rail grid grid-cols-3 gap-1 rounded-2xl p-1"
            role="tablist"
            aria-label="تبديل بين أقسام المنتدى"
        >
            {SECTIONS.map(({ id, label }) => {
                const isActive = activeSection === id;
                return (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        data-testid={`forum-section-tab-${id}`}
                        aria-selected={isActive}
                        onClick={() => {
                            prefetchForumSection(id, 'full');
                            onSectionChange(id);
                        }}
                        onPointerDown={() => {
                            onSectionIntent?.(id);
                            prefetchForumSection(id, 'full');
                        }}
                        onPointerEnter={() => {
                            prefetchForumSection(id, 'chunk');
                        }}
                        className={`relative min-h-[44px] rounded-xl px-3 py-2.5 text-center text-sm font-bold transition-colors duration-150 touch-manipulation ${
                            isActive
                                ? 'hami-forum-section-active'
                                : 'hami-forum-section-idle'
                        }`}
                    >
                        <span className="block truncate">{label}</span>
                    </button>
                );
            })}
        </div>
    );
});
