import React, { memo, useCallback, useState } from 'react';
import { Globe, Lock, Users } from 'lucide-react';
import type { ProfilePageAccess } from '@/app/services/profile/profilePageTypes';
import { getProfilePageAccessMeta } from '@/app/services/profile/profilePageAccess';

const ACCESS_ICONS: Record<ProfilePageAccess, typeof Globe> = {
    public: Globe,
    followers: Users,
    private: Lock,
};

export type ProfilePageAccessControlProps = {
    pageAccess: ProfilePageAccess;
    busy?: boolean;
    onCycle: () => void;
};

export const ProfilePageAccessControl = memo(function ProfilePageAccessControl({
    pageAccess,
    busy = false,
    onCycle,
}: ProfilePageAccessControlProps) {
    const meta = getProfilePageAccessMeta(pageAccess);
    const Icon = ACCESS_ICONS[pageAccess];
    const [pulseKey, setPulseKey] = useState(0);

    const handleClick = useCallback(() => {
        if (busy) return;
        setPulseKey((k) => k + 1);
        onCycle();
    }, [busy, onCycle]);

    return (
        <div className="hami-profile-sigil-slot" data-sigil="privacy">
            <button
                type="button"
                data-testid="lawyer-profile-page-access"
                data-page-access={pageAccess}
                disabled={busy}
                onClick={handleClick}
                className={`hami-profile-sigil hami-profile-sigil--privacy ${busy ? 'is-busy' : ''}`}
                aria-label={`خصوصية الصفحة: ${meta.label}. اضغط للتبديل`}
            >
                <span className="hami-profile-sigil-halo" aria-hidden />
                <span className="hami-profile-sigil-orbit" aria-hidden />
                <span key={`${pageAccess}-${pulseKey}`} className="hami-profile-sigil-glyph" aria-hidden>
                    <Icon size={18} strokeWidth={2.15} />
                </span>
                <span key={`ripple-${pulseKey}`} className="hami-profile-sigil-ripple" aria-hidden />
            </button>
            <span className="hami-profile-sigil-micro">خصوصية</span>
        </div>
    );
});

export function getProfilePageAccessLegend(pageAccess: ProfilePageAccess): string {
    return getProfilePageAccessMeta(pageAccess).label;
}
