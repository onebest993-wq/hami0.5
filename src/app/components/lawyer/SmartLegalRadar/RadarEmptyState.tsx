import React from 'react';

/** ╪ص╪د┘╪ر ┬س┘╪د ┘à┘ê╪د╪╣┘è╪»┬╗ ظ¤ ┘╪╡ ┘ç╪د╪»╪خ ╪ذ┘╪د ╪ث┘è┘é┘ê┘╪ر ┘ê┘╪د ╪ص╪┤┘ê */
export const EmptyState = React.memo(function EmptyState() {
    return (
        <div
            className="flex flex-col items-center justify-center py-4 px-3 text-center"
            data-testid="radar-empty-state"
        >
            <p className="text-[12px] text-[#E8DCC8]/50">┘╪د ╪ز┘ê╪ش╪» ┘à┘ê╪د╪╣┘è╪» ┘┘ç╪░╪د ╪د┘┘è┘ê┘à</p>
        </div>
    );
});
