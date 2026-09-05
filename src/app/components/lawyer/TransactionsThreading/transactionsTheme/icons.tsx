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

export function SearchIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </TxSvgIcon>
    );
}

export function MoreVerticalIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <circle cx="12" cy="5" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="19" r="1" fill="currentColor" />
        </TxSvgIcon>
    );
}

export function ShareIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.6 13.5 6.8 4" />
            <path d="m15.4 6.5-6.8 4" />
        </TxSvgIcon>
    );
}

export function BookOpenIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <path d="M12 7v13" />
            <path d="M4 6c3-1.5 6-1.5 8 0v13c-2-1.5-5-1.5-8 0V6Z" />
            <path d="M20 6c-3-1.5-6-1.5-8 0v13c2-1.5 5-1.5 8 0V6Z" />
        </TxSvgIcon>
    );
}

export function TrashIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <path d="M4 7h16" />
            <path d="M9 7V5h6v2" />
            <path d="M6 7l1 13h10l1-13" />
        </TxSvgIcon>
    );
}

export function GitBranchIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <circle cx="6" cy="6" r="2.5" />
            <circle cx="6" cy="18" r="2.5" />
            <circle cx="18" cy="12" r="2.5" />
            <path d="M6 8.5v7" />
            <path d="M8.2 16.2c2.4 0 4.3-1.4 7.3-3.7" />
        </TxSvgIcon>
    );
}

export function ArchiveIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <rect x="3" y="4" width="18" height="4" rx="1" />
            <path d="M5 8v11h14V8" />
            <path d="M10 12h4" />
        </TxSvgIcon>
    );
}

export function ArchiveRestoreIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <rect x="3" y="4" width="18" height="4" rx="1" />
            <path d="M5 8v11h14V8" />
            <path d="M12 11v6" />
            <path d="m9 14 3-3 3 3" />
        </TxSvgIcon>
    );
}

export function RotateCcwIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <path d="M3 12a9 9 0 1 0 2.6-6.3" />
            <path d="M3 5v5h5" />
        </TxSvgIcon>
    );
}

export function CloseIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </TxSvgIcon>
    );
}
