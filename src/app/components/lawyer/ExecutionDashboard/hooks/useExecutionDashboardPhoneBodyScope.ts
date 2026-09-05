/** Scope + safe handlers for ExecutionDashboardPhoneBody (orchestrator) */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExecutionFile, SeizedMovable } from '@/app/types/execution';
import { useExecutionDashboardPhoneBodyMountStages } from './useExecutionDashboardPhoneBodyMountStages';
import { useExecutionDashboardJudicialCustodianRemove } from './executionDashboardCore/useExecutionDashboardJudicialCustodianRemove';
import { useExecutionDashboardPropertyInlineSaveContext } from './executionDashboardCore/useExecutionDashboardPropertyInlineSaveContext';
import { useExecutionDashboardMovableInlineSaveContext } from './executionDashboardCore/useExecutionDashboardMovableInlineSaveContext';
import type { SaveSeizedMovableInitInput } from './executionDashboardCore/executionDashboardFollowupSeizureInits';
import { mergeExecutionFileSeizureLists } from '../utils/executionPhoneBodyExecutionDataMerge';
import {
    invokeMaybeStubFunctionOrWait,
    isExecutionHandlerWaitTimeout,
    isExecutionHandlerStubLeaf,
} from './executionHandlerClusterStubs';
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

    const persistExecutionMergeRef = useRef(persistExecutionMerge);
    persistExecutionMergeRef.current = persistExecutionMerge;
    const pushTimelineEventRef = useRef(scope.pushTimelineEvent);
    pushTimelineEventRef.current = scope.pushTimelineEvent;

    const persistExecutionMergeLocal = useCallback(
        (patch: Record<string, unknown>): boolean => {
            const data = executionDataRef.current;
            if (!data) {
                showToast('تعذّر الحفظ — بيانات الإضبارة غير جاهزة', 'error');
                return false;
            }
            const applyLocal = (result: unknown): boolean => {
                if (result === false || isExecutionHandlerWaitTimeout(result)) {
                    return false;
                }
                const latest = executionDataRef.current;
                if (!latest) return false;
                executionDataRef.current = mergeExecutionFileSeizureLists(
                    { ...latest, ...patch } as ExecutionFile,
                    executionDataRef.current,
                );
                bumpLocalExecutionView();
                return true;
            };
            const upstream = persistExecutionMergeRef.current;
            if (typeof upstream === 'function' && !isExecutionHandlerStubLeaf(upstream)) {
                return applyLocal(upstream(patch));
            }
            const pending = invokeMaybeStubFunctionOrWait('persistExecutionMerge', [patch], {
                coalesce: false,
                readLive: () => persistExecutionMergeRef.current,
            });
            if (pending && typeof (pending as Promise<unknown>).then === 'function') {
                return (pending as Promise<unknown>).then(applyLocal) as unknown as boolean;
            }
            return applyLocal(pending);
        },
        [showToast, bumpLocalExecutionView],
    );

    const pushTimelineEventLocal = useCallback((ev: Record<string, unknown>) => {
        return invokeMaybeStubFunctionOrWait('pushTimelineEvent', [ev], {
            readLive: () => pushTimelineEventRef.current,
        });
    }, []);

    const nextTimelineIdLocal = useCallback((): string => {
        const fn = scope.nextTimelineId;
        if (typeof fn === 'function' && !isExecutionHandlerStubLeaf(fn)) {
            return String(fn());
        }
        return `timeline_${Date.now()}`;
    }, [scope.nextTimelineId]);

    const pushSeizureAuctionCalendarAppointmentLocal = useCallback(
        (input: {
            dossierId: string;
            decisionId: string;
            ymd: string;
            purpose: string;
            linkToAppointments: boolean;
        }) => {
            return invokeMaybeStubFunctionOrWait('pushSeizureAuctionCalendarAppointment', [input], {
                readLive: () =>
                    scope.pushSeizureAuctionCalendarAppointment as
                        | ((args: typeof input) => void)
                        | undefined,
            });
        },
        [scope.pushSeizureAuctionCalendarAppointment],
    );

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
        pushSeizureAuctionCalendarAppointment: pushSeizureAuctionCalendarAppointmentLocal,
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
        pushSeizureAuctionCalendarAppointment: pushSeizureAuctionCalendarAppointmentLocal,
    });

    /** Post-approve movable init retired — keep key for prop/snapshot honesty. */
    const saveSeizedMovableInitForDecision = useCallback(
        (_input: SaveSeizedMovableInitInput): SeizedMovable | null => null,
        [],
    );

    const { secondaryStageReady, tertiaryStageReady, quaternaryStageReady } =
        useExecutionDashboardPhoneBodyMountStages({
            movableSeizureRequestModalOpen: scope.movableSeizureRequestModalOpen,
            propertySeizureRequestModalOpen: scope.propertySeizureRequestModalOpen,
            showExecutionFinancialHub: scope.showExecutionFinancialHub,
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
