import React from 'react';

export function SeizureRequestBlock(props: {
    onClick: () => void;
    disabled?: boolean;
    className: string;
    icon: React.ReactNode;
    label: React.ReactNode;
    children?: React.ReactNode;
    afterButton?: React.ReactNode;
    trailingSlot?: React.ReactNode;
}) {
    const { onClick, disabled, className, icon, label, children, afterButton, trailingSlot } = props;

    return (
        <div
            className={`relative isolate overflow-hidden has-[[data-request-confirm]]:min-h-[44px] ${className}`}
        >
            <div
                data-request-main=""
                className="flex min-h-[44px] flex-row-reverse items-center"
            >
                <button
                    type="button"
                    onClick={onClick}
                    disabled={disabled}
                    className="min-h-[44px] min-w-0 flex-1 border-0 bg-transparent px-2.5 py-2 text-[12px] font-bold text-slate-100 text-right transition-colors touch-manipulation disabled:opacity-40"
                >
                    <span className="flex w-full flex-row-reverse items-center gap-2">
                        {icon}
                        <span className="min-w-0 flex-1 text-right leading-snug">{label}</span>
                    </span>
                </button>
                {trailingSlot ? (
                    <div className="flex shrink-0 flex-row-reverse items-center gap-1 self-center px-1.5">
                        {trailingSlot}
                    </div>
                ) : null}
            </div>
            {afterButton}
            {children}
        </div>
    );
}
