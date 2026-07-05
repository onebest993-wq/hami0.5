import React from 'react';
import type { RoyalLawyerProfileProps } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { useRoyalLawyerProfile } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useRoyalLawyerProfile';
import { ProfileErrorBoundary } from '@/app/components/lawyer/RoyalLawyerProfile/ProfileErrorBoundary';
import { ProfileLoadingState } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileLoadingState';
import { ProfileBackBar } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileBackBar';
import { ProfileContent } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileContent';
import { MoroccanGlassOverlay } from '@/app/components/shared/MoroccanGlassOverlay';
import { resolveProfileAccentHex, resolveProfilePageBackground } from '@/app/services/profile/profilePageCustomization';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useProfilePageHidden } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfilePageHidden';
import '@/app/components/lawyer/RoyalLawyerProfile/profilePageFx.css';

export type { RoyalLawyerProfileProps } from '@/app/components/lawyer/RoyalLawyerProfile/types';

function RoyalLawyerProfileInner(props: RoyalLawyerProfileProps) {
    const { isScreenMode, onBack, forumFollow, screenActive = true } = props;
    const profile = useRoyalLawyerProfile(props);
    const reduceMotion = useReduceMotion();
    const pageHidden = useProfilePageHidden(screenActive);

    const accent = profile.customization.appearance.accentColor;
    const material = profile.customization.appearance.material;
    const pageBg = resolveProfilePageBackground(accent);

    return (
        <div
            className="relative z-[1] min-h-screen text-white overflow-x-hidden pb-[max(8rem,calc(env(safe-area-inset-bottom)+6rem))]"
            dir="rtl"
            data-lawyer-profile-root
            data-profile-material={material}
            data-profile-settings-open={profile.settingsOpen ? 'true' : undefined}
            data-profile-reduce-motion={reduceMotion ? 'true' : undefined}
            data-profile-page-hidden={pageHidden ? 'true' : undefined}
            style={
                {
                    '--profile-accent': resolveProfileAccentHex(accent),
                    '--profile-page-bg': pageBg,
                } as React.CSSProperties
            }
        >
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
                <div data-profile-page-texture className="absolute inset-0" />
                {material === 'ornate' ? (
                    <MoroccanGlassOverlay className="!rounded-none" opacity={0.05} />
                ) : null}
                <div className="absolute inset-0 hami-profile-ambient-glow" />
            </div>

            {isScreenMode && onBack ? <ProfileBackBar onBack={() => void profile.handleBack()} /> : null}

            {profile.loading && !profile.header ? (
                <ProfileLoadingState />
            ) : (
                <ProfileContent
                    {...profile}
                    readOnly={!profile.isOwnProfile}
                    forumFollow={forumFollow}
                />
            )}
        </div>
    );
}

export function RoyalLawyerProfile(props: RoyalLawyerProfileProps) {
    return (
        <ProfileErrorBoundary onBack={props.onBack}>
            <RoyalLawyerProfileInner {...props} />
        </ProfileErrorBoundary>
    );
}
