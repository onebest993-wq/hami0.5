import React from 'react';
import { createPortal } from 'react-dom';
import { FinancialLedgerSection, type FinancialLedgerSectionProps } from './FinancialLedgerSection';

export type ExecutionFinancialLedgerPortalContainerProps = FinancialLedgerSectionProps & {
    showLedgerModal: boolean;
};

export const ExecutionFinancialLedgerPortalContainer: React.FC<
    ExecutionFinancialLedgerPortalContainerProps
> = ({ showLedgerModal, ...ledgerSectionProps }) => {
    if (!showLedgerModal || typeof document === 'undefined') return null;

    return createPortal(<FinancialLedgerSection {...ledgerSectionProps} />, document.body);
};
