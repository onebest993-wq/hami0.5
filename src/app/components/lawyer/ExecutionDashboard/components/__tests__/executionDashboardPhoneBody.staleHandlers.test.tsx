import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExecutionDashboardPhoneBody } from '../ExecutionDashboardPhoneBody';
import { ExecutionPhoneBodyScopeProvider } from '../../hooks/executionPhoneBodyScope';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';

vi.mock('../ExecutionDashboardPhoneBodySecondarySections', () => ({
    ExecutionDashboardPhoneBodySecondarySections: (props: {
        safeOpenAppointmentModal?: () => void;
        directOpenNotesModal?: () => void;
    }) => (
        <>
            <button type="button" onClick={props.safeOpenAppointmentModal}>
                إضافة موعد
            </button>
            <button type="button" onClick={props.directOpenNotesModal}>
                ملاحظات
            </button>
        </>
    ),
}));

vi.mock('../ExecutionDashboardPhoneBodyDeferredPanels', () => ({
    ExecutionDashboardPhoneBodyDeferredPanels: () => null,
}));

vi.mock('../../hooks/useExecutionDashboardPhoneBodyMountStages', () => ({
    useExecutionDashboardPhoneBodyMountStages: () => ({
        secondaryStageReady: true,
        tertiaryStageReady: false,
        quaternaryStageReady: false,
    }),
}));

vi.mock('../../executionDashboardLazyRegistry', async (importOriginal) => {
    const React = await import('react');
    const actual = await importOriginal<typeof import('../../executionDashboardLazyRegistry')>();
    const NullComponent = () => null;
    const ForwardedDebtorsSection = React.forwardRef(
        (
            props: {
                openEditParty?: (kind: 'creditor' | 'debtor', index: number) => void;
            },
            ref: _ref,
        ) => (
            <button
                type="button"
                onClick={() => props.openEditParty?.('debtor', 0)}
            >
                debtor edit trigger
            </button>
        ),
    );
    return {
        ...actual,
        LazyColleagueConsultationHeaderButton: NullComponent,
        LazyCoerciveTab: NullComponent,
        LazyCommunicationsTab: NullComponent,
        LazyDashboardHeaderSection: (props: { openEditDossierMeta?: () => void }) => (
            <button type="button" onClick={props.openEditDossierMeta}>
                dossier edit trigger
            </button>
        ),
        LazyActionGridSection: (props: {
            onOpenAppointmentModal?: () => void;
            onOpenNotesModal?: () => void;
        }) => (
            <>
                <button type="button" onClick={props.onOpenAppointmentModal}>
                    إضافة موعد
                </button>
                <button type="button" onClick={props.onOpenNotesModal}>
                    ملاحظات
                </button>
            </>
        ),
        LazyDebtorsSection: ForwardedDebtorsSection,
        LazyDossierControlsTab: NullComponent,
        LazyDossierSwitcher: NullComponent,
        LazyDossierMetaEditSection: NullComponent,
        LazyFinancialTab: NullComponent,
        LazyOtherPartyTab: NullComponent,
        LazyPartiesSection: (props: {
            openEditParty?: (
                kind: 'creditor' | 'debtor',
                index: number,
                opts?: { party?: { id?: string } },
            ) => void;
        }) => (
            <button
                type="button"
                onClick={() => props.openEditParty?.('creditor', 0, { party: { id: 'cred-1' } })}
            >
                creditor edit trigger
            </button>
        ),
        LazyPartyEditModal: NullComponent,
        LazyPermanentDeleteConfirmDialog: NullComponent,
        LazyPersonalTab: NullComponent,
        LazyRequestsTab: NullComponent,
        LazySeizureRequestsTab: NullComponent,
        LazyTimelineSection: NullComponent,
        LazyPersonalCoerciveFollowupPanel: NullComponent,
        LazyEmployeeAssignmentCoerciveFollowupBlock: NullComponent,
        LazyEvictionFieldProceduresPanel: NullComponent,
        LazyOtherPartyActionsLog: NullComponent,
        LazyExecutionTrashModal: NullComponent,
        LazyTimelineEditModal: NullComponent,
        LazyExecutionHeirsQuickViewModal: NullComponent,
        LazyExecutionTransferFileNumberModal: NullComponent,
        LazyDossierActionsModal: NullComponent,
        LazyLinkedDossierTimelineModal: NullComponent,
        LazyAlimonyBeneficiaryDeathModal: NullComponent,
        LazyExecutorApprovedDateTimeModal: NullComponent,
        LazyExecutorBreakInventoryFurnitureModal: NullComponent,
        LazyExecutorJudicialCustodianModal: NullComponent,
        LazyExecutorWorkflowConfirmModal: NullComponent,
        LazyPoliceAssistanceDetailsModal: NullComponent,
        LazyPartyDeathReportModal: NullComponent,
        LazyRealEstateSeizurePostApprovalModal: NullComponent,
        LazyGuarantorDetailsPostApprovalModal: NullComponent,
        prefetchExecutionTrashOverlay: vi.fn(),
        prefetchExecutionNotesAndAppointmentModals: vi.fn(),
        prefetchExecutionDecisionsModalContainer: vi.fn(),
        prefetchExecutionFinancialHubPortal: vi.fn(),
        prefetchUnifiedSeizureLogHost: vi.fn(),
    };
});

