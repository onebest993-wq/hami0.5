import React from 'react';

const FILTER_BOOT_ROWS = [0, 1, 2, 3, 4, 5] as const;

export function RepositoryClassificationBootFallback() {
    return (
        <div
            className="hami-repository-filter-deck"
            data-testid="repository-classification-boot"
            aria-busy="true"
            aria-label="التصنيفات"
        >
            {FILTER_BOOT_ROWS.map((key) => (
                <div
                    key={key}
                    className="mb-1 min-h-[44px] rounded-xl bg-white/[0.04]"
                    aria-hidden
                />
            ))}
        </div>
    );
}
