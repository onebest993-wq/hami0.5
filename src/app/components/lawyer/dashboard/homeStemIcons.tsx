import React from 'react';

/** أيقونات HomeTab/CommandHub — SVG مطابق لـ lucide بلا سحب vendor-lucide إلى LD stem */
export type HomeStemIconProps = {
    size?: number | string;
    strokeWidth?: number | string;
    className?: string;
    style?: React.CSSProperties;
    'aria-hidden'?: boolean | 'true' | 'false';
};

function HomeStemSvgIcon({
    size = 24,
    strokeWidth = 2,
    className,
    style,
    children,
    ...rest
}: HomeStemIconProps & { children: React.ReactNode }) {
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

export function HomeScaleIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="M7 21h10" />
            <path d="M12 3v18" />
            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
        </HomeStemSvgIcon>
    );
}

export function HomeFileTextIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
        </HomeStemSvgIcon>
    );
}

/** مستودع ذكي — أرشيف طبقات + وميض ذكاء (بديل المستودع التقليدي في الدوك) */
export function HomeSmartRepositoryIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="M4.5 9.5 12 5l7.5 4.5V19a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V9.5Z" />
            <path d="M4.5 9.5 12 14l7.5-4.5" />
            <path d="M12 5v9" />
            <path d="M8 16.5h8" />
            <path d="M8.5 13.5h7" />
            <path d="M17.2 4.2l.55 1.1 1.1.55-1.1.55-.55 1.1-.55-1.1-1.1-.55 1.1-.55Z" />
        </HomeStemSvgIcon>
    );
}

export function HomeCalendarIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M3 10h18" />
        </HomeStemSvgIcon>
    );
}

export function HomeListChecksIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="m3 17 2 2 4-4" />
            <path d="m3 7 2 2 4-4" />
            <path d="M13 6h8" />
            <path d="M13 12h8" />
            <path d="M13 18h8" />
        </HomeStemSvgIcon>
    );
}

export function HomeArrowLeftIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
        </HomeStemSvgIcon>
    );
}

export function HomeChevronRightIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="m9 18 6-6-6-6" />
        </HomeStemSvgIcon>
    );
}

export function HomeXIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </HomeStemSvgIcon>
    );
}

export function HomeArrowRightIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </HomeStemSvgIcon>
    );
}

export function HomeBellIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="M10.268 21a2 2 0 0 0 3.464 0" />
            <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
        </HomeStemSvgIcon>
    );
}

export function HomeUsersIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </HomeStemSvgIcon>
    );
}

export function HomeSettingsIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
            <circle cx="12" cy="12" r="3" />
        </HomeStemSvgIcon>
    );
}

export function HomeSearchIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="m21 21-4.34-4.34" />
            <circle cx="11" cy="11" r="8" />
        </HomeStemSvgIcon>
    );
}

export function HomeClockIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </HomeStemSvgIcon>
    );
}

export function HomeRotateCcwIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </HomeStemSvgIcon>
    );
}

export function HomeWalletIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
        </HomeStemSvgIcon>
    );
}

export function HomePlusIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </HomeStemSvgIcon>
    );
}

export function HomeChevronLeftIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="m15 18-6-6 6-6" />
        </HomeStemSvgIcon>
    );
}

export function HomeHammerIcon(props: HomeStemIconProps) {
    return (
        <HomeStemSvgIcon {...props}>
            <path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9" />
            <path d="m18 15 4-4" />
            <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
        </HomeStemSvgIcon>
    );
}

export type HomeStemIcon = typeof HomeScaleIcon;
