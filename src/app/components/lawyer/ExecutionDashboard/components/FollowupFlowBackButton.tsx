import React from 'react';
import { ArrowRight } from '@/app/components/ui/lucideIcons';

export type FollowupFlowBackButtonProps = {
    onClick: () => void;
    className?: string;
    disabled?: boolean;
    /** للقارئات الشاشة */
    label?: string;
    /** inline: بجانب العنوان — overlay: فوق المحتوى */
    variant?: 'inline' | 'overlay';
};

const BASE =
    'flex shrink-0 items-center justify-center rounded-full border border-[#E6C673]/25 bg-[#E6C673]/[0.07] text-[#E6C673]/75 transition-all duration-200 hover:border-[#E6C673]/45 hover:bg-[#E6C673]/12 hover:text-[#E6C673] hover:shadow-[0_0_12px_rgba(230,198,115,0.25)] active:scale-95 disabled:opacity-30 disabled:pointer-events-none';

/** سهم تراجع — inline في RTL يظهر يمين العنوان */
export const FollowupFlowBackButton: React.FC<FollowupFlowBackButtonProps> = ({
    onClick,
    className = '',
    disabled,
    label = 'تراجع',
    variant = 'inline',
}) => (
    <button
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (disabled) return;
            onClick();
        }}
        className={`${BASE} size-7 ${variant === 'overlay' ? 'absolute right-3 top-3 z-40' : ''} ${className}`}
    >
        <ArrowRight size={16} strokeWidth={2.5} className="shrink-0" aria-hidden />
    </button>
);

export type FollowupNestedPanelProps = {
    showBack: boolean;
    onBack: () => void;
    children: React.ReactNode;
    className?: string;
    bodyClassName?: string;
};

/** غلاف للمستوى الثاني فما فوق */
export const FollowupNestedPanel: React.FC<FollowupNestedPanelProps> = ({
    showBack,
    onBack,
    children,
    className = '',
    bodyClassName = '',
}) => (
    <div className={`relative ${showBack ? 'z-10' : ''} ${className}`}>
        {showBack ? <FollowupFlowBackButton onClick={onBack} variant="overlay" /> : null}
        <div className={showBack ? `pt-1 pr-9 ${bodyClassName}` : bodyClassName}>{children}</div>
    </div>
);
