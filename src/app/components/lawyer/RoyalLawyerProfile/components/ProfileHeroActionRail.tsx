import React, { memo } from 'react';
import { Pencil, Sparkles, UserCheck, UserPlus } from 'lucide-react';
import type { ForumProfileFollowState } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfilePageAccess } from '@/app/services/profile/profilePageTypes';
import {
    ProfilePageAccessControl,
    getProfilePageAccessLegend,
} from './ProfilePageAccessControl';

export type ProfileHeroActionRailProps = {
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
    const privacyLegend = pageAccess ? getProfilePageAccessLegend(pageAccess) : '';

    return (
        <div className="hami-profile-sigil-deck" data-testid="lawyer-profile-action-rail">
            {showForumSocial && forumFollow ? (
                <button
                    type="button"
                    disabled={forumFollow.busy}
                    onClick={forumFollow.onToggle}
                    className={`hami-profile-sigil-follow ${forumFollow.isFollowing ? 'is-following' : ''}`}
                    data-testid="lawyer-profile-follow"
                >
                    <span className="hami-profile-sigil-follow-glyph" aria-hidden>
                        {forumFollow.isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                    </span>
                    <span className="hami-profile-sigil-follow-text">
                        {forumFollow.isFollowing ? 'متابَع' : 'متابعة'}
                    </span>
                </button>
            ) : null}

            {!readOnly ? (
                <>
                    <div className="hami-profile-sigil-constellation" aria-label="أدوات الصفحة">
                        {pageAccess && onCyclePageAccess ? (
                            <ProfilePageAccessControl
                                pageAccess={pageAccess}
                                busy={pageAccessBusy}
                                onCycle={onCyclePageAccess}
                            />
                        ) : null}

                        <div className="hami-profile-sigil-slot" data-sigil="studio">
                            <button
                                type="button"
                                data-testid="lawyer-profile-settings"
                                onClick={onStudioClick}
                                onPointerDown={(event) => {
                                    if (event.button === 0) onStudioWarm();
                                    onStudioPointerDown(event);
                                }}
                                onPointerCancel={onStudioPointerCancel}
                                onPointerEnter={onStudioWarm}
                                onFocus={onStudioWarm}
                                className="hami-profile-sigil hami-profile-sigil--throne"
                                aria-label="استوديو الصفحة — تخصيص المظهر والمحتوى"
                            >
                                <span className="hami-profile-sigil-halo" aria-hidden />
                                <span className="hami-profile-sigil-glyph" aria-hidden>
                                    <Sparkles size={18} strokeWidth={2.1} />
                                </span>
                            </button>
                            <span className="hami-profile-sigil-micro hami-profile-sigil-micro--throne">استوديو</span>
                        </div>

                        <div className="hami-profile-sigil-slot" data-sigil="edit">
                            <button
                                type="button"
                                data-testid="lawyer-profile-edit"
                                onClick={onEditClick}
                                onPointerDown={onEditPointerDown}
                                onPointerCancel={onEditPointerCancel}
                                className="hami-profile-sigil hami-profile-sigil--edit"
                                aria-label="تعديل الملف الشخصي"
                            >
                                <span className="hami-profile-sigil-halo" aria-hidden />
                                <span className="hami-profile-sigil-glyph" aria-hidden>
                                    <Pencil size={17} strokeWidth={2.15} />
                                </span>
                                <span className="hami-profile-sigil-edit-stroke" aria-hidden />
                            </button>
                            <span className="hami-profile-sigil-micro">تعديل</span>
                        </div>
                    </div>

                    {pageAccess ? (
                        <p className="hami-profile-sigil-legend" aria-live="polite">
                            <span className="hami-profile-sigil-legend-dot" data-page-access={pageAccess} aria-hidden />
                            <span>{privacyLegend}</span>
                            <span className="hami-profile-sigil-legend-hint">· اضغط الختم للتبديل</span>
                        </p>
                    ) : null}
                </>
            ) : null}
        </div>
    );
});
