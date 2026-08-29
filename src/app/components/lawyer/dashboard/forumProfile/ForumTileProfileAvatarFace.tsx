import React from 'react';
import { imgFetchPriorityAttr } from '@/app/utils/imgFetchPriority';

function ProfileInitialLetter({ profileInitial }: { profileInitial: string }): React.ReactElement {
    return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1d28] to-[#0A0F1C]">
            <span className="text-[#E6C673] font-bold text-2xl leading-none" aria-hidden>
                {profileInitial}
            </span>
        </div>
    );
}

/** وجه الدائرة فقط — مشترك بين الهيكل والربع الحي بلا اختلاف بصري */
export function ForumTileProfileAvatarFace({
    avatarUrl = '',
    profileInitial,
    showInitial,
    image = null,
}: {
    avatarUrl?: string;
    profileInitial: string;
    showInitial: boolean;
    image?: React.ReactNode;
}): React.ReactElement {
    if (image) {
        return <>{image}</>;
    }
    /* الحرف حتى يفك ProfileAvatarImage الإطار — img خام يفرّغ الدائرة */
    if (showInitial || profileInitial) {
        return <ProfileInitialLetter profileInitial={profileInitial || 'م'} />;
    }
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt=""
                decoding="sync"
                {...imgFetchPriorityAttr('high')}
                className="block w-full h-full object-cover object-center bg-[#0A0F1C]"
            />
        );
    }
    return <ProfileInitialLetter profileInitial="م" />;
}
