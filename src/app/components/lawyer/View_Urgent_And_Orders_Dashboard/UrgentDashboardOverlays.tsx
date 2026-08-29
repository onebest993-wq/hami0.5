import React, { Suspense, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import { SmartToast } from '@/app/components/ui/SmartToast';
import DossierOpeningFallback from '@/app/components/lawyer/LawyerDashboardParts/components/DossierOpeningFallback';
import { DeferredActiveOrderFile } from '../DeferredActiveOrderFile';
import { createCaseFromForm } from '@/app/domain/urgent';
import type { UrgentCase } from '../Component_Urgent_Card';
import { UrgentLifecycleModals } from './UrgentLifecycleModals';
import {
    DossierPanelErrorFallback,
    FormModalErrorFallback,
    FormOverlayLoadingFallback,
} from './UrgentDashboardErrorFallbacks';
import type { useUrgentLifecycleModals } from './hooks/useUrgentLifecycleModals';

const LazyFormUrgentActions = lazyWithRetry(() =>
    import('../Form_Urgent_Actions').then((m) => ({
        default: m.Form_Urgent_Actions as unknown as LazyComponent,
    })),
);

type Lifecycle = ReturnType<typeof useUrgentLifecycleModals>;

type UrgentDashboardOverlaysProps = {
    lifecycle: Lifecycle;
    showFormModal: boolean;
    formModalRetryKey: number;
    onCloseForm: () => void;
    onRetryForm: () => void;
    userId: string | null;
    msPerDay: number;
    setCases: Dispatch<SetStateAction<UrgentCase[]>>;
    pendingCasesPersistRef: MutableRefObject<boolean>;
    openDossierForCase: (caseId: string) => void;
    showDetailsModal: boolean;
    selectedCaseForDetails: string | null;
    selectedCaseFile: UrgentCase | null;
    dossierMountKey: number;
    closeDossierPanel: () => void;
    retryDossierPanel: () => void;
    handleCaseUpdated: (caseId: string, patch: Record<string, unknown>) => void;
};

export function UrgentDashboardOverlays({
    lifecycle,
    showFormModal,
    formModalRetryKey,
    onCloseForm,
    onRetryForm,
    userId,
    msPerDay,
    setCases,
    pendingCasesPersistRef,
    openDossierForCase,
    showDetailsModal,
    selectedCaseForDetails,
    selectedCaseFile,
    dossierMountKey,
    closeDossierPanel,
    retryDossierPanel,
    handleCaseUpdated,
}: UrgentDashboardOverlaysProps) {
    return (
        <>
            <UrgentLifecycleModals
                trashModal={lifecycle.trashModal}
                onTrashReasonChange={(reason) =>
                    lifecycle.setTrashModal((state) => ({ ...state, reason }))
                }
                onCloseTrash={lifecycle.closeTrashModal}
                onConfirmTrash={lifecycle.confirmTrash}
                permanentDeleteModal={lifecycle.permanentDeleteModal}
                onClosePermanentDelete={lifecycle.closePermanentDeleteModal}
                onConfirmPermanentDelete={lifecycle.confirmPermanentDelete}
            />

            {showFormModal ? (
                <ErrorBoundary
                    key={formModalRetryKey}
                    fallback={<FormModalErrorFallback onClose={onCloseForm} onRetry={onRetryForm} />}
                    onError={(error, info) => {
                        console.error('[UrgentOrders] form modal error:', error, info.componentStack);
                    }}
                >
                    <Suspense fallback={<FormOverlayLoadingFallback />}>
                        <LazyFormUrgentActions
                            onClose={onCloseForm}
                            onSave={(data: Record<string, unknown>) => {
                                if (!userId) {
                                    SmartToast.error('يلزم تسجيل الدخول لحفظ طلب مستعجل');
                                    return;
                                }
                                SmartToast.success('تم حفظ الطلب بنجاح');
                                const newCase = createCaseFromForm(data, { msPerDay });
                                setCases((prev) => {
                                    const next = [newCase, ...prev];
                                    pendingCasesPersistRef.current = true;
                                    return next;
                                });
                                onCloseForm();
                                openDossierForCase(newCase.id);
                            }}
                            initialActionType="state_order"
                        />
                    </Suspense>
                </ErrorBoundary>
            ) : null}

            {showDetailsModal && selectedCaseForDetails ? (
                selectedCaseFile ? (
                    <ErrorBoundary
                        key={`${selectedCaseForDetails}-${dossierMountKey}`}
                        fallback={
                            <DossierPanelErrorFallback onClose={closeDossierPanel} onRetry={retryDossierPanel} />
                        }
                        onError={(error, info) => {
                            console.error('[UrgentOrders] dossier panel error:', error, info.componentStack);
                        }}
                    >
                        <DeferredActiveOrderFile
                            fileData={selectedCaseFile}
                            onCaseUpdated={handleCaseUpdated}
                            onClose={closeDossierPanel}
                        />
                    </ErrorBoundary>
                ) : (
                    <DossierOpeningFallback />
                )
            ) : null}
        </>
    );
}
