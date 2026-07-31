import { createContext, useContext } from 'react';
import type { CriminalCase } from '@/app/components/lawyer/criminal-system/criminalStore';

/**
 * سياق جسر الجزائي فقط — بلا SecureStore/Crypto.
 * الـ Provider الثقيل يُحمَّل كسولاً من criminalDashboardBridge.tsx.
 */
export type CriminalDashboardBridge = {
    ready: boolean;
    criminalCases: CriminalCase[];
    deleteCriminalCase: (id: string) => void;
    resumePendingSeveranceForm: () => boolean;
    prepareNormalCriminalCaseForm: () => void;
};

const noop = () => false;
const noopDelete = () => {};

export const CRIMINAL_DASHBOARD_BRIDGE_STUB: CriminalDashboardBridge = {
    ready: false,
    criminalCases: [],
    deleteCriminalCase: noopDelete,
    resumePendingSeveranceForm: noop,
    prepareNormalCriminalCaseForm: () => undefined,
};

export const CriminalDashboardBridgeContext =
    createContext<CriminalDashboardBridge>(CRIMINAL_DASHBOARD_BRIDGE_STUB);

export function useCriminalDashboardBridge(): CriminalDashboardBridge {
    return useContext(CriminalDashboardBridgeContext);
}