describe('ExecutionDashboardPhoneBody stale handler recovery', () => {
    beforeEach(() => {
        useExecutionDashboardStore.getState().closeAllModals();
    });

    it('opens appointment and notes modals through the store fallback when scope setters are missing', () => {
        const showToast = vi.fn();
        const scopeRef = {
            current: {
                showToast,
                resolveCalendarUserId: () => null,
                executionData: { id: 'ex-1', creditors: [], debtors: [] },
                viewExecutionData: { id: 'ex-1', creditors: [], debtors: [] },
                renderFingerprint: 'stable',
            } as Record<string, unknown>,
        };

        render(
            <ExecutionPhoneBodyScopeProvider scopeRef={scopeRef}>
                <ExecutionDashboardPhoneBody renderFingerprint="stable" />
            </ExecutionPhoneBodyScopeProvider>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'إضافة موعد' }));

        expect(useExecutionDashboardStore.getState().modals.showAppointmentModal).toBe(true);
        useExecutionDashboardStore.getState().closeAllModals();

        fireEvent.click(screen.getByRole('button', { name: 'ملاحظات' }));

        expect(useExecutionDashboardStore.getState().modals.showNotesModal).toBe(true);
        expect(showToast).not.toHaveBeenCalledWith(
            'تعذر فتح نافذة إضافة الموعد لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
            'error',
        );
        expect(showToast).not.toHaveBeenCalledWith(
            'تعذر فتح الملاحظات لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
            'error',
        );
    });

    it('uses the latest scope handlers for dossier and party edit actions without rerender', () => {
        const showToast = vi.fn();
        const scopeRef = {
            current: {
                showToast,
                resolveCalendarUserId: () => null,
                executionData: { id: 'ex-1', creditors: [], debtors: [] },
                viewExecutionData: { id: 'ex-1', creditors: [], debtors: [] },
                renderFingerprint: 'stable',
            } as Record<string, unknown>,
        };

        render(
            <ExecutionPhoneBodyScopeProvider scopeRef={scopeRef}>
                <ExecutionDashboardPhoneBody renderFingerprint="stable" />
            </ExecutionPhoneBodyScopeProvider>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'dossier edit trigger' }));
        fireEvent.click(screen.getByRole('button', { name: 'creditor edit trigger' }));
        fireEvent.click(screen.getByRole('button', { name: 'debtor edit trigger' }));

        expect(showToast).toHaveBeenCalledWith(
            'تعذر فتح تعديل بيانات الإضبارة لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
            'error',
        );
        expect(showToast).toHaveBeenCalledWith(
            'تعذر فتح تعديل بيانات الدائن لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
            'error',
        );
        expect(showToast).toHaveBeenCalledWith(
            'تعذر فتح تعديل بيانات المدين لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
            'error',
        );

        const openEditDossierMeta = vi.fn();
        const openEditParty = vi.fn();
        scopeRef.current.openEditDossierMeta = openEditDossierMeta;
        scopeRef.current.openEditParty = openEditParty;

        fireEvent.click(screen.getByRole('button', { name: 'dossier edit trigger' }));
        fireEvent.click(screen.getByRole('button', { name: 'creditor edit trigger' }));
        fireEvent.click(screen.getByRole('button', { name: 'debtor edit trigger' }));

        expect(openEditDossierMeta).toHaveBeenCalledTimes(1);
        expect(openEditParty).toHaveBeenNthCalledWith(1, 'creditor', 0, { party: { id: 'cred-1' } });
        expect(openEditParty).toHaveBeenNthCalledWith(2, 'debtor', 0, undefined);
    });

    it('bridges dossier and party edit setters when the open handlers do not flip shell state', () => {
        vi.useFakeTimers();
        const showToast = vi.fn();
        const openEditDossierMeta = vi.fn();
        const setShowEditDossierMetaModal = vi.fn();
        const setDossierMetaDraft = vi.fn();
        const openEditParty = vi.fn();
        const setEditPartyTarget = vi.fn();
        const scopeRef = {
            current: {
                showToast,
                resolveCalendarUserId: () => null,
                executionData: {
                    id: 'ex-1',
                    creditors: [],
                    debtors: [],
                    directorate: 'تنفيذ الكرخ',
                    fileNumber: '12',
                    fileYear: '2026',
                    docNumber: '55',
                    judgmentDate: '2026-01-02',
                    classification: 'مدني',
                },
                viewExecutionData: {
                    id: 'ex-1',
                    creditors: [],
                    debtors: [],
                },
                renderFingerprint: 'stable',
                openEditDossierMeta,
                showEditDossierMetaModal: false,
                dossierMetaDraft: null,
                setShowEditDossierMetaModal,
                setDossierMetaDraft,
                openEditParty,
                editPartyTarget: null,
                setEditPartyTarget,
            } as Record<string, unknown>,
        };

        render(
            <ExecutionPhoneBodyScopeProvider scopeRef={scopeRef}>
                <ExecutionDashboardPhoneBody renderFingerprint="stable" />
            </ExecutionPhoneBodyScopeProvider>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'dossier edit trigger' }));
        fireEvent.click(screen.getByRole('button', { name: 'creditor edit trigger' }));

        vi.runAllTimers();

        expect(openEditDossierMeta).toHaveBeenCalledTimes(1);
        expect(setDossierMetaDraft).toHaveBeenCalledWith(
            expect.objectContaining({
                directorate: 'تنفيذ الكرخ',
                fileNumber: '12',
                fileYear: '2026',
                docNumber: '55',
                judgmentDate: '2026-01-02',
                classification: 'مدني',
            }),
        );
        expect(setShowEditDossierMetaModal).toHaveBeenCalledWith(true);
        expect(openEditParty).toHaveBeenCalledWith('creditor', 0, { party: { id: 'cred-1' } });
        expect(setEditPartyTarget).toHaveBeenCalledWith({
            kind: 'creditor',
            index: 0,
            forceHeirs: false,
            partyId: 'cred-1',
        });

        vi.useRealTimers();
    });
});
