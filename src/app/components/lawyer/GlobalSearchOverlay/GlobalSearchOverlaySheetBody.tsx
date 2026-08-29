import React, { type ReactNode } from 'react';
import { GlobalSearchSheetHandle } from '@/app/components/lawyer/GlobalSearchOverlay/components/GlobalSearchSheetHandle';
import { SearchHeader, type SearchHeaderProps } from '@/app/components/lawyer/GlobalSearchOverlay/components/SearchHeader';

export function GlobalSearchOverlaySheetBody({
    children,
    ...header
}: SearchHeaderProps & { children: ReactNode }) {
    return (
        <>
            <GlobalSearchSheetHandle onClose={header.onClose} enabled={header.open !== false} />
            <SearchHeader {...header} />
            {children}
        </>
    );
}
