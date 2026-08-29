/** Phone-body local state + dossier lifecycle safe wrappers */
import React from 'react';
import { useExecutionDashboardStore as executionDashboardStoreApi } from '@/app/stores/executionDashboardStore';
import type { DossierLifecycleStatus } from '@/app/types/execution';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import { applyPhoneBodyDossierLifecycleFallback } from '../components/executionDashboardPhoneBodyBridges';
import { isExecutionHandlerStubLeaf } from './executionHandlerClusterStubs';
import { readExecutionPhoneBodyScope } from './executionPhoneBodyScope';

function resolveLiveLifecycleHandler(
    scope: Record<string, unknown>,
    flatKey: 'handleDossierLifecyclePick' | 'handleDossierLifecycleConfirmDetails',
): ((...args: unknown[]) => void) | null {
    const actions =
        scope.dossierLifecycleActions && typeof scope.dossierLifecycleActions === 'object'
            ? (scope.dossierLifecycleActions as Record<string, unknown>)
            : null;
    const candidates = [scope[flatKey], actions?.[flatKey]];
    for (const candidate of candidates) {
        if (typeof candidate !== 'function') continue;
        if (isExecutionHandlerStubLeaf(candidate)) continue;
        return candidate as (...args: unknown[]) => void;
    }
    return null;
}

