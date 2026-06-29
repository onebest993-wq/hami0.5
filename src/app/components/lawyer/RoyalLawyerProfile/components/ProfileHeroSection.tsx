import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Camera, Edit3, MapPin, Phone, Shield, Sparkles, UserCheck, UserPlus } from 'lucide-react';
import type { ForumProfileFollowState } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { LawyerProfileHeader } from '@/app/services/lawyer-cloud';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { PROFILE_THEME } from '../profileThemeClasses';
import { ProfileAvatarImage } from './ProfileAvatarImage';
import { ProfileFloatingPortrait } from './ProfileFloatingPortrait';
import { MoroccanGlassFrame } from '@/app/components/shared/MoroccanGlassOverlay';
import { prefetchProfileSettingsSheet } from '@/app/utils/lazyComponents';

const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
};

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
    settingsOpen?: boolean;
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
    settingsOpen = false,
    startEdit,
    openSettings,
}: ProfileHeroSectionProps) {
    const reduceMotion = useReduceMotion();
    return (
        <div className="hami-profile-hero-wrap px-4">
            <motion.div
                initial={reduceMotion ? false : fadeUp.initial}
                animate={fadeUp.animate}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="hami-profile-hero-card">
                    <div className="hami-profile-hero-aurora" aria-hidden />
                    <div className="hami-profile-hero-portrait-slot">
                        <div className="relative">
                            <ProfileFloatingPortrait paused={settingsOpen}>
                                {header?.profileImage ? (
                                    <ProfileAvatarImage src={header.profileImage} />
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
                                    className={`absolute -bottom-2 -left-3 w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center shadow-lg border-2 border-[#030508] z-30 ${PROFILE_THEME.cameraBtn}`}
                                    aria-label="تغيير الصورة الشخصية"
                                >
                                    <Camera size={15} />
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
                                <div className="space-y-3 text-right">
                                    <input
                                        data-testid="lawyer-profile-name-input"
                                        value={draft.header.name}
                                        onChange={(e) =>
                                            setDraft({
                                                ...draft,
                                                header: { ...draft.header, name: e.target.value },
                                            })
                                        }
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

                        {!isEditing ? (
                            <>
                                <div className="hami-profile-hero-divider" aria-hidden />
                                {forumFollow &&
                                (forumFollow.postCount !== undefined || forumFollow.followerCount !== undefined) ? (
                                    <div className="hami-profile-forum-metrics">
                                        <div className="hami-profile-forum-metric">
                                            <strong>{forumFollow.followerCount ?? 0}</strong>
                                            <span>متابعون</span>
                                        </div>
                                        <div className="hami-profile-forum-metric">
                                            <strong>{forumFollow.postCount ?? 0}</strong>
                                            <span>منشورات المنتدى</span>
                                        </div>
                                    </div>
                                ) : null}
                                <div className="hami-profile-action-rail">
                                    {forumFollow ? (
                                        <button
                                            type="button"
                                            disabled={forumFollow.busy}
                                            onClick={forumFollow.onToggle}
                                            className={`hami-profile-action-secondary ${
                                                forumFollow.isFollowing
                                                    ? '!bg-emerald-950/35 !border-emerald-500/25 !text-emerald-300'
                                                    : 'hami-profile-accent-btn border'
                                            }`}
                                        >
                                            {forumFollow.isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                                            {forumFollow.isFollowing ? 'متابَع' : 'متابعة'}
                                        </button>
                                    ) : null}
                                    {!readOnly ? (
                                        <>
                                            <button
                                                type="button"
                                                data-testid="lawyer-profile-edit"
                                                onClick={startEdit}
                                                className="hami-profile-action-secondary"
                                            >
                                                <Edit3 size={15} />
                                                تعديل
                                            </button>
                                            <button
                                                type="button"
                                                data-testid="lawyer-profile-settings"
                                                onClick={openSettings}
                                                onPointerDown={(event) => {
                                                    if (event.button === 0) prefetchProfileSettingsSheet();
                                                }}
                                                onPointerEnter={prefetchProfileSettingsSheet}
                                                onFocus={prefetchProfileSettingsSheet}
                                                className="hami-profile-studio-btn"
                                                aria-label="استوديو الصفحة"
                                            >
                                                <Sparkles size={15} strokeWidth={2.2} />
                                                <span>الاستوديو</span>
                                            </button>
                                        </>
                                    ) : null}
                                </div>
                            </>
                        ) : null}
                    </MoroccanGlassFrame>
                </div>
            </motion.div>
        </div>
    );
});
