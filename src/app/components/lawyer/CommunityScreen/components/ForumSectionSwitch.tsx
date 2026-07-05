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
            className="grid grid-cols-3 gap-2 rounded-[1.4rem] border border-white/8 bg-[#1A121F]/90 p-2 shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
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
                        className={`relative min-h-[52px] rounded-[1.1rem] px-3 py-3 text-center text-sm font-bold transition-all duration-150 ${
                            isActive
                                ? 'bg-[linear-gradient(135deg,#F0B896_0%,#F7C7A7_100%)] text-[#24131B] shadow-[0_12px_28px_rgba(240,184,150,0.22)]'
                                : 'bg-[#241A2A]/70 text-[#B4AEB6] border border-transparent hover:border-[#F0B896]/16 hover:bg-[#2B2032] hover:text-[#F6EFEA]'
                        }`}
                    >
                        <span className="relative z-10 block truncate">{label}</span>
                        {isActive ? (
                            <span
                                aria-hidden
                                className="absolute inset-x-4 bottom-1.5 h-[3px] rounded-full bg-[#2A1520]/35"
                            />
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
});
