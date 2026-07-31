import React from 'react';
import type { ProfileAction } from '@/app/services/lawyer-cloud';

type ActionSvgIconProps = {
    size?: number;
    className?: string;
};

function ActionSvgIcon({
    size = 24,
    className,
    children,
}: ActionSvgIconProps & { children: React.ReactNode }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
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

function MessageCircleIcon(props: ActionSvgIconProps) {
    return (
        <ActionSvgIcon {...props}>
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </ActionSvgIcon>
    );
}

function PhoneIcon(props: ActionSvgIconProps) {
    return (
        <ActionSvgIcon {...props}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </ActionSvgIcon>
    );
}

function MailIcon(props: ActionSvgIconProps) {
    return (
        <ActionSvgIcon {...props}>
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </ActionSvgIcon>
    );
}

function GlobeIcon(props: ActionSvgIconProps) {
    return (
        <ActionSvgIcon {...props}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
        </ActionSvgIcon>
    );
}

function MapPinIcon(props: ActionSvgIconProps) {
    return (
        <ActionSvgIcon {...props}>
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
        </ActionSvgIcon>
    );
}

export function ActionIcon({ type }: { type: ProfileAction['type'] }) {
    const cls = 'shrink-0';
    if (type === 'whatsapp') return <MessageCircleIcon size={18} className={cls} />;
    if (type === 'call') return <PhoneIcon size={18} className={cls} />;
    if (type === 'email') return <MailIcon size={18} className={cls} />;
    if (type === 'website') return <GlobeIcon size={18} className={cls} />;
    return <MapPinIcon size={18} className={cls} />;
}
