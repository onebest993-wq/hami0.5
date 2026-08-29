import React from 'react';

export function ProfileFloatingPortrait({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div data-profile-portrait-float className={className}>
            <div data-profile-portrait-shell>
                <div data-profile-portrait-ornament aria-hidden />
                <div className="rounded-full overflow-hidden hami-profile-portrait-frame bg-[#0A0F1C]">
                    {children}
                </div>
            </div>
        </div>
    );
}
