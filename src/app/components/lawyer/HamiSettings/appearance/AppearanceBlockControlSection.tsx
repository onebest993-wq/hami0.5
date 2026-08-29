import React from 'react';

export function AppearanceBlockControlSection({
    label,
    action,
    children,
}: {
    label: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="mb-3 last:mb-0">
            <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[11px] font-bold text-white/80">{label}</p>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            {children}
        </div>
    );
}
