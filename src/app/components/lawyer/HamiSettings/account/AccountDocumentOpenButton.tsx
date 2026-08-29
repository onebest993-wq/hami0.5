import React from 'react';
import { prefetchAccountLegalDocuments } from './accountLegalContentLoad';

export function AccountDocumentOpenButton({
    label,
    testId,
    onOpen,
}: {
    label: string;
    testId: string;
    onOpen: () => void;
}) {
    return (
        <button
            type="button"
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                prefetchAccountLegalDocuments();
            }}
            onClick={onOpen}
            data-testid={testId}
            aria-label={label}
            className="text-[#E6C673] text-xs font-bold min-h-[44px] min-w-[44px] px-2 touch-manipulation inline-flex items-center hover:text-[#F7EBC4]"
        >
            عرض
        </button>
    );
}
