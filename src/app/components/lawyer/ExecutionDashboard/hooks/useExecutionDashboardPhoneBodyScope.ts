/** Scope + safe handlers for ExecutionDashboardPhoneBody (orchestrator) */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requireDecisionsStorageExecutionId } from '../utils/requireDecisionsStorageExecutionId';
import type { ExecutionFile, SeizedMovable } from '@/app/types/execution';
import { useExecutionDashboardPhoneBodyMountStages } from './useExecutionDashboardPhoneBodyMountStages';
import { useExecutionDashboardJudicialCustodianRemove } from './executionDashboardCore/useExecutionDashboardJudicialCustodianRemove';
import { useExecutionDashboardPropertyInlineSaveContext } from './executionDashboardCore/useExecutionDashboardPropertyInlineSaveContext';
import { useExecutionDashboardMovableInlineSaveContext } from './executionDashboardCore/useExecutionDashboardMovableInlineSaveContext';
import {
    runSaveSeizedMovableInitForDecision,
    type SaveSeizedMovableInitInput,
} from './executionDashboardCore/executionDashboardFollowupSeizureInits';
import { mergeExecutionFileSeizureLists } from '../utils/executionPhoneBodyExecutionDataMerge';
import { isExecutionHandlerStubLeaf } from './executionHandlerClusterStubs';
import { useExecutionDashboardPhoneBodyScopeRead } from './useExecutionDashboardPhoneBodyScopeRead';
import { useExecutionDashboardPhoneBodyLocalState } from './useExecutionDashboardPhoneBodyLocalState';
import { useExecutionDashboardPhoneBodySafeHandlers } from './useExecutionDashboardPhoneBodySafeHandlers';
import { buildPhoneBodySafeHandlersInput } from './buildPhoneBodySafeHandlersInput';
import { assembleExecutionDashboardPhoneBodyScope } from './assembleExecutionDashboardPhoneBodyScope';

