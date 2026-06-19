import React from 'react';
import { motion } from 'motion/react';
import type { RoyalLawyerProfileProps } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { useRoyalLawyerProfile } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useRoyalLawyerProfile';
import { ProfileErrorBoundary } from '@/app/components/lawyer/RoyalLawyerProfile/ProfileErrorBoundary';
import { ProfileLoadingState } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileLoadingState';
import { ProfileBackBar } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileBackBar';
import { ProfileContent } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileContent';
import { MoroccanGlassOverlay } from '@/app/components/shared/MoroccanGlassOverlay';

export type { RoyalLawyerProfileProps } from '@/app/components/lawyer/RoyalLawyerProfile/types';

function RoyalLawyerProfileInner({ isScreenMode, onBack }: RoyalLawyerProfileProps) {
    const profile = useRoyalLawyerProfile();

    if (profile.loading) {
        return <ProfileLoadingState />;
    }

    return (
        <motion.div
            className="relative min-h-screen bg-[#020408] text-white overflow-x-hidden pb-32"
            dir="rtl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
        >
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
                <MoroccanGlassOverlay opacity={0.045} />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(230,198,115,0.12),transparent)]" />
                <div className="absolute top-0 right-0 w-[480px] h-[480px] rounded-full bg-[#E6C673]/[0.05] blur-[140px]" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-teal-500/[0.04] blur-[120px]" />
            </div>

            {isScreenMode && onBack ? (
                <ProfileBackBar onBack={onBack} />
            ) : null}

            <ProfileContent {...profile} />
        </motion.div>
    );
}

export function RoyalLawyerProfile(props: RoyalLawyerProfileProps) {
    return (
        <ProfileErrorBoundary onBack={props.onBack}>
            <RoyalLawyerProfileInner {...props} />
        </ProfileErrorBoundary>
    );
}
