import React from 'react';
import { ExecutionNamedOverlayInstantFrame } from './executionOverlayInstantPresets';
import { PreloadableOverlayGate } from '@/app/components/lawyer/ExecutionDashboard/preloadableOverlayGate';
import { LazySeizureRequestSubjectModal } from '../executionDashboardSeizureRequestSubjectModalLazy';

export function ExecutionDashboardPhoneBodyTertiarySeizureSubjectModals({
    propertySeizureRequestModalOpen,
    propertySeizureSubjectDraft,
    setPropertySeizureRequestModalOpen,
    setPropertySeizureSubjectDraft,
    submitPropertySeizureRequest,
    movableSeizureRequestModalOpen,
    movableSeizureSubjectDraft,
    setMovableSeizureRequestModalOpen,
    setMovableSeizureSubjectDraft,
    submitMovableSeizureRequest,
}: {
    propertySeizureRequestModalOpen: boolean;
    propertySeizureSubjectDraft: string;
    setPropertySeizureRequestModalOpen: (open: boolean) => void;
    setPropertySeizureSubjectDraft: (value: string) => void;
    submitPropertySeizureRequest: () => void;
    movableSeizureRequestModalOpen: boolean;
    movableSeizureSubjectDraft: string;
    setMovableSeizureRequestModalOpen: (open: boolean) => void;
    setMovableSeizureSubjectDraft: (value: string) => void;
    submitMovableSeizureRequest: () => void;
}) {
    return (
        <>
            {propertySeizureRequestModalOpen ? (
            <PreloadableOverlayGate
                lazy={LazySeizureRequestSubjectModal}
                lazyProps={{
                    open: propertySeizureRequestModalOpen,
                    title: 'طلب حجز عقار',
                    placeholder: 'اكتب موضوع طلب حجز العقار',
                    subjectDraft: propertySeizureSubjectDraft,
                    tone: 'amber',
                    onClose: () => setPropertySeizureRequestModalOpen(false),
                    onSubjectDraftChange: setPropertySeizureSubjectDraft,
                    onSubmit: submitPropertySeizureRequest,
                }}
                fallback={
                    <ExecutionNamedOverlayInstantFrame
                        title="طلب حجز عقار"
                        onClose={() => setPropertySeizureRequestModalOpen(false)}
                    />
                }
            />
            ) : null}

            {movableSeizureRequestModalOpen ? (
            <PreloadableOverlayGate
                lazy={LazySeizureRequestSubjectModal}
                lazyProps={{
                    open: movableSeizureRequestModalOpen,
                    title: 'طلب حجز مال منقول',
                    placeholder: 'اكتب موضوع طلب حجز المال المنقول',
                    subjectDraft: movableSeizureSubjectDraft,
                    tone: 'sky',
                    onClose: () => setMovableSeizureRequestModalOpen(false),
                    onSubjectDraftChange: setMovableSeizureSubjectDraft,
                    onSubmit: submitMovableSeizureRequest,
                }}
                fallback={
                    <ExecutionNamedOverlayInstantFrame
                        title="طلب حجز مال منقول"
                        onClose={() => setMovableSeizureRequestModalOpen(false)}
                    />
                }
            />
            ) : null}
        </>
    );
}