export function useExecutionDashboardPhoneBodyScope(renderFingerprint?: string) {
    const scope = useExecutionDashboardPhoneBodyScopeRead(renderFingerprint);
    const local = useExecutionDashboardPhoneBodyLocalState(scope, scope.scopeRef);
    const handlers = useExecutionDashboardPhoneBodySafeHandlers(
        buildPhoneBodySafeHandlersInput(
            scope as Parameters<typeof buildPhoneBodySafeHandlersInput>[0],
            local as Parameters<typeof buildPhoneBodySafeHandlersInput>[1],
        ),
    );

    const executionData = scope.executionData as ExecutionFile | null | undefined;
    const persistExecutionMerge = scope.persistExecutionMerge as (patch: Record<string, unknown>) => void;
    const showToast = scope.showToast as (message: string, type?: string) => void;

    const removeJudicialCustodianEntry = useExecutionDashboardJudicialCustodianRemove({
        executionData,
        persistExecutionMerge,
        showToast,
    });

    const executionDataRef = useRef<ExecutionFile | null | undefined>(executionData);
    const [localExecutionViewTick, setLocalExecutionViewTick] = useState(0);
    const bumpLocalExecutionView = useCallback(() => {
        setLocalExecutionViewTick((tick) => tick + 1);
    }, []);

    const liveExecutionData = useMemo(() => {
        executionDataRef.current = mergeExecutionFileSeizureLists(
            executionData,
            executionDataRef.current,
        );
        return executionDataRef.current ?? executionData;
    }, [executionData, localExecutionViewTick]);

    useEffect(() => {
        const bump = () => bumpLocalExecutionView();
        window.addEventListener('hami-seized-movable-inline-updated', bump);
        window.addEventListener('hami-seized-movable-init-saved', bump);
        window.addEventListener('hami-seized-property-inline-updated', bump);
        return () => {
            window.removeEventListener('hami-seized-movable-inline-updated', bump);
            window.removeEventListener('hami-seized-movable-init-saved', bump);
            window.removeEventListener('hami-seized-property-inline-updated', bump);
        };
    }, [bumpLocalExecutionView]);

    const persistExecutionMergeLocal = useCallback(
        (patch: Record<string, unknown>): boolean => {
            const data = executionDataRef.current;
            if (!data) {
                showToast('تعذّر الحفظ — بيانات الإضبارة غير جاهزة', 'error');
                return false;
            }
            const upstream = persistExecutionMerge;
            if (typeof upstream !== 'function' || isExecutionHandlerStubLeaf(upstream)) {
                showToast('جاري تجهيز الأدوات — أعد المحاولة بعد لحظة', 'warning');
                return false;
            }
            const result = upstream(patch);
            if (result === false) {
                return false;
            }
            executionDataRef.current = mergeExecutionFileSeizureLists(
                { ...data, ...patch } as ExecutionFile,
                executionDataRef.current,
            );
            bumpLocalExecutionView();
            return true;
        },
        [persistExecutionMerge, showToast, bumpLocalExecutionView],
    );

    const pushTimelineEventLocal = useCallback(
        (ev: Record<string, unknown>) => {
            const fn = scope.pushTimelineEvent;
            if (typeof fn === 'function' && !isExecutionHandlerStubLeaf(fn)) {
                fn(ev);
            }
        },
        [scope.pushTimelineEvent],
    );

    const nextTimelineIdLocal = useCallback((): string => {
        const fn = scope.nextTimelineId;
        if (typeof fn === 'function' && !isExecutionHandlerStubLeaf(fn)) {
            return String(fn());
        }
        return `timeline_${Date.now()}`;
    }, [scope.nextTimelineId]);

    const propertyInlineSaveCtx = useExecutionDashboardPropertyInlineSaveContext({
        decisionsStorageExecutionId: scope.decisionsStorageExecutionId,
        executionDataId: executionData?.id,
        executionId: scope.executionId,
        executionData: liveExecutionData as Record<string, unknown> | undefined,
        executionDataRef: executionDataRef as { current: Record<string, unknown> | null | undefined },
        showToast: showToast,
        persistExecutionMerge: persistExecutionMergeLocal,
        pushTimelineEvent: pushTimelineEventLocal,
        nextTimelineId: nextTimelineIdLocal,
        linkSeizureAuctionToAppointments: Boolean(scope.linkSeizureAuctionToAppointments),
        pushSeizureAuctionCalendarAppointment: scope.pushSeizureAuctionCalendarAppointment,
    });

    const movableInlineSaveCtx = useExecutionDashboardMovableInlineSaveContext({
        decisionsStorageExecutionId: scope.decisionsStorageExecutionId,
        executionDataId: executionData?.id,
        executionId: scope.executionId,
        executionData: liveExecutionData as Record<string, unknown> | undefined,
        executionDataRef: executionDataRef as { current: Record<string, unknown> | null | undefined },
        showToast: showToast,
        persistExecutionMerge: persistExecutionMergeLocal,
        pushTimelineEvent: pushTimelineEventLocal,
        nextTimelineId: nextTimelineIdLocal,
        linkSeizureAuctionToAppointments: Boolean(scope.linkSeizureAuctionToAppointments),
        pushSeizureAuctionCalendarAppointment: scope.pushSeizureAuctionCalendarAppointment,
    });

    const saveSeizedMovableInitLocal = useCallback(
        (input: SaveSeizedMovableInitInput): SeizedMovable | null => {
            const data = executionDataRef.current;
            const exId = requireDecisionsStorageExecutionId({
                decisionsStorageExecutionId: scope.decisionsStorageExecutionId,
                executionId: scope.executionId,
                executionData: data as Record<string, unknown> | null,
            });
            return runSaveSeizedMovableInitForDecision(input, {
                exId,
                executionDataRef,
                nextTimelineId: nextTimelineIdLocal,
                persistExecutionMerge: persistExecutionMergeLocal,
                pushTimelineEvent: pushTimelineEventLocal,
                showToast: showToast,
            });
        },
        [
            scope.decisionsStorageExecutionId,
            scope.executionId,
            nextTimelineIdLocal,
            persistExecutionMergeLocal,
            pushTimelineEventLocal,
            showToast,
        ],
    );

    const saveSeizedMovableInitForDecision =
        typeof scope.saveSeizedMovableInitForDecision === 'function' &&
        !isExecutionHandlerStubLeaf(scope.saveSeizedMovableInitForDecision)
            ? (scope.saveSeizedMovableInitForDecision as (input: SaveSeizedMovableInitInput) => SeizedMovable | null | void)
            : saveSeizedMovableInitLocal;

    const { secondaryStageReady, tertiaryStageReady, quaternaryStageReady } =
        useExecutionDashboardPhoneBodyMountStages({
            movableSeizureRequestModalOpen: scope.movableSeizureRequestModalOpen,
            propertySeizureRequestModalOpen: scope.propertySeizureRequestModalOpen,
            showExecutionFinancialHub: scope.showExecutionFinancialHub,
            showUnifiedSeizureLogModal: scope.showUnifiedSeizureLogModal,
            isVisitationClaim: Boolean(scope.isVisitationClaim),
            isMaritalFurnitureClaim: Boolean(scope.isMaritalFurnitureClaim),
        });

    return assembleExecutionDashboardPhoneBodyScope({
        scope,
        local,
        handlers,
        removeJudicialCustodianEntry,
        propertyInlineSaveCtx,
        movableInlineSaveCtx,
        saveSeizedMovableInitForDecision,
        secondaryStageReady,
        tertiaryStageReady,
        quaternaryStageReady,
        liveExecutionData,
    });
}
