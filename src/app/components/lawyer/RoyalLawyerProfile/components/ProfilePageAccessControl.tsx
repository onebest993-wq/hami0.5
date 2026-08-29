import React, { memo, useCallback, useState } from 'react';
import { Globe } from '@/app/components/ui/icons/Globe';
import { Lock } from '@/app/components/ui/icons/Lock';
import { Users } from '@/app/components/ui/icons/Users';
import type { ProfilePageAccess } from '@/app/services/profile/profilePageTypes';
import { getProfilePageAccessMeta } from '@/app/services/profile/profilePageAccess';

const ACCESS_ICONS: Record<ProfilePageAccess, typeof Globe> = {
    public: Globe,
    followers: Users,
    private: Lock,
};

type ProfilePageAccessControlProps = {
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
        <button
            type="button"
            data-testid="lawyer-profile-page-access"
            data-page-access={pageAccess}
            disabled={busy}
            onClick={handleClick}
            className={`hami-profile-sigil hami-profile-sigil--privacy ${busy ? 'is-busy' : ''}`}
            aria-label={`خصوصية الصفحة: ${meta.label}. اضغط للتبديل`}
        >
            <span key={`${pageAccess}-${pulseKey}`} className="hami-profile-sigil-glyph" aria-hidden>
                <Icon size={15} strokeWidth={2.1} />
            </span>
            <span aria-live="polite">{meta.shortLabel}</span>
        </button>
    );
});
