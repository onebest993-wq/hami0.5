import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { UnifiedSummonsHubProps } from './unifiedSummonsHubTypes';

type HubMainTab = 'tabligh' | 'taklif' | 'nashr' | 'guarantor';

type HubTabOption = { value: HubMainTab; label: string };

export type UnifiedSummonsHubEffectsArgs = {
    isOpen: boolean;
    initialMainTab: UnifiedSummonsHubProps['initialMainTab'];
    executionId: UnifiedSummonsHubProps['executionId'];
    tablighTask: UnifiedSummonsHubProps['tablighTask'];
    publicationNoticeFeature: UnifiedSummonsHubProps['publicationNoticeFeature'];
    guarantorNotificationFeature: UnifiedSummonsHubProps['guarantorNotificationFeature'];
    hubMainTab: HubMainTab;
    hubTabOptions: HubTabOption[];
    memoArchivedResolved: boolean;
    setEvictionSecondBranch: Dispatch<SetStateAction<'ordinary' | 'coercive' | ''>>;
    setSecondNoticeForCollection: Dispatch<SetStateAction<boolean>>;
    setInitialNoticeLawyerFeesIncluded: Dispatch<SetStateAction<boolean>>;
    setExecutionMemoRegisterMode: Dispatch<SetStateAction<boolean>>;
    setMemoDateOptimistic: Dispatch<SetStateAction<string>>;
    setMemoError: Dispatch<SetStateAction<string>>;
    setMemoDateEditing: Dispatch<SetStateAction<boolean>>;
    setMemoArchivedOptimistic: Dispatch<SetStateAction<boolean>>;
    setTablighMode: Dispatch<SetStateAction<'memo' | 'regular'>>;
    setHubMainTab: Dispatch<SetStateAction<HubMainTab>>;
    setTaklifPurpose: Dispatch<SetStateAction<string>>;
    setTaklifDate: Dispatch<SetStateAction<string>>;
    setTaklifDurationDays: Dispatch<SetStateAction<number>>;
    setTaklifFormError: Dispatch<SetStateAction<string>>;
    setTablighTaskOptimistic: Dispatch<
        SetStateAction<{ noticeDateYmd: string; purpose: string } | null>
    >;
    setTablighClearedOptimistic: Dispatch<SetStateAction<boolean>>;
    setNashrClearedOptimistic: Dispatch<SetStateAction<boolean>>;
    setNashrDate: Dispatch<SetStateAction<string>>;
    setNashrPaper1: Dispatch<SetStateAction<string>>;
    setNashrPaper2: Dispatch<SetStateAction<string>>;
    setNashrFormError: Dispatch<SetStateAction<string>>;
    setGuarantorNoticeDate: Dispatch<SetStateAction<string>>;
    setGuarantorNoticeReason: Dispatch<SetStateAction<string>>;
    setGuarantorFormError: Dispatch<SetStateAction<string>>;
};

/** Sync / reset effects cluster for Unified Summons Hub (zero visual). */
export function useUnifiedSummonsHubEffects(args: UnifiedSummonsHubEffectsArgs): void {
    const {
        isOpen,
        initialMainTab,
        executionId,
        tablighTask,
        publicationNoticeFeature,
        guarantorNotificationFeature,
        hubMainTab,
        hubTabOptions,
        memoArchivedResolved,
        setEvictionSecondBranch,
        setSecondNoticeForCollection,
        setInitialNoticeLawyerFeesIncluded,
        setExecutionMemoRegisterMode,
        setMemoDateOptimistic,
        setMemoError,
        setMemoDateEditing,
        setMemoArchivedOptimistic,
        setTablighMode,
        setHubMainTab,
        setTaklifPurpose,
        setTaklifDate,
        setTaklifDurationDays,
        setTaklifFormError,
        setTablighTaskOptimistic,
        setTablighClearedOptimistic,
        setNashrClearedOptimistic,
        setNashrDate,
        setNashrPaper1,
        setNashrPaper2,
        setNashrFormError,
        setGuarantorNoticeDate,
        setGuarantorNoticeReason,
        setGuarantorFormError,
    } = args;

    useEffect(() => {
        if (!isOpen) {
            setEvictionSecondBranch('');
            setSecondNoticeForCollection(false);
            setInitialNoticeLawyerFeesIncluded(false);
            setExecutionMemoRegisterMode(false);
            setMemoDateOptimistic('');
            setMemoError('');
            setMemoDateEditing(false);
            setTablighMode('memo');
            setHubMainTab('tabligh');
            setTaklifPurpose('');
            setTaklifDate('');
            setTaklifDurationDays(1);
            setTaklifFormError('');
            setTablighTaskOptimistic(null);
            setTablighClearedOptimistic(false);
            setNashrClearedOptimistic(false);
            setNashrDate('');
            setNashrPaper1('');
            setNashrPaper2('');
            setNashrFormError('');
            setGuarantorNoticeDate('');
            setGuarantorNoticeReason('');
        }
    }, [isOpen]);

    useEffect(() => {
        setTablighTaskOptimistic(null);
        setTablighClearedOptimistic(false);
        setNashrClearedOptimistic(false);
    }, [executionId]);

    useEffect(() => {
        setMemoDateOptimistic('');
        setMemoError('');
        setMemoArchivedOptimistic(false);
        setMemoDateEditing(false);
        setExecutionMemoRegisterMode(false);
    }, [executionId]);

    useEffect(() => {
        if (isOpen && initialMainTab) {
            setHubMainTab(initialMainTab);
        }
    }, [isOpen, initialMainTab]);

    useEffect(() => {
        if (!isOpen) return;
        if (!hubTabOptions.some((o) => o.value === hubMainTab)) {
            setHubMainTab(hubTabOptions[0]?.value ?? 'tabligh');
        }
    }, [isOpen, hubMainTab, hubTabOptions]);

    useEffect(() => {
        if (!publicationNoticeFeature?.state) {
            setNashrDate('');
            setNashrPaper1('');
            setNashrPaper2('');
        }
    }, [publicationNoticeFeature?.state]);

    useEffect(() => {
        if (!isOpen) return;
        const st = guarantorNotificationFeature?.state;
        if (!st) {
            setGuarantorNoticeDate('');
            setGuarantorNoticeReason('');
            setGuarantorFormError('');
            return;
        }
        setGuarantorNoticeDate(String(st.noticeDateYmd || '').trim());
        setGuarantorNoticeReason(String(st.reason || '').trim());
    }, [guarantorNotificationFeature?.state, isOpen]);

    useEffect(() => {
        if (!tablighTask) setTablighClearedOptimistic(false);
    }, [tablighTask]);

    useEffect(() => {
        if (!publicationNoticeFeature?.state) setNashrClearedOptimistic(false);
    }, [publicationNoticeFeature?.state]);

    useEffect(() => {
        if (!isOpen) return;
        setTablighMode(memoArchivedResolved ? 'regular' : 'memo');
    }, [isOpen, memoArchivedResolved]);
}
