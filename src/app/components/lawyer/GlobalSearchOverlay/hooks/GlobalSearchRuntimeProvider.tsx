import React, { createContext, useContext, useMemo } from 'react';
import type Fuse from 'fuse.js';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import type { GlobalSearchExtras } from '@/app/services/globalSearchLoad';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LawsuitLifecycleIndex } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import { useSearchExtras } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchExtras';
import { useSearchIndex } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchIndex';

export type GlobalSearchRuntimeProviderProps = {
    children: React.ReactNode;
    overlayOpen: boolean;
    warmIndex?: boolean;
    files: FileData[];
    executionFiles?: (FileData & { executionTrashDeletedAt?: string | null })[];
    lawsuitLifecycleIndex?: LawsuitLifecycleIndex;
    globalNotes: { id: number | string; title?: string; body?: string; type?: string }[];
    notifications?: { id: string; title: string; message: string; type: string }[];
    criminalCases?: unknown[];
    userId: string | null;
    indexVersion?: number;
};

type GlobalSearchRuntimeValue = {
    fuse: Fuse<GlobalSearchEntry> | null;
    extras: GlobalSearchExtras | null;
    isLoadingIndex: boolean;
    isEnrichingIndex: boolean;
};

const GlobalSearchRuntimeContext = createContext<GlobalSearchRuntimeValue | null>(null);

export function GlobalSearchRuntimeProvider({
    children,
    overlayOpen,
    warmIndex = false,
    files,
    executionFiles,
    lawsuitLifecycleIndex,
    globalNotes,
    notifications,
    criminalCases = [],
    userId,
    indexVersion = 0,
}: GlobalSearchRuntimeProviderProps) {
    const indexActive = overlayOpen || warmIndex;
    const { extras, profileLine, isLoadingExtras } = useSearchExtras({
        userId,
        overlayOpen: indexActive,
    });

    const { fuse, isBuildingIndex } = useSearchIndex({
        files,
        executionFiles,
        lawsuitLifecycleIndex,
        globalNotes,
        notifications,
        criminalCases,
        userId,
        profileLine,
        extras,
        isLoadingExtras,
        indexVersion,
        overlayOpen: indexActive,
    });

    const value = useMemo<GlobalSearchRuntimeValue>(
        () => ({
            fuse,
            extras,
            isLoadingIndex: !fuse && isBuildingIndex,
            isEnrichingIndex: Boolean(fuse) && isBuildingIndex,
        }),
        [fuse, extras, isBuildingIndex],
    );

    return <GlobalSearchRuntimeContext.Provider value={value}>{children}</GlobalSearchRuntimeContext.Provider>;
}

export function useGlobalSearchRuntime(): GlobalSearchRuntimeValue {
    const ctx = useContext(GlobalSearchRuntimeContext);
    if (!ctx) {
        throw new Error('useGlobalSearchRuntime must be used within GlobalSearchRuntimeProvider');
    }
    return ctx;
}