export function useExecutionDashboardPhoneBodyLocalState(
    scope: Record<string, unknown>,
    scopeRef?: React.MutableRefObject<Record<string, unknown>>,
) {
    // المفاتيح المسطّحة لحالة دورة حياة الإضبارة لم تَعُد تُنسَخ إلى الـ chunk scope —
    // المصدر الوحيد هو dossierLifecyclePanel (+ dossierLifecycleActions / dossierStatusDraft).
    const {
        activeGraceTasks,
        dossierLifecycleActions,
        dossierLifecyclePanel,
        dossierStatusDraft,
        executionData,
        followupSpecialization,
        inabaTargets,
        resolveCalendarUserId,
        setShowAppointmentModal,
        setShowDocumentsModal,
        setShowExecutionTrashModal,
        setShowNotesModal,
        shouldShowGuarantorExternalHub,
        showToast,
        subFiles,
        toggleHeaderExpanded,
        trashedCaseNotes,
        trashedCaseTasks,
        trashedTimelineEvents,
    } = scope;

    const followupSpec =
        followupSpecialization && typeof followupSpecialization === 'object'
            ? (followupSpecialization as Record<string, unknown>)
            : ({} as Record<string, unknown>);
    const safeInabaTargets = Array.isArray(inabaTargets) ? inabaTargets : [];
    const safeSubFiles = Array.isArray(subFiles) ? subFiles : [];
    const safeTrashedTimelineEvents = Array.isArray(trashedTimelineEvents) ? trashedTimelineEvents : [];
    const safeTrashedCaseNotes = Array.isArray(trashedCaseNotes) ? trashedCaseNotes : [];
    const safeTrashedCaseTasks = Array.isArray(trashedCaseTasks) ? trashedCaseTasks : [];
    const safeActiveGraceTasks = Array.isArray(activeGraceTasks) ? activeGraceTasks : [];
    const safeDossierLifecyclePanel =
        dossierLifecyclePanel && typeof dossierLifecyclePanel === 'object'
            ? (dossierLifecyclePanel as Record<string, unknown>)
            : ({} as Record<string, unknown>);
    const safeDossierLifecycleActions =
        dossierLifecycleActions && typeof dossierLifecycleActions === 'object'
            ? (dossierLifecycleActions as Record<string, unknown>)
            : ({} as Record<string, unknown>);
    const localDossierLifecyclePopoverRef = React.useRef<HTMLDivElement | null>(null);
    const localDossierLifecyclePanelPortalRef = React.useRef<HTMLDivElement | null>(null);
    const safeResolveCalendarUserId =
        typeof resolveCalendarUserId === 'function'
            ? resolveCalendarUserId
            : (() => null);
    const createModalSetterFallback = React.useMemo(
        () =>
            (modalName: string) =>
            (show: boolean) => {
                if (!modalName) return;
                const store = executionDashboardStoreApi.getState();
                if (show) {
                    store.openModal(modalName as never);
                    return;
                }
                store.closeModal(modalName as never);
            },
        [],
    );
    const [timelineAccordionExpandedFallback, setTimelineAccordionExpandedFallback] = React.useState(false);
    const safeShouldShowGuarantorExternalHub =
        typeof shouldShowGuarantorExternalHub === 'function'
            ? shouldShowGuarantorExternalHub
            : (() => false);
    const safeSetDossierReasonDraft =
        typeof safeDossierLifecyclePanel.setDossierReasonDraft === 'function'
            ? (safeDossierLifecyclePanel.setDossierReasonDraft as (value: string) => void)
            : (() => undefined);
    const safeSetDossierDateDraft =
        typeof safeDossierLifecyclePanel.setDossierDateDraft === 'function'
            ? (safeDossierLifecyclePanel.setDossierDateDraft as (value: string) => void)
            : (() => undefined);
    const safeSetDossierLifecyclePanelOpen =
        typeof safeDossierLifecyclePanel.setDossierLifecyclePanelOpen === 'function'
            ? (safeDossierLifecyclePanel.setDossierLifecyclePanelOpen as (updater: unknown) => void)
            : (() => undefined);
    const safeSetDossierLifecyclePanelPhase =
        typeof safeDossierLifecyclePanel.setDossierLifecyclePanelPhase === 'function'
            ? (safeDossierLifecyclePanel.setDossierLifecyclePanelPhase as (phase: string) => void)
            : (() => undefined);
    const safeSetDossierPendingStatus =
        typeof safeDossierLifecyclePanel.setDossierPendingStatus === 'function'
            ? (safeDossierLifecyclePanel.setDossierPendingStatus as (status: unknown) => void)
            : (() => undefined);
    const safeDossierLifecyclePanelOpen = Boolean(
        safeDossierLifecyclePanel.dossierLifecyclePanelOpen,
    );
    const safeDossierLifecyclePanelPhase =
        typeof safeDossierLifecyclePanel.dossierLifecyclePanelPhase === 'string'
            ? safeDossierLifecyclePanel.dossierLifecyclePanelPhase
            : 'menu';
    const safeDossierPendingStatus = safeDossierLifecyclePanel.dossierPendingStatus ?? null;
    const safeDossierStatusDraft =
        typeof dossierStatusDraft === 'string'
            ? dossierStatusDraft
            : typeof safeDossierLifecyclePanel.dossierStatusDraft === 'string'
              ? safeDossierLifecyclePanel.dossierStatusDraft
              : 'active';
    const committedDossierLifecycleStatus = React.useMemo<DossierLifecycleStatus>(
        () =>
            normalizeDossierLifecycleStatus(
                executionData?.dossier_lifecycle_status ?? safeDossierStatusDraft,
            ),
        [executionData?.dossier_lifecycle_status, safeDossierStatusDraft],
    );
    const [localDossierStatusDraft, setLocalDossierStatusDraft] = React.useState<DossierLifecycleStatus>(
        committedDossierLifecycleStatus,
    );
    const [localDossierLifecyclePanelOpen, setLocalDossierLifecyclePanelOpen] = React.useState(false);
    const [localDossierLifecyclePanelPhase, setLocalDossierLifecyclePanelPhase] = React.useState<'menu' | 'details'>('menu');
    const [localDossierPendingStatus, setLocalDossierPendingStatus] = React.useState<DossierLifecycleStatus | null>(null);
    React.useEffect(() => {
        setLocalDossierStatusDraft(committedDossierLifecycleStatus);
    }, [committedDossierLifecycleStatus]);
    const safeDossierReasonDraft =
        typeof safeDossierLifecyclePanel.dossierReasonDraft === 'string'
            ? safeDossierLifecyclePanel.dossierReasonDraft
            : '';
    const safeDossierDateDraft =
        typeof safeDossierLifecyclePanel.dossierDateDraft === 'string'
            ? safeDossierLifecyclePanel.dossierDateDraft
            : '';
    const safeDossierLifecyclePopoverRef = safeDossierLifecyclePanel.dossierLifecyclePopoverRef;
    const safeDossierLifecyclePanelPortalRef =
        safeDossierLifecyclePanel.dossierLifecyclePanelPortalRef;
    const safeDossierLifecyclePopStyle = safeDossierLifecyclePanel.dossierLifecyclePopStyle ?? null;
    const safeHandleDossierLifecyclePick = React.useCallback(
        (status: unknown) => {
            const latest = {
                ...scope,
                ...(scopeRef ? readExecutionPhoneBodyScope(scopeRef) : {}),
            } as Record<string, unknown>;
            const handler = resolveLiveLifecycleHandler(latest, 'handleDossierLifecyclePick');
            if (handler) {
                handler(status);
                return;
            }
            showToast('تعذر تغيير حالة الإضبارة لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
        },
        [scope, scopeRef, showToast],
    );
    const safeHandleDossierLifecycleConfirmDetails = React.useCallback(
        (reasonOverride?: string, dateOverride?: string) => {
            const latest = {
                ...scope,
                ...(scopeRef ? readExecutionPhoneBodyScope(scopeRef) : {}),
            } as Record<string, unknown>;
            const handler = resolveLiveLifecycleHandler(
                latest,
                'handleDossierLifecycleConfirmDetails',
            );
            if (handler) {
                handler(reasonOverride, dateOverride);
                return;
            }
            showToast('تعذر اعتماد حالة الإضبارة لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
        },
        [scope, scopeRef, showToast],
    );
    const safeApplyDossierLifecycleToFileAndTimeline = React.useCallback(
        (status: DossierLifecycleStatus, reason: string, date: string) => {
            return applyPhoneBodyDossierLifecycleFallback({
                status,
                reason,
                date,
                apply:
                    typeof safeDossierLifecycleActions.applyDossierLifecycleToFileAndTimeline ===
                    'function'
                        ? (safeDossierLifecycleActions.applyDossierLifecycleToFileAndTimeline as (
                              nextStatus: DossierLifecycleStatus,
                              nextReason: string,
                              nextDate: string,
                          ) => boolean)
                        : null,
                pick: safeHandleDossierLifecyclePick,
                confirm: safeHandleDossierLifecycleConfirmDetails,
            });
        },
        [
            safeDossierLifecycleActions,
            safeHandleDossierLifecycleConfirmDetails,
            safeHandleDossierLifecyclePick,
        ],
    );
    const currentDossierStatusReason = React.useMemo(() => {
        const value = executionData?.dossier_status_reason;
        return typeof value === 'string' ? value : '';
    }, [executionData?.dossier_status_reason]);
    const currentDossierStatusDate = React.useMemo(() => {
        const value = executionData?.dossier_status_date;
        return typeof value === 'string' ? value : '';
    }, [executionData?.dossier_status_date]);
    const localDossierReasonSeed =
        localDossierPendingStatus && localDossierPendingStatus === committedDossierLifecycleStatus
            ? currentDossierStatusReason
            : '';
    const localDossierDateSeed =
        localDossierPendingStatus && localDossierPendingStatus === committedDossierLifecycleStatus
            ? currentDossierStatusDate
            : '';
    const safeSetShowAppointmentModal =
        typeof setShowAppointmentModal === 'function'
            ? setShowAppointmentModal
            : createModalSetterFallback('showAppointmentModal');
    const safeSetShowNotesModal =
        typeof setShowNotesModal === 'function'
            ? setShowNotesModal
            : createModalSetterFallback('showNotesModal');
    const safeSetShowDocumentsModal =
        typeof setShowDocumentsModal === 'function'
            ? setShowDocumentsModal
            : createModalSetterFallback('showDocumentsModal');
    const safeSetShowExecutionTrashModal =
        typeof setShowExecutionTrashModal === 'function'
            ? setShowExecutionTrashModal
            : createModalSetterFallback('showExecutionTrashModal');
    const safeToggleHeaderExpanded =
        typeof toggleHeaderExpanded === 'function'
            ? toggleHeaderExpanded
            : (() => undefined);

    return {
        followupSpec,
        safeInabaTargets,
        safeSubFiles,
        safeTrashedTimelineEvents,
        safeTrashedCaseNotes,
        safeTrashedCaseTasks,
        safeActiveGraceTasks,
        safeDossierLifecyclePanel,
        safeDossierLifecycleActions,
        localDossierLifecyclePopoverRef,
        localDossierLifecyclePanelPortalRef,
        safeResolveCalendarUserId,
        createModalSetterFallback,
        timelineAccordionExpandedFallback,
        setTimelineAccordionExpandedFallback,
        safeShouldShowGuarantorExternalHub,
        safeSetDossierReasonDraft,
        safeSetDossierDateDraft,
        safeSetDossierLifecyclePanelOpen,
        safeSetDossierLifecyclePanelPhase,
        safeSetDossierPendingStatus,
        safeDossierLifecyclePanelOpen,
        safeDossierLifecyclePanelPhase,
        safeDossierPendingStatus,
        safeDossierStatusDraft,
        committedDossierLifecycleStatus,
        localDossierStatusDraft,
        setLocalDossierStatusDraft,
        localDossierLifecyclePanelOpen,
        setLocalDossierLifecyclePanelOpen,
        localDossierLifecyclePanelPhase,
        setLocalDossierLifecyclePanelPhase,
        localDossierPendingStatus,
        setLocalDossierPendingStatus,
        safeDossierReasonDraft,
        safeDossierDateDraft,
        safeDossierLifecyclePopoverRef,
        safeDossierLifecyclePanelPortalRef,
        safeDossierLifecyclePopStyle,
        safeHandleDossierLifecyclePick,
        safeHandleDossierLifecycleConfirmDetails,
        safeApplyDossierLifecycleToFileAndTimeline,
        currentDossierStatusReason,
        currentDossierStatusDate,
        localDossierReasonSeed,
        localDossierDateSeed,
        safeSetShowAppointmentModal,
        safeSetShowNotesModal,
        safeSetShowDocumentsModal,
        safeSetShowExecutionTrashModal,
        safeToggleHeaderExpanded,
    };
}
