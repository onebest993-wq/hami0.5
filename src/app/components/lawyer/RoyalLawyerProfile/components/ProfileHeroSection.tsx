import React, { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { EditDraft, ForumProfileFollowState } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { LawyerProfileHeader } from '@/app/services/lawyer-cloud';
import type { ProfilePageAccess } from '@/app/services/profile/profilePageTypes';
import { PROFILE_THEME } from '../profileThemeClasses';
import { ProfileAvatarImage } from './ProfileAvatarImage';
import { ProfileFloatingPortrait } from './ProfileFloatingPortrait';
import { ProfileHeroActionRail } from './ProfileHeroActionRail';
import { ProfileHeroAvatarEditButton, ProfileHeroForumMetrics, ProfileHeroMetaChips } from './ProfileHeroMetaParts';
import { ProfileHeroIdentityZone } from './ProfileHeroIdentityZone';
import { prefetchProfileSettingsSheet } from '@/app/utils/lazyComponentsIntent';
import { useArmedPointerAction } from '../hooks/useArmedPointerAction';
import { useProfileHeroNameInputFocus } from '../hooks/useProfileHeroNameInputFocus';
import { isPrimaryDragPointer } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';
import { AccreditedLawyerMark } from '@/app/components/shared/AccreditedLawyerMark';
import type { DisplayNamePolicy } from '@/app/domain/profile/displayNameCorrection';

type ProfileHeroSectionProps = {
    isEditing: boolean;
    readOnly: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    header: LawyerProfileHeader | undefined;
    initials: string;
    displayNamePublic: string;
    syndicateIdPublic: string | undefined;
    showSyndicate: boolean | string | undefined;
    metaItems: { icon: LucideIcon; label: string; value: string }[];
    uploading: 'avatar' | 'gallery' | null;
    avatarRef: React.RefObject<HTMLInputElement | null>;
    forumFollow?: ForumProfileFollowState;
    pageAccess?: ProfilePageAccess;
    pageAccessBusy?: boolean;
    onCyclePageAccess?: () => void;
    profileViewAllowed?: boolean;
    startEdit: () => void;
    openSettings: () => void;
    /** صفحة الفتح — صفّر التعديل من pointerdown قبل أن يُزال الغطاء */
    armEditOnPointerDown?: boolean;
    isScreenMode?: boolean;
    accredited?: boolean;
    displayNamePolicy?: DisplayNamePolicy | null;
};

export const ProfileHeroSection = memo(function ProfileHeroSection({
    isEditing,
    readOnly,
    draft,
    setDraft,
    header,
    initials,
    displayNamePublic,
    syndicateIdPublic,
    showSyndicate,
    metaItems,
    uploading,
    avatarRef,
    forumFollow,
    pageAccess,
    pageAccessBusy,
    onCyclePageAccess,
    profileViewAllowed = true,
    startEdit,
    openSettings,
    isScreenMode = false,
    accredited = false,
    displayNamePolicy = null,
    armEditOnPointerDown = false,
}: ProfileHeroSectionProps) {
    const studioPointer = useArmedPointerAction(
        () => {
            prefetchProfileSettingsSheet();
            openSettings();
        },
        { armOnPointerDown: armEditOnPointerDown },
    );
    useProfileHeroNameInputFocus(isEditing, readOnly);
    const initialsFace = (
        <div
            className={`w-full h-full flex items-center justify-center text-2xl font-bold ${PROFILE_THEME.avatarInitials}`}
        >
            {initials}
        </div>
    );
    const showForumSocial =
        forumFollow && (profileViewAllowed || pageAccess === 'followers');
    const hasForumMetrics = Boolean(
        showForumSocial &&
            forumFollow &&
            (forumFollow.postCount !== undefined || forumFollow.followerCount !== undefined),
    );
    const showToolsPanel =
        !readOnly || (!isScreenMode && Boolean(showForumSocial && forumFollow));

    return (
        <div className="hami-profile-hero-wrap">
            <div className="hami-profile-hero-identity-row">
                <div className="hami-profile-hero-portrait-slot">
                    <ProfileFloatingPortrait>
                        {header?.profileImage ? (
                            <ProfileAvatarImage
                                src={header.profileImage}
                                fallback={initialsFace}
                                priority
                            />
                        ) : (
                            initialsFace
                        )}
                    </ProfileFloatingPortrait>
                    {isEditing && !readOnly ? (
                        <ProfileHeroAvatarEditButton uploading={uploading} avatarRef={avatarRef} />
                    ) : null}
                    {accredited ? <AccreditedLawyerMark size="portrait" /> : null}
                </div>
                <ProfileHeroIdentityZone
                    isEditing={isEditing}
                    readOnly={readOnly}
                    draft={draft}
                    setDraft={setDraft}
                    displayNamePublic={displayNamePublic}
                    syndicateIdPublic={syndicateIdPublic}
                    showSyndicate={showSyndicate}
                    displayNamePolicy={displayNamePolicy}
                />
            </div>

            {!isEditing ? <ProfileHeroMetaChips metaItems={metaItems} /> : null}

            {!isEditing && hasForumMetrics ? (
                <ProfileHeroForumMetrics
                    followerCount={forumFollow!.followerCount ?? 0}
                    postCount={forumFollow!.postCount ?? 0}
                />
            ) : null}

            {!isEditing && showToolsPanel ? (
                <ProfileHeroActionRail
                    readOnly={readOnly}
                    forumFollow={forumFollow}
                    showForumSocial={Boolean(showForumSocial)}
                    pageAccess={pageAccess}
                    pageAccessBusy={pageAccessBusy}
                    onCyclePageAccess={onCyclePageAccess}
                    onEditClick={() => {
                        startEdit();
                    }}
                    onEditPointerDown={(event) => {
                        if (!armEditOnPointerDown || !isPrimaryDragPointer(event)) return;
                        startEdit();
                    }}
                    onEditPointerCancel={() => undefined}
                    onStudioClick={studioPointer.onClick}
                    onStudioPointerDown={studioPointer.onPointerDown}
                    onStudioPointerCancel={studioPointer.onPointerCancel}
                    onStudioWarm={prefetchProfileSettingsSheet}
                />
            ) : null}
        </div>
    );
});
