import React from 'react';

export function PartyCardCollapsedNameSlot({
    children,
    actionsMenu,
}: {
    children: React.ReactNode;
    actionsMenu?: React.ReactNode;
}) {
    return (
        <div className="relative flex min-h-[44px] w-full min-w-0 items-center">
            <div className="flex w-full min-w-0 flex-col items-center justify-center px-10 text-center">
                {children}
            </div>
            {actionsMenu ? (
                <div
                    className="absolute end-0 top-1/2 z-10 -translate-y-1/2"
                    data-exec-interactive="true"
                >
                    {actionsMenu}
                </div>
            ) : null}
        </div>
    );
}
