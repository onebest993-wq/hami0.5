import React, { memo, useState } from 'react';
import { Search, Users, Plus, Check, Shield } from 'lucide-react';
import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import {
    FORUM_ACCENT_CHIP,
    FORUM_FEED_CARD,
    FORUM_SURFACE_INPUT,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

interface ForumGroupsDirectoryProps {
    groups: ForumGroup[];
    loading: boolean;
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    onJoin: (groupId: string) => void;
    onOpenGroup: (groupId: string) => void;
    onCreateClick: () => void;
    joiningGroupId: string | null;
}

export const ForumGroupsDirectory = memo(function ForumGroupsDirectory({
    groups,
    loading,
    searchQuery,
    onSearchQueryChange,
    onJoin,
    onOpenGroup,
    onCreateClick,
    joiningGroupId,
}: ForumGroupsDirectoryProps) {
    return (
        <div className="px-4 pt-2 pb-28 space-y-4">
            <div className="relative">
                <Search
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    placeholder="ابحث عن مجموعة: كركوك، أحوال شخصية..."
                    className={`w-full h-11 ${FORUM_SURFACE_INPUT} rounded-xl pr-10 pl-3 text-sm`}
                    aria-label="بحث في المجموعات"
                />
            </div>

            {loading ? (
                <p className={`text-center text-sm py-10 ${FORUM_TEXT_MUTED}`}>جاري تحميل المجموعات…</p>
            ) : groups.length === 0 ? (
                <div className={`${FORUM_FEED_CARD} p-6 text-center`}>
                    <Users size={28} className="mx-auto mb-3 text-[#F0B896]/60" />
                    <p className={`${FORUM_TEXT_PRIMARY} font-bold mb-1`}>لا توجد مجموعات بعد</p>
                    <p className={`text-sm ${FORUM_TEXT_MUTED}`}>أنشئ أول مجموعة تخصصية للنقاش بين الزملاء.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {groups.map((group) => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            joining={joiningGroupId === group.id}
                            onJoin={() => onJoin(group.id)}
                            onOpen={() => onOpenGroup(group.id)}
                        />
                    ))}
                </div>
            )}

            <button
                type="button"
                onClick={onCreateClick}
                className="fixed bottom-24 left-6 z-20 flex items-center gap-2 rounded-2xl bg-[#F0B896] text-[#1A1218] font-bold py-3 px-5 shadow-lg shadow-black/25"
            >
                <Plus size={20} />
                <span>إنشاء مجموعة</span>
            </button>
        </div>
    );
});

function GroupCard({
    group,
    joining,
    onJoin,
    onOpen,
}: {
    group: ForumGroup;
    joining: boolean;
    onJoin: () => void;
    onOpen: () => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <article
            className={`${FORUM_FEED_CARD} p-4 ${group.isMember ? 'cursor-pointer' : ''}`}
            onClick={() => {
                if (group.isMember) onOpen();
            }}
            onKeyDown={(e) => {
                if (group.isMember && (e.key === 'Enter' || e.key === ' ')) onOpen();
            }}
            role={group.isMember ? 'button' : undefined}
            tabIndex={group.isMember ? 0 : undefined}
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className={`text-sm font-bold ${FORUM_TEXT_PRIMARY}`}>{group.name}</h3>
                        {group.isOfficial ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/25 bg-sky-950/30 px-2 py-0.5 text-[9px] font-bold text-sky-200">
                                <Shield size={10} />
                                رسمية
                            </span>
                        ) : null}
                    </div>
                    <p className={`text-xs leading-relaxed ${FORUM_TEXT_MUTED} ${expanded ? '' : 'line-clamp-2'}`}>
                        {group.description}
                    </p>
                    {group.description.length > 90 ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpanded((v) => !v);
                            }}
                            className="mt-1 text-[10px] text-[#F0B896]/80"
                        >
                            {expanded ? 'أقل' : 'المزيد'}
                        </button>
                    ) : null}
                </div>
                <div className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center ${FORUM_ACCENT_CHIP}`}>
                    <p className="text-sm font-black text-[#F0B896]">{group.memberCount}</p>
                    <p className="text-[9px] text-white/45">عضو</p>
                </div>
            </div>

            <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
                {group.isMember ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-950/30 px-3 py-1.5 text-[11px] font-bold text-emerald-200">
                        <Check size={14} />
                        مشترك — ادخل للمجموعة
                    </span>
                ) : (
                    <button
                        type="button"
                        disabled={joining}
                        onClick={onJoin}
                        className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-950/35 px-3 py-1.5 text-[11px] font-bold text-sky-100 hover:bg-sky-950/55 disabled:opacity-60"
                    >
                        <Plus size={14} />
                        {joining ? 'جاري الانضمام…' : 'انضمام'}
                    </button>
                )}
            </div>
        </article>
    );
}
