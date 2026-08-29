import React from 'react';
import { resolveLawyerTilePublicName } from '@/app/components/lawyer/dashboard/forumProfile/resolveLawyerTilePublicName';

export function ForumTileProfileName({ displayName }: { displayName: string }): React.ReactElement {
    const { name, badge } = resolveLawyerTilePublicName(displayName);
    return (
        <span className="hami-forum-tile-profile-pane">
            <span className="hami-forum-tile-copy">
                <span dir="rtl" lang="ar" className="hami-forum-tile-name">
                    {name}
                    {badge ? (
                        <>
                            {' '}
                            <span
                                data-testid="home-dev-lawyer-badge"
                                className="inline-flex align-middle rounded-md border border-[#E6C673]/35 bg-[#E6C673]/12 px-1 py-px text-[9px] font-bold text-[#E6C673]"
                            >
                                {badge}
                            </span>
                        </>
                    ) : null}
                </span>
            </span>
        </span>
    );
}
