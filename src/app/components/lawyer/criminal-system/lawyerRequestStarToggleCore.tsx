import React from 'react';

export const requestCardStarredClass = (isStarred?: boolean) =>
    isStarred === true ? 'border-[#E6C673]/50 ring-1 ring-[#E6C673]/40' : '';

export const RequestStarToggle = ({
    starred,
    disabled,
    onToggle,
    className = '',
}: {
    starred: boolean;
    disabled?: boolean;
    onToggle: () => void;
    className?: string;
}) => (
    <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
            e.stopPropagation();
            onToggle();
        }}
        aria-label={starred ? 'إلغاء تمييز القرار' : 'تمييز قرار مصيري'}
        className={`shrink-0 text-[14px] leading-none transition disabled:opacity-40 ${className} ${
            starred ? 'text-[#E6C673]' : 'text-white/30 hover:text-[#E6C673]/70'
        }`}
    >
        {starred ? '⭐️' : '☆'}
    </button>
);
