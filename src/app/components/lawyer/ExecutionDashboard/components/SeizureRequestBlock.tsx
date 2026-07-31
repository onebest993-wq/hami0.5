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
        <div className="relative">
            <div className={`flex flex-row-reverse items-stretch overflow-hidden ${className}`}>
                <button
                    type="button"
                    onClick={onClick}
                    disabled={disabled}
                    className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-[12px] font-bold text-slate-100 text-right transition-colors disabled:opacity-40"
                >
                    <span className="flex flex-row-reverse items-center gap-3 w-full">
                        {icon}
                        <span className="flex-1 min-w-0 text-right">{label}</span>
                    </span>
                </button>
                {trailingSlot ? (
                    <div className="flex shrink-0 flex-row-reverse items-center gap-1 self-center px-2">
                        {trailingSlot}
                    </div>
                ) : null}
            </div>
            {afterButton}
            {children}
        </div>
    );
}
