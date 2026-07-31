import React from 'react';

type HeaderSvgIconProps = {
    size?: number;
    strokeWidth?: number;
    className?: string;
    style?: React.CSSProperties;
    'aria-hidden'?: boolean | 'true' | 'false';
};

/** أيقونات الهيدر — SVG مطابق لـ lucide بلا سحب vendor-lucide إلى stem */
function HeaderSvgIcon({
    size = 24,
    strokeWidth = 2,
    className,
    style,
    children,
    ...rest
}: HeaderSvgIconProps & { children: React.ReactNode }) {
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

export function HeaderSearchIcon(props: HeaderSvgIconProps) {
    return (
        <HeaderSvgIcon {...props}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </HeaderSvgIcon>
    );
}

export function HeaderBellIcon(props: HeaderSvgIconProps) {
    return (
        <HeaderSvgIcon {...props}>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </HeaderSvgIcon>
    );
}

export function HeaderSettingsIcon(props: HeaderSvgIconProps) {
    return (
        <HeaderSvgIcon {...props}>
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </HeaderSvgIcon>
    );
}

export function HeaderChevronLeftIcon(props: HeaderSvgIconProps) {
    return (
        <HeaderSvgIcon {...props}>
            <path d="m15 18-6-6 6-6" />
        </HeaderSvgIcon>
    );
}
