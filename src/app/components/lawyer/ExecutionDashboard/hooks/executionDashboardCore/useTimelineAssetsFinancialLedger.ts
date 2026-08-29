import { useCallback, useRef, useState } from 'react';
import type {
    ExecutionFile,
    RealEstateSeizureAsset,
    SeizedAsset,
    StandaloneExecutionMark,
    ThirdPartySeizureAsset,
} from '@/app/types/execution';
import { getLocalTodayYmd } from './executionDashboardCoreDate';
import {
    asArray,
    makeArrayStateSetter,
} from './timelineAssetsClusterHelpers';

export type FinancialLedgerRow = {
    id: string;
    date: string;
    type: 'payment' | 'fee' | 'settlement';
    amount: number;
    description: string;
    balance: number;
};

export function useTimelineAssetsFinancialLedger(p: {
    executionData: ExecutionFile | null | undefined;
    modals: { showLedgerModal: boolean };
    setExecutionModal: (key: 'showLedgerModal', show: boolean) => void;
}) {
    const [financialLedgerRaw, setFinancialLedgerRaw] = useState<FinancialLedgerRow[]>(() =>
        asArray(p.executionData?.financialLedger),
    );
    const setFinancialLedger = useCallback(makeArrayStateSetter(setFinancialLedgerRaw), []);
    const financialLedger = asArray<FinancialLedgerRow>(financialLedgerRaw);
    const financialLedgerRef = useRef(financialLedger);
    financialLedgerRef.current = financialLedger;
    const hasFinancialLedger = financialLedger.length > 0;
    const showLedgerModal = p.modals.showLedgerModal;
    const setShowLedgerModal = (show: boolean) => p.setExecutionModal('showLedgerModal', show);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(getLocalTodayYmd());
    const [debtorNotificationDate, setDebtorNotificationDate] = useState<string | null>(null);
    const [manualGraceCalendarExtra, setManualGraceCalendarExtra] = useState(false);

    return {
        financialLedger,
        financialLedgerRef,
        setFinancialLedger,
        hasFinancialLedger,
        showLedgerModal,
        setShowLedgerModal,
        paymentAmount,
        setPaymentAmount,
        paymentDate,
        setPaymentDate,
        debtorNotificationDate,
        setDebtorNotificationDate,
        manualGraceCalendarExtra,
        setManualGraceCalendarExtra,
    };
}

export function useTimelineAssetsSeizureCollections(p: {
    executionData: ExecutionFile | null | undefined;
}) {
    const [seizedAssetsRaw, setSeizedAssetsRaw] = useState<SeizedAsset[]>(() =>
        asArray(p.executionData?.seizedAssets),
    );
    const setSeizedAssets = useCallback(makeArrayStateSetter(setSeizedAssetsRaw), []);
    const seizedAssets = asArray<SeizedAsset>(seizedAssetsRaw);
    const seizedAssetsSnapshotRef = useRef(seizedAssets);
    seizedAssetsSnapshotRef.current = seizedAssets;

    const [realEstateSeizureAssetsRaw, setRealEstateSeizureAssetsRaw] = useState<
        RealEstateSeizureAsset[]
    >(() => asArray(p.executionData?.realEstateSeizureAssets));
    const setRealEstateSeizureAssets = useCallback(
        makeArrayStateSetter(setRealEstateSeizureAssetsRaw),
        [],
    );
    const realEstateSeizureAssets = asArray<RealEstateSeizureAsset>(realEstateSeizureAssetsRaw);
    const realEstateSeizureSnapshotRef = useRef(realEstateSeizureAssets);
    realEstateSeizureSnapshotRef.current = realEstateSeizureAssets;

    const [thirdPartySeizureAssetsRaw, setThirdPartySeizureAssetsRaw] = useState<
        ThirdPartySeizureAsset[]
    >(() => asArray(p.executionData?.thirdPartySeizureAssets));
    const setThirdPartySeizureAssets = useCallback(
        makeArrayStateSetter(setThirdPartySeizureAssetsRaw),
        [],
    );
    const thirdPartySeizureAssets = asArray<ThirdPartySeizureAsset>(thirdPartySeizureAssetsRaw);
    const thirdPartySeizureSnapshotRef = useRef(thirdPartySeizureAssets);
    thirdPartySeizureSnapshotRef.current = thirdPartySeizureAssets;

    const [standaloneExecutionMarksRaw, setStandaloneExecutionMarksRaw] = useState<
        StandaloneExecutionMark[]
    >(() => asArray(p.executionData?.standaloneExecutionMarks));
    const setStandaloneExecutionMarks = useCallback(
        makeArrayStateSetter(setStandaloneExecutionMarksRaw),
        [],
    );
    const standaloneExecutionMarks = asArray<StandaloneExecutionMark>(standaloneExecutionMarksRaw);
    const standaloneExecutionMarksSnapshotRef = useRef(standaloneExecutionMarks);
    standaloneExecutionMarksSnapshotRef.current = standaloneExecutionMarks;

    return {
        seizedAssets,
        setSeizedAssets,
        seizedAssetsSnapshotRef,
        realEstateSeizureAssets,
        setRealEstateSeizureAssets,
        realEstateSeizureSnapshotRef,
        thirdPartySeizureAssets,
        setThirdPartySeizureAssets,
        thirdPartySeizureSnapshotRef,
        standaloneExecutionMarks,
        setStandaloneExecutionMarks,
        standaloneExecutionMarksSnapshotRef,
    };
}
