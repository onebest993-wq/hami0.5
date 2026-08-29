import React from 'react';

type MarkProps = {
    size?: number;
    className?: string;
    strokeWidth?: number;
};

function MarkSvg({
    size = 16,
    className,
    strokeWidth = 2,
    filled = false,
    children,
}: MarkProps & { filled?: boolean; children: React.ReactNode }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            {children}
        </svg>
    );
}

/** أيقونات المخزن — هندسة مطابقة لأيقونات التطبيق دون تحميل حزمة الأيقونات في هذا المسار. */
export function ExecutionArchiveTrashMark({ size = 15, className }: MarkProps) {
    return (
        <MarkSvg size={size} className={className}>
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
        </MarkSvg>
    );
}

export function ExecutionArchivePlusMark({ size = 16, className }: MarkProps) {
    return (
        <MarkSvg size={size} className={className} strokeWidth={2.5}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </MarkSvg>
    );
}

export function ExecutionArchiveBoxMark({ size = 13, className }: MarkProps) {
    return (
        <MarkSvg size={size} className={className}>
            <rect width="20" height="5" x="2" y="3" rx="1" />
            <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
            <path d="M10 12h4" />
        </MarkSvg>
    );
}

export function ExecutionArchiveFilterMark({ size = 16, className }: MarkProps) {
    return (
        <MarkSvg size={size} className={className} strokeWidth={2.25}>
            <path d="M3 6h18" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
        </MarkSvg>
    );
}

export function ExecutionArchiveSearchMark({ size = 17, className }: MarkProps) {
    return (
        <MarkSvg size={size} className={className}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </MarkSvg>
    );
}

export function ExecutionArchiveXMark({ size = 18, className }: MarkProps) {
    return (
        <MarkSvg size={size} className={className}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </MarkSvg>
    );
}

export function ExecutionArchiveRotateMark({ size = 12, className }: MarkProps) {
    return (
        <MarkSvg size={size} className={className}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </MarkSvg>
    );
}

export function ExecutionArchiveEyeMark({ size = 13, className }: MarkProps) {
    return (
        <MarkSvg size={size} className={className}>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </MarkSvg>
    );
}

export function ExecutionArchiveLinkMark({ size = 12, className }: MarkProps) {
    return (
        <MarkSvg size={size} className={className}>
            <path d="M9 17H7A5 5 0 0 1 7 7h2" />
            <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
            <line x1="8" x2="16" y1="12" y2="12" />
        </MarkSvg>
    );
}

export function ExecutionArchivePinMark({
    size = 15,
    className,
    filled = false,
}: MarkProps & { filled?: boolean }) {
    return (
        <MarkSvg size={size} className={className} filled={filled}>
            <line x1="12" x2="12" y1="17" y2="22" />
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
        </MarkSvg>
    );
}
