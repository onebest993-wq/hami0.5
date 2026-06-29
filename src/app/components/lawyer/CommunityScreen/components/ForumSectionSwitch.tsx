import React, { memo } from 'react';
import { MessagesSquare, BookOpen, Users } from 'lucide-react';
import { prefetchCommunityRepositorySection } from '../communityScreenLazySections';
import { FORUM_SECTION_ACTIVE, FORUM_SECTION_IDLE, FORUM_TEXT_MUTED, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';

export type ForumSectionId = 'forum' | 'groups' | 'repository';

interface ForumSectionSwitchProps {
    activeSection: ForumSectionId;
    onSectionChange: (section: ForumSectionId) => void;
}

const SECTIONS = [
    { id: 'forum' as const, label: 'المنتدى', sub: 'استشارات الزملاء', icon: MessagesSquare },
    { id: 'groups' as const, label: 'الروابط والمجموعات', sub: 'غرف تخصصية', icon: Users },
    { id: 'repository' as const, label: 'المستودع', sub: 'مراجع ومستندات', icon: BookOpen },
];

export const ForumSectionSwitch = memo(function ForumSectionSwitch({
    activeSection,
    onSectionChange,
}: ForumSectionSwitchProps) {
    return (
        <div
            data-testid="forum-section-switch"
            className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-[#140A18] border border-[#4A3D52]/45"
            role="tablist"
            aria-label="تبديل بين أقسام المنتدى"
        >
            {SECTIONS.map(({ id, label, sub, icon: Icon }) => {
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
                        className={`relative min-h-[52px] rounded-xl px-2 py-2 flex flex-col items-center justify-center gap-1 text-center transition-colors duration-150 ${
                            isActive ? FORUM_TEXT_PRIMARY : `${FORUM_TEXT_MUTED} hover:text-[#E6E0E4]`
                        } ${isActive ? FORUM_SECTION_ACTIVE : ''}`}
                    >
                        <span
                            className={`relative z-10 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150 ${
                                isActive ? 'bg-[#F0B896]/18 text-[#F0B896]' : FORUM_SECTION_IDLE
                            }`}
                        >
                            <Icon size={16} strokeWidth={isActive ? 2.25 : 2} />
                        </span>
                        <span className="relative z-10 min-w-0">
                            <span className={`block text-[11px] leading-tight truncate ${isActive ? 'font-bold' : 'font-semibold'}`}>
                                {label}
                            </span>
                            <span className={`block text-[9px] mt-0.5 truncate ${isActive ? 'text-[#B4AEB6]' : 'text-[#7A747C]'}`}>
                                {sub}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
});
