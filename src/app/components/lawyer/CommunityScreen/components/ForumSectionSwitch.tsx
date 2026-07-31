import React, { memo } from 'react';
import { prefetchCommunityRepositorySection } from '../communityScreenLazySections';

export type ForumSectionId = 'forum' | 'groups' | 'repository';

interface ForumSectionSwitchProps {
    activeSection: ForumSectionId;
    onSectionChange: (section: ForumSectionId) => void;
}

const SECTIONS = [
    { id: 'forum' as const, label: 'المنتدى' },
    { id: 'groups' as const, label: 'المجموعات' },
    { id: 'repository' as const, label: 'المستودع' },
];

export const ForumSectionSwitch = memo(function ForumSectionSwitch({
    activeSection,
    onSectionChange,
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
                        onClick={() => onSectionChange(id)}
                        onPointerEnter={() => {
                            if (id === 'repository') prefetchCommunityRepositorySection();
                        }}
                        className={`hami-forum-cuneiform-btn relative min-h-[44px] rounded-xl px-3 py-2.5 text-center text-sm font-bold transition-colors duration-150 touch-manipulation ${
                            isActive
                                ? 'hami-forum-section-active'
                                : 'hami-forum-section-idle hover:bg-white/[0.04]'
                        }`}
                    >
                        <span className="block truncate">{label}</span>
                    </button>
                );
            })}
        </div>
    );
});
