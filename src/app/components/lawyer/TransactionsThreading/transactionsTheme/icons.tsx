import React from 'react';

type TxSvgIconProps = {
    className?: string;
};

function TxSvgIcon({ className, children }: TxSvgIconProps & { children: React.ReactNode }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            {children}
        </svg>
    );
}

export function ChevronRightIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <path d="m9 18 6-6-6-6" />
        </TxSvgIcon>
    );
}

export function PlusIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </TxSvgIcon>
    );
}
