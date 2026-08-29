import React from 'react';
import type { HomeStemIconProps } from '@/app/components/lawyer/dashboard/homeStemIcons';

type HeaderMarkProps = HomeStemIconProps & { children: React.ReactNode };

function HeaderMarkSvg({
    size = 24,
    strokeWidth = 1.7,
    className,
    style,
    children,
    ...rest
}: HeaderMarkProps) {
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
            aria-hidden
            focusable="false"
            {...rest}
        >
            {children}
        </svg>
    );
}

/** بحث — وجه ماسي + شعاع، لا عدسة Lucide */
export function HeaderSearchMark(props: HomeStemIconProps) {
    return (
        <HeaderMarkSvg {...props}>
            <path d="M12 3.1 20.4 12 12 20.9 3.6 12Z" />
            <path d="M12 8.1 15.9 12 12 15.9 8.1 12Z" />
            <path d="m16.35 16.35 4.05 4.05" />
        </HeaderMarkSvg>
    );
}

/** إشعار — لوح تعليق قانوني، لا جرس */
export function HeaderNoticeMark(props: HomeStemIconProps) {
    return (
        <HeaderMarkSvg {...props}>
            <path d="M8.2 4.2h7.6v2.05H8.2z" />
            <path d="M7.1 6.25h9.8v9.55c0 .72-.42 1.22-1.12 1.42L12 19.7l-3.78-2.48c-.7-.2-1.12-.7-1.12-1.42V6.25Z" />
            <path d="M9.35 10.15h5.3" />
            <path d="M9.35 13.05h3.7" />
        </HeaderMarkSvg>
    );
}

/** إعدادات — ثلاثة قضبان بخرز، لا ترس */
export function HeaderTuneMark(props: HomeStemIconProps) {
    return (
        <HeaderMarkSvg {...props}>
            <path d="M4 7.6h16" />
            <circle cx="8.6" cy="7.6" r="1.55" fill="currentColor" stroke="none" />
            <path d="M4 12h16" />
            <circle cx="15.2" cy="12" r="1.55" fill="currentColor" stroke="none" />
            <path d="M4 16.4h16" />
            <circle cx="11.2" cy="16.4" r="1.55" fill="currentColor" stroke="none" />
        </HeaderMarkSvg>
    );
}
