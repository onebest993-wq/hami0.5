import React, { memo } from 'react';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Sparkles } from '@/app/components/ui/icons/Sparkles';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { UserPlus } from '@/app/components/ui/icons/UserPlus';
import type { ForumProfileFollowState } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfilePageAccess } from '@/app/services/profile/profilePageTypes';
import { ProfilePageAccessControl } from './ProfilePageAccessControl';
import { isPrimaryDragPointer } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';

type ProfileHeroActionRailProps = {
    readOnly: boolean;
    forumFollow?: ForumProfileFollowState;
    showForumSocial: boolean;
    pageAccess?: ProfilePageAccess;
    pageAccessBusy?: boolean;
    onCyclePageAccess?: () => void;
    onEditClick: () => void;
    onEditPointerDown: (event: React.PointerEvent) => void;
    onEditPointerCancel: () => void;
    onStudioClick: () => void;
    onStudioPointerDown: (event: React.PointerEvent) => void;
    onStudioPointerCancel: () => void;
    onStudioWarm: () => void;
};

export const ProfileHeroActionRail = memo(function ProfileHeroActionRail({
    readOnly,
    forumFollow,
    showForumSocial,
    pageAccess,
    pageAccessBusy,
    onCyclePageAccess,
    onEditClick,
    onEditPointerDown,
    onEditPointerCancel,
    onStudioClick,
    onStudioPointerDown,
    onStudioPointerCancel,
    onStudioWarm,
}: ProfileHeroActionRailProps) {
    return (
        <div className="hami-profile-hero-rail" data-testid="lawyer-profile-action-rail">
            {showForumSocial && forumFollow ? (
                <button
                    type="button"
                    disabled={forumFollow.busy}
                    onClick={forumFollow.onToggle}
                    className={`hami-profile-sigil-follow ${forumFollow.isFollowing ? 'is-following' : ''}`}
                    data-testid="lawyer-profile-follow"
                >
                    {forumFollow.isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
                    {forumFollow.isFollowing ? 'متابَع' : 'متابعة'}
                </button>
            ) : null}

            {!readOnly ? (
                <div className="hami-profile-sigil-constellation" aria-label="أدوات الصفحة">
                    {pageAccess && onCyclePageAccess ? (
                        <ProfilePageAccessControl
                            pageAccess={pageAccess}
                            busy={pageAccessBusy}
                            onCycle={onCyclePageAccess}
                        />
                    ) : null}

                    <button
                        type="button"
                        data-testid="lawyer-profile-settings"
                        onClick={onStudioClick}
                        onPointerDown={(event) => {
                            if (isPrimaryDragPointer(event)) onStudioWarm();
                            onStudioPointerDown(event);
                        }}
                        onPointerCancel={onStudioPointerCancel}
                        onPointerEnter={onStudioWarm}
                        onFocus={onStudioWarm}
                        className="hami-profile-sigil hami-profile-sigil--throne"
                        aria-label="استوديو الصفحة — تخصيص المظهر والمحتوى"
                    >
                        <span className="hami-profile-sigil-glyph" aria-hidden>
                            <Sparkles size={15} strokeWidth={2.1} />
                        </span>
                        استوديو
                    </button>

                    <button
                        type="button"
                        data-testid="lawyer-profile-edit"
                        onClick={onEditClick}
                        onPointerDown={onEditPointerDown}
                        onPointerCancel={onEditPointerCancel}
                        className="hami-profile-sigil hami-profile-sigil--edit"
                        aria-label="تعديل الملف الشخصي"
                    >
                        <span className="hami-profile-sigil-glyph" aria-hidden>
                            <Pencil size={15} strokeWidth={2.1} />
                        </span>
                        تعديل
                    </button>
                </div>
            ) : null}
        </div>
    );
});
