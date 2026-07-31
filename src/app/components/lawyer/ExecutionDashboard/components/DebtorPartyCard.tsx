import React, { memo, useCallback, useEffect, useState } from 'react';
import { ExecutionPartyCardFrame } from './ExecutionPartyCardFrame';
import type { ExpandControlRegistrar } from './DebtorsSection.types';

export const DebtorPartyCard = memo(function DebtorPartyCard({
    registerExpandControl,
    debtorKey,
    badgeExtra,
    collapsed,
    expanded,
}: {
    registerExpandControl: ExpandControlRegistrar;
    debtorKey: string;
    badgeExtra: React.ReactNode;
    collapsed: React.ReactNode;
    expanded: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        setOpen((v) => !v);
    }, []);

    useEffect(() => {
        return registerExpandControl(debtorKey, () => {
            setOpen(true);
        });
    }, [debtorKey, registerExpandControl]);

    return (
        <ExecutionPartyCardFrame
            variant="debtor"
            roleLabel="المدين"
            badgeExtra={badgeExtra}
            isOpen={open}
            onToggle={toggle}
            expandAriaLabel={open ? 'طي بيانات المدين' : 'توسيع بيانات المدين'}
            expandedPanel={open ? expanded : undefined}
        >
            {collapsed}
        </ExecutionPartyCardFrame>
    );
});
