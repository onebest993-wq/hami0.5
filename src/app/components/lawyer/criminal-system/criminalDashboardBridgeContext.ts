import { createContext, useContext } from 'react';
import type { CriminalCase } from './criminalStore';

export type CriminalDashboardBridge = {
    ready: boolean;
    criminalCases: CriminalCase[];
    deleteCriminalCase: (id: string) => boolean;
    resumePendingSeveranceForm: () => boolean;
    prepareNormalCriminalCaseForm: () => void;
};

const noop = () => false;

export const CRIMINAL_DASHBOARD_STUB: CriminalDashboardBridge = {
    ready: false,
    criminalCases: [],
    deleteCriminalCase: noop,
    resumePendingSeveranceForm: noop,
    prepareNormalCriminalCaseForm: () => undefined,
};

export const CriminalDashboardBridgeContext = createContext<CriminalDashboardBridge>(
    CRIMINAL_DASHBOARD_STUB,
);

export function useCriminalDashboardBridge(): CriminalDashboardBridge {
    return useContext(CriminalDashboardBridgeContext);
}
