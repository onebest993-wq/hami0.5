import React, { Suspense, lazy, useEffect, useState } from 'react';
import { ForumTileProfileQuarterFallback } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterFallback';
import {
    getCachedForumTileProfileQuarter,
    loadForumTileProfileQuarterModule,
} from '@/app/runtime/forumTileProfileQuarterLoader';
import type { ForumTileProfileQuarterSlotProps } from '@/app/components/lawyer/dashboard/forumProfile/forumTileProfileQuarterTypes';
import { HOME_MAIN_GRID_PAINTED_EVENT } from '@/app/bootstrap/bootEventNames';

const loadForumTileProfileQuarter = () =>
    loadForumTileProfileQuarterModule().then((m) => ({
        default: m.ForumTileProfileQuarter,
    }));

const LazyForumTileProfileQuarter = lazy(loadForumTileProfileQuarter);

function isHomeMainGridPaintedNow(): boolean {
    return typeof window !== 'undefined' && window.__hamiHomeMainGridPainted__ === true;
}

export function ForumTileProfileQuarterSlot({
    userId,
    userMetadata,
    disabled,
    onOpenProfile,
    onPrimeProfile,
    onPrimeProfilePress,
    chrome,
}: ForumTileProfileQuarterSlotProps) {
    const quarterProps = {
        userId,
        userMetadata,
        disabled,
        onOpenProfile,
        onPrimeProfile,
        onPrimeProfilePress,
        seedDisplayName: chrome?.displayName,
    };
    const fallback = (
        <ForumTileProfileQuarterFallback
            displayName={chrome?.displayName}
            profileInitial={chrome?.profileInitial}
            avatarUrl={chrome?.avatarUrl}
            showInitial={chrome?.showInitial}
            identitySettled={Boolean(chrome?.isLoaded)}
            disabled={disabled}
            userId={userId}
            userMetadata={userMetadata}
            onOpenProfile={onOpenProfile}
            onPrimeProfile={onPrimeProfile}
            onPrimeProfilePress={onPrimeProfilePress}
        />
    );

    const [allowQuarterChunk, setAllowQuarterChunk] = useState(isHomeMainGridPaintedNow);

    useEffect(() => {
        if (allowQuarterChunk) return;
        if (isHomeMainGridPaintedNow()) {
            setAllowQuarterChunk(true);
            return;
        }
        const onPainted = () => setAllowQuarterChunk(true);
        window.addEventListener(HOME_MAIN_GRID_PAINTED_EVENT, onPainted);
        return () => window.removeEventListener(HOME_MAIN_GRID_PAINTED_EVENT, onPainted);
    }, [allowQuarterChunk]);

    const CachedQuarter = getCachedForumTileProfileQuarter();
    if (allowQuarterChunk && CachedQuarter) {
        return <CachedQuarter {...quarterProps} />;
    }
    if (!allowQuarterChunk) {
        return fallback;
    }
    return (
        <Suspense fallback={fallback}>
            <LazyForumTileProfileQuarter {...quarterProps} />
        </Suspense>
    );
}

