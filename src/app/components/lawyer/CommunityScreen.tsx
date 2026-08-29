import React, { useEffect } from 'react';

import { inertProps } from '@/app/utils/inertProps';
import type { CommunityScreenControllerProps } from './CommunityScreen/hooks/useCommunityScreenController';
import {
    CommunityScreenContent,
    type CommunityScreenContentProps,
} from './CommunityScreen/CommunityScreenContent';
import { prefetchPersistedCommunitySectionChunk } from './CommunityScreen/communityScreenLazySections';

export type CommunityScreenProps = CommunityScreenControllerProps & {
    /** Host keepAlive — المحتوى مركّب مخفياً قبل أول نقرة */
    keepAlive?: boolean;
    /** false = سطح دافئ مخفي؛ true/undefined = مفتوح للعرض */
    isOpen?: boolean;
};

type ContentComponent = React.ComponentType<CommunityScreenContentProps>;

/**
 * منتدى الزملاء — محتوى متزامن (بلا BootShell/Suspense للـ chunk).
 * الفتح = isOpen على شجرة جاهزة؛ التسخين عبر forumIntentWarm + Host keepAlive.
 */
export function CommunityScreen(props: CommunityScreenProps) {
    const isOpen = props.isOpen !== false;
    const keepAlive = props.keepAlive === true;

    useEffect(() => {
        if (!isOpen) return;
        prefetchPersistedCommunitySectionChunk();
    }, [isOpen]);

    if (!isOpen && !keepAlive) {
        return null;
    }

    return (
        <div
            className={`h-full w-full ${isOpen ? 'hami-forum-surface-enter' : ''}`}
            data-testid="forum-screen-shell"
            data-forum-open={isOpen ? '1' : '0'}
            hidden={!isOpen}
            aria-hidden={!isOpen}
            {...inertProps(!isOpen)}
        >
            <CommunityScreenContent {...props} isOpen={isOpen} />
        </div>
    );
}

/** توافق — المحتوى متزامن؛ الدالة تُحل فوراً */
export function ensureCommunityScreenContentLoaded(): Promise<ContentComponent> {
    return Promise.resolve(CommunityScreenContent);
}