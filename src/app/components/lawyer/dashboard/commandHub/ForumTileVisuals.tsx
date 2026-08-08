import React, { memo } from 'react';
import { ForumMeridianEmblem } from './ForumMeridianEmblem';

export const ForumMeridianBody = memo(function ForumMeridianBody({
    title,
    accent,
}: {
    title: string;
    accent: string;
}) {
    return (
        <div
            className="hami-forum-meridian-body relative z-10 h-full min-h-0 w-full"
            style={{ '--hami-forum-accent': accent } as React.CSSProperties}
        >
            <div className="hami-forum-meridian-shear pointer-events-none" aria-hidden data-hami-forum-shear="" />
            <div className="hami-forum-meridian-pod pointer-events-none" aria-hidden>
                <ForumMeridianEmblem />
            </div>
            <div className="hami-forum-meridian-copy" dir="rtl">
                <p
                    className="hami-forum-meridian-title hami-hub-title hami-hub-title-crystal"
                    style={{ '--hami-hub-title-accent': accent } as React.CSSProperties}
                >
                    {title}
                </p>
            </div>
        </div>
    );
});
