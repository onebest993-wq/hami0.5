import React from 'react';
import { Camera } from '@/app/components/ui/icons/Camera';
import { PROFILE_THEME } from '../profileThemeClasses';
import type { LucideIcon } from 'lucide-react';

type ProfileHeroAvatarEditButtonProps = {
    uploading: 'avatar' | 'gallery' | null;
    avatarRef: React.RefObject<HTMLInputElement | null>;
};

/** Camera control overlaid on the hero portrait while editing — 44px hit, compact glyph. */
export function ProfileHeroAvatarEditButton({
    uploading,
    avatarRef,
}: ProfileHeroAvatarEditButtonProps) {
    return (
        <button
            type="button"
            disabled={uploading === 'avatar'}
            onClick={() => avatarRef.current?.click()}
            className={PROFILE_THEME.cameraBtn}
            aria-label="تغيير الصورة الشخصية"
            data-testid="lawyer-profile-avatar-camera"
        >
            <span className="hami-profile-camera-btn__glyph" aria-hidden>
                <Camera size={14} strokeWidth={2.2} />
            </span>
        </button>
    );
}

type ProfileHeroMetaChipsProps = {
    metaItems: { icon: LucideIcon; label: string; value: string }[];
};

/** Read-only meta chip row under identity — markup unchanged. */
export function ProfileHeroMetaChips({ metaItems }: ProfileHeroMetaChipsProps) {
    if (metaItems.length === 0) return null;
    return (
        <div className="hami-profile-hero-meta">
            {metaItems.map((item) => (
                <span key={item.label} className="hami-profile-hero-meta-chip">
                    <item.icon size={12} className={`${PROFILE_THEME.accentIcon} shrink-0`} />
                    <span className="truncate max-w-[150px]">{item.value}</span>
                </span>
            ))}
        </div>
    );
}

export function ProfileHeroForumMetrics({
    followerCount,
    postCount,
}: {
    followerCount: number;
    postCount: number;
}): React.ReactElement {
    return (
        <div className="hami-profile-forum-metrics hami-profile-forum-metrics--unified">
            <div className="hami-profile-forum-metric">
                <strong>{followerCount}</strong>
                <span>متابعون</span>
            </div>
            <div className="hami-profile-forum-metric">
                <strong>{postCount}</strong>
                <span>منشورات المنتدى</span>
            </div>
        </div>
    );
}
