import React from 'react';
import { ForumTileProfileName } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileName';
import { sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';
import { AccreditedLawyerMark } from '@/app/components/shared/AccreditedLawyerMark';

/** اسم + إطار الصورة — مشترك بين الهيكل والربع الحي */
export function ForumTileProfileQuarterChrome({
    displayName,
    accredited = false,
    children,
}: {
    displayName: string;
    accredited?: boolean;
    children: React.ReactNode;
}): React.ReactElement {
    return (
        <>
            <ForumTileProfileName displayName={sanitizeProfilePlainText(displayName, 80)} />
            <div className="hami-forum-tile-avatar-frame" data-testid="home-dock-forum-profile-avatar">
                {children}
                {accredited ? <AccreditedLawyerMark size="tile" /> : null}
            </div>
        </>
    );
}

export const FORUM_TILE_PROFILE_TAP_STYLE: React.CSSProperties = {
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
};
