import React from 'react';
import { DebtorCardRowReady } from './DebtorCardRowReady';

export type { DebtorCardRowProps } from './DebtorCardRowReady';
import type { DebtorCardRowProps } from './DebtorCardRowReady';

export function DebtorCardRow(props: DebtorCardRowProps) {
    return <DebtorCardRowReady {...props} />;
}
