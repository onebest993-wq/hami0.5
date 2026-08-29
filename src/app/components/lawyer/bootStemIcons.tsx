import React from 'react';

/** أيقونات القفل/بوابة الدخول — SVG مطابق لـ lucide بلا vendor-lucide على FullBoot. */

type BootStemIconProps = {
    size?: number | string;
    strokeWidth?: number | string;
    className?: string;
    style?: React.CSSProperties;
    'aria-hidden'?: boolean | 'true' | 'false';
};

function BootStemSvgIcon({
    size = 24,
    strokeWidth = 2,
    className,
    style,
    children,
    ...rest
}: BootStemIconProps & { children: React.ReactNode }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            style={style}
            {...rest}
        >
            {children}
        </svg>
    );
}

export function BootFingerprintIcon(props: BootStemIconProps) {
    return (
        <BootStemSvgIcon {...props}>
            <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
            <path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" />
            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
            <path d="M2 16h.01" />
            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
            <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
        </BootStemSvgIcon>
    );
}

export function BootLockIcon(props: BootStemIconProps) {
    return (
        <BootStemSvgIcon {...props}>
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </BootStemSvgIcon>
    );
}

export function BootLogOutIcon(props: BootStemIconProps) {
    return (
        <BootStemSvgIcon {...props}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
        </BootStemSvgIcon>
    );
}

export function BootEyeIcon(props: BootStemIconProps) {
    return (
        <BootStemSvgIcon {...props}>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </BootStemSvgIcon>
    );
}

export function BootEyeOffIcon(props: BootStemIconProps) {
    return (
        <BootStemSvgIcon {...props}>
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
        </BootStemSvgIcon>
    );
}
