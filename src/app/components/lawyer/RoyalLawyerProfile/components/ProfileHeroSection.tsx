import React, { memo, useRef } from 'react';
import { Camera, Phone, Shield } from 'lucide-react';
import type { ForumProfileFollowState } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { LawyerProfileHeader } from '@/app/services/lawyer-cloud';
import type { ProfilePageAccess } from '@/app/services/profile/profilePageTypes';
import { PROFILE_THEME } from '../profileThemeClasses';
import { ProfileAvatarImage } from './ProfileAvatarImage';
import { ProfileFloatingPortrait } from './ProfileFloatingPortrait';
import { ProfileHeroActionRail } from './ProfileHeroActionRail';
import { MoroccanGlassFrame } from '@/app/components/shared/MoroccanGlassOverlay';
import { prefetchProfileSettingsSheet } from '@/app/utils/lazyComponents';

function useArmedPointerAction(action: () => boolean | void) {
    const armedRef = useRef(false);
    return {
        onClick: () => {
            if (armedRef.current) {
                armedRef.current = false;
                return;
            }
            action();
        },
        onPointerDown: (event: React.PointerEvent) => {
            if (event.button !== 0) return;
            const ok = action();
            /* لا تبتلع الـ click إن رُفض الفعل (مثلاً استوديو يحفظ) */
            armedRef.current = ok !== false;
        },
        onPointerCancel: () => {
            armedRef.current = false;
        },
    };
}

export type ProfileHeroSectionProps = {
    isEditing: boolean;
    readOnly: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    header: LawyerProfileHeader | undefined;
    initials: string;
    displayNamePublic: string;
    syndicateIdPublic: string | undefined;
    showSyndicate: boolean | string | undefined;
    metaItems: { icon: typeof Phone; label: string; value: string }[];
    uploading: 'avatar' | 'gallery' | null;
    avatarRef: React.RefObject<HTMLInputElement | null>;
    ornatePattern: boolean;
    forumFollow?: ForumProfileFollowState;
    pageAccess?: ProfilePageAccess;
    pageAccessBusy?: boolean;
    onCyclePageAccess?: () => void;
    profileViewAllowed?: boolean;
    startEdit: () => void;
    openSettings: () => void;
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
    ornatePattern,
    forumFollow,
    pageAccess,
    pageAccessBusy,
    onCyclePageAccess,
    profileViewAllowed = true,
    startEdit,
    openSettings,
}: ProfileHeroSectionProps) {
    const editPointer = useArmedPointerAction(startEdit);
    const studioPointer = useArmedPointerAction(() => {
        prefetchProfileSettingsSheet();
        openSettings();
    });
    const showForumSocial =
        forumFollow && (profileViewAllowed || pageAccess === 'followers');
    const hasForumMetrics = Boolean(
        showForumSocial &&
            forumFollow &&
            (forumFollow.postCount !== undefined || forumFollow.followerCount !== undefined),
    );
    const showToolsPanel = !readOnly || Boolean(showForumSocial && forumFollow);

    return (
        <div className="hami-profile-hero-wrap px-4">
            <div className="hami-profile-hero-card">
                <div className="hami-profile-hero-portrait-slot">
                    <div className="relative">
                        <ProfileFloatingPortrait>
                            {header?.profileImage ? (
                                <ProfileAvatarImage
                                    src={header.profileImage}
                                    fallback={
                                        <div
                                            className={`w-full h-full flex items-center justify-center text-4xl font-bold ${PROFILE_THEME.avatarInitials}`}
                                        >
                                            {initials}
                                        </div>
                                    }
                                />
                            ) : (
                                <div
                                    className={`w-full h-full flex items-center justify-center text-4xl font-bold ${PROFILE_THEME.avatarInitials}`}
                                >
                                    {initials}
                                </div>
                            )}
                        </ProfileFloatingPortrait>
                        {isEditing && !readOnly ? (
                            <button
                                type="button"
                                disabled={uploading === 'avatar'}
                                onClick={() => avatarRef.current?.click()}
                                className={`absolute bottom-1 left-1 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center z-30 ${PROFILE_THEME.cameraBtn}`}
                                aria-label="تغيير الصورة الشخصية"
                                data-testid="lawyer-profile-avatar-camera"
                            >
                                <Camera size={16} strokeWidth={2} />
                            </button>
                        ) : null}
                    </div>
                </div>

                <MoroccanGlassFrame
                    profilePanel
                    ornatePattern={ornatePattern}
                    className="hami-profile-hero-panel"
                    patternOpacity={0.09}
                    clip={false}
                >
                    <div
                        className={`absolute top-0 inset-x-10 h-px z-[2] ${PROFILE_THEME.identityLine}`}
                        aria-hidden
                    />

                    <div className="text-center w-full">
                        {isEditing && draft ? (
                            <div className="space-y-2 text-right">
                                <input
                                    data-testid="lawyer-profile-name-input"
                                    value={draft.header.name}
                                    maxLength={80}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setDraft((prev) =>
                                            prev
                                                ? { ...prev, header: { ...prev.header, name } }
                                                : prev,
                                        );
                                    }}
                                    className={PROFILE_THEME.input}
                                    placeholder="الاسم الكامل"
                                />
                            </div>
                        ) : (
                            <>
                                <h1 className="hami-profile-hero-name px-1">{displayNamePublic}</h1>
                                {showSyndicate ? (
                                    <div className={`hami-profile-hero-badge border ${PROFILE_THEME.accentChip}`}>
                                        <Shield size={12} />
                                        نقابة المحامين · {syndicateIdPublic}
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>

                    {!isEditing && metaItems.length > 0 ? (
                        <div className="hami-profile-hero-meta">
                            {metaItems.map((item) => (
                                <span key={item.label} className="hami-profile-hero-meta-chip">
                                    <item.icon size={12} className={`${PROFILE_THEME.accentIcon} shrink-0`} />
                                    <span className="truncate max-w-[150px]">{item.value}</span>
                                </span>
                            ))}
                        </div>
                    ) : null}

                    {!isEditing && showToolsPanel ? (
                        <div className="hami-profile-hero-tools">
                            {hasForumMetrics ? (
                                <div className="hami-profile-forum-metrics hami-profile-forum-metrics--unified">
                                    <div className="hami-profile-forum-metric">
                                        <strong>{forumFollow!.followerCount ?? 0}</strong>
                                        <span>متابعون</span>
                                    </div>
                                    <div className="hami-profile-forum-metric">
                                        <strong>{forumFollow!.postCount ?? 0}</strong>
                                        <span>منشورات المنتدى</span>
                                    </div>
                                </div>
                            ) : null}
                            <ProfileHeroActionRail
                                readOnly={readOnly}
                                forumFollow={forumFollow}
                                showForumSocial={Boolean(showForumSocial)}
                                pageAccess={pageAccess}
                                pageAccessBusy={pageAccessBusy}
                                onCyclePageAccess={onCyclePageAccess}
                                onEditClick={editPointer.onClick}
                                onEditPointerDown={editPointer.onPointerDown}
                                onEditPointerCancel={editPointer.onPointerCancel}
                                onStudioClick={studioPointer.onClick}
                                onStudioPointerDown={studioPointer.onPointerDown}
                                onStudioPointerCancel={studioPointer.onPointerCancel}
                                onStudioWarm={prefetchProfileSettingsSheet}
                            />
                        </div>
                    ) : null}
                </MoroccanGlassFrame>
            </div>
        </div>
    );
});
