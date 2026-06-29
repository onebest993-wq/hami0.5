import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { Decision } from '../types';
import {
    reconcileAppealDeadlineEnforcement,
    type AppealsHubProponentFilter,
} from '../utils';
import {
    scrollToAnyDomIdWhenReady,
    scrollToDomIdWhenReady,
} from '@/app/utils/decisionsModalScroll';

export type UseDecisionsAppealsHubUiStateParams = {
    isHistoricalMode: boolean;
    bootHubTab?: 'current' | 'previous' | 'appeals' | 'archive';
    decisionsScrollToIdOnBoot?: string;
    appealsScrollToIdOnBoot?: string;
    domainVisibleDecisionsLength: number;
    setDecisions: React.Dispatch<React.SetStateAction<Decision[]>>;
    persistDecisionsToStorage: (next: Decision[], opts?: import('@/app/utils/executionDecisionsNamespace').ExecutorDecisionsPersistOptions) => Decision[] | null;
};

export function useDecisionsAppealsHubUiState({
    isHistoricalMode,
    bootHubTab,
    decisionsScrollToIdOnBoot,
    appealsScrollToIdOnBoot,
    domainVisibleDecisionsLength,
    setDecisions,
    persistDecisionsToStorage,
}: UseDecisionsAppealsHubUiStateParams) {
    const [hubNoteById, setHubNoteById] = useState<Record<string, string>>({});
    const [tamyeezNumberDraftById, setTamyeezNumberDraftById] = useState<Record<string, string>>({});
    const [tamyeezEditOpenById, setTamyeezEditOpenById] = useState<Record<string, boolean>>({});

    const [showAddModal, setShowAddModal] = useState(false);
    const [decisionsHubTab, setDecisionsHubTab] = useState<
        'current' | 'previous' | 'appeals' | 'archive'
    >('current');
    const [previousFilter, setPreviousFilter] = useState<'all' | 'approved' | 'rejected'>('all');
    const [previousProponentFilter, setPreviousProponentFilter] =
        useState<AppealsHubProponentFilter>('all');
    const [appealsProponentFilter, setAppealsProponentFilter] =
        useState<AppealsHubProponentFilter>('all');
    const [decisionsScrollTargetId, setDecisionsScrollTargetId] = useState<string | null>(null);
    const [appealsScrollTargetId, setAppealsScrollTargetId] = useState<string | null>(null);
    const [appealDetailDecision, setAppealDetailDecision] = useState<Decision | null>(null);

    const [newTitle, setNewTitle] = useState('');
    const [newBody, setNewBody] = useState('');
    const [newDate, setNewDate] = useState('');

    const goToAppealsWithScroll = useCallback((decisionId: string) => {
        setDecisionsHubTab('appeals');
        setAppealsScrollTargetId(decisionId);
    }, []);

    const resetAddDecisionForm = useCallback(() => {
        setNewTitle('');
        setNewBody('');
        setNewDate('');
    }, []);

    useEffect(() => {
        if (isHistoricalMode) setShowAddModal(false);
    }, [isHistoricalMode]);

    useEffect(() => {
        if (isHistoricalMode) return;
        const tick = () => {
            setDecisions((prev) => {
                const { rows, mutated } = reconcileAppealDeadlineEnforcement(prev);
                if (!mutated) return prev;
                try {
                    return persistDecisionsToStorage(rows) ?? prev;
                } catch {
                    return prev;
                }
            });
        };
        const intervalId = window.setInterval(tick, 60_000);
        return () => window.clearInterval(intervalId);
    }, [isHistoricalMode, persistDecisionsToStorage, setDecisions]);

    useEffect(() => {
        if (bootHubTab) setDecisionsHubTab(bootHubTab);
        if (decisionsScrollToIdOnBoot) setDecisionsScrollTargetId(decisionsScrollToIdOnBoot);
        if (appealsScrollToIdOnBoot) setAppealsScrollTargetId(appealsScrollToIdOnBoot);
    }, [bootHubTab, decisionsScrollToIdOnBoot, appealsScrollToIdOnBoot]);

    useLayoutEffect(() => {
        if (
            (decisionsHubTab !== 'current' && decisionsHubTab !== 'previous') ||
            !decisionsScrollTargetId
        ) {
            return;
        }
        return scrollToDomIdWhenReady(`hami-decision-card-${decisionsScrollTargetId}`, () =>
            setDecisionsScrollTargetId(null),
        );
    }, [decisionsHubTab, decisionsScrollTargetId, domainVisibleDecisionsLength]);

    useLayoutEffect(() => {
        if (decisionsHubTab !== 'appeals' || !appealsScrollTargetId) return;
        const targetId = appealsScrollTargetId;
        return scrollToAnyDomIdWhenReady(
            [`hami-appeal-card-${targetId}`, `hami-decision-card-${targetId}`],
            () => setAppealsScrollTargetId(null),
        );
    }, [decisionsHubTab, appealsScrollTargetId, domainVisibleDecisionsLength]);

    return {
        hubNoteById,
        setHubNoteById,
        tamyeezNumberDraftById,
        setTamyeezNumberDraftById,
        tamyeezEditOpenById,
        setTamyeezEditOpenById,
        showAddModal,
        setShowAddModal,
        decisionsHubTab,
        setDecisionsHubTab,
        previousFilter,
        setPreviousFilter,
        previousProponentFilter,
        setPreviousProponentFilter,
        appealsProponentFilter,
        setAppealsProponentFilter,
        appealDetailDecision,
        setAppealDetailDecision,
        goToAppealsWithScroll,
        newTitle,
        setNewTitle,
        newBody,
        setNewBody,
        newDate,
        setNewDate,
        resetAddDecisionForm,
    };
}
