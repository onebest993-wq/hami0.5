import React from 'react';
import { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_NOTES_SHELL_MAX,
    EXEC_MODAL_SHELL_HEIGHT_CLASS,
    EXEC_MODAL_TRASH_SHELL_MAX,
} from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { ExecutionOverlayInstantFrame } from './ExecutionOverlayInstantFrame';

function closeLawInstant(): void {
    useExecutionDashboardStore.getState().closeModal('showLawReferencePanel');
}

export function ExecutionFinancialHubInstantFrame({
    onClose,
    isRepresentingDebtor = false,
}: {
    onClose: () => void;
    isRepresentingDebtor?: boolean;
}): React.ReactElement {
    return (
        <ExecutionOverlayInstantFrame
            title={isRepresentingDebtor ? 'المركز المالي — موكل المدين' : 'المركز المالي'}
            onClose={onClose}
            testId="execution-financial-hub-instant"
            closeTestId="execution-financial-hub-instant-close"
            closeAriaLabel="إغلاق المركز المالي"
            labelledById="execution-financial-hub-instant-title"
            overlayClassName={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG} ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            panelClassName={`flex ${EXEC_MODAL_TRASH_SHELL_MAX} w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#E6C673]/40 bg-[#0B1120] shadow-md`}
            titleClassName="text-base font-bold text-[#E6C673]"
            headerClassName="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-[#E6C673]/30 bg-[#0B1120] p-3"
            zIndex={EXEC_MODAL_Z.unifiedFollowUp}
            portal
        />
    );
}

export function ExecutionLawInstantFrame(): React.ReactElement {
    return (
        <ExecutionOverlayInstantFrame
            title="قانون التنفيذ العراقي رقم 45"
            subtitle="مرجع تشريعي — تصنيف حسب الإجراء"
            onClose={closeLawInstant}
            testId="execution-law-reference-panel"
            closeTestId="execution-law-reference-close"
            closeAriaLabel="إغلاق"
            labelledById="law-reference-instant-title"
            overlayClassName="fixed inset-0 flex flex-col bg-[#05060D]/92"
            panelClassName="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0A0F1C] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            titleClassName="truncate text-base font-bold text-slate-100 sm:text-lg"
            headerClassName="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700/50 px-4 py-3.5"
            zIndex={EXEC_MODAL_Z.lawReferencePanel}
            portal
            lockBody
            bodySlots={4}
        />
    );
}

export function ExecutionNotesInstantFrame({ onClose }: { onClose: () => void }): React.ReactElement {
    return (
        <ExecutionOverlayInstantFrame
            title="سجل الملاحظات والمهام"
            onClose={onClose}
            testId="execution-notes-modal"
            closeTestId="execution-notes-instant-close"
            closeAriaLabel="إغلاق"
            labelledById="execution-notes-instant-title"
            overlayClassName={`fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            panelClassName={`flex h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-amber-500/30 bg-[#0A0F1C] shadow-md md:h-[600px] ${EXEC_MODAL_NOTES_SHELL_MAX}`}
            titleClassName="text-lg font-bold text-amber-200"
            headerClassName={`flex shrink-0 items-center justify-between border-b border-amber-500/20 bg-[#0B1120] px-4 pb-3 pt-4 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
            headerLayout="title-first"
            lockBody
            tabSlots={2}
        />
    );
}

export function ExecutionAppointmentInstantFrame({
    onClose,
}: {
    onClose: () => void;
}): React.ReactElement {
    return (
        <ExecutionOverlayInstantFrame
            title="إضافة موعد"
            onClose={onClose}
            testId="execution-appointment-modal"
            closeTestId="execution-appointment-instant-close"
            closeAriaLabel="إغلاق"
            labelledById="execution-appointment-instant-title"
            overlayClassName={`fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            panelClassName={`flex w-[95%] max-w-md flex-col overflow-hidden rounded-3xl border border-amber-500/30 bg-[#0A0F1C] p-5 shadow-md md:w-[480px] ${EXEC_MODAL_NOTES_SHELL_MAX}`}
            titleClassName="text-xl font-bold text-amber-200"
            headerClassName={`mb-1 flex items-center justify-between ${EXEC_MODAL_HEADER_SAFE_TOP}`}
            headerLayout="title-first"
            lockBody
            bodySlots={3}
        />
    );
}

export function ExecutionDocumentsInstantFrame({
    onClose,
}: {
    onClose: () => void;
}): React.ReactElement {
    return (
        <ExecutionOverlayInstantFrame
            title="خزينة المستندات"
            onClose={onClose}
            testId="document-vault-modal"
            closeTestId="execution-documents-instant-close"
            closeAriaLabel="إغلاق الخزينة"
            labelledById="execution-documents-instant-title"
            overlayClassName="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4"
            panelClassName="flex max-h-[90vh] w-[95%] max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-cyan-500/40 bg-[#0B1120] md:w-[600px]"
            titleClassName="text-lg font-bold text-cyan-400"
            headerClassName="flex items-center justify-between border-b border-cyan-500/30 p-4"
            headerLayout="close-first"
        />
    );
}

export function ExecutionDecisionsInstantFrame({
    onClose,
}: {
    onClose: () => void;
}): React.ReactElement {
    return (
        <ExecutionOverlayInstantFrame
            title="مركز القرارات والطعون"
            onClose={onClose}
            testId="execution-decisions-instant"
            closeTestId="execution-decisions-instant-close"
            closeAriaLabel="إغلاق"
            labelledById="execution-decisions-instant-title"
            overlayClassName={`fixed inset-0 flex flex-col overflow-hidden bg-slate-950/75 p-0 sm:p-2 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            panelClassName="flex h-full min-h-0 w-full max-h-[min(100dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] flex-1 flex-col overflow-hidden border-0 border-white/10 bg-[#0A0F1C] sm:max-h-none sm:rounded-2xl sm:border"
            titleClassName="text-lg font-bold text-slate-100 sm:text-xl"
            headerClassName={`flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
            headerLayout="title-first"
            zIndex={EXEC_MODAL_Z.decisionsShell}
            lockBody
            bodySlots={4}
        />
    );
}

export function ExecutionSeizureLogInstantFrame({
    onClose,
}: {
    onClose: () => void;
}): React.ReactElement {
    return (
        <ExecutionOverlayInstantFrame
            title="سجل الحجز"
            onClose={onClose}
            testId="unified-seizure-log"
            closeTestId="execution-seizure-log-instant-close"
            closeAriaLabel="إغلاق"
            labelledById="execution-seizure-log-instant-title"
            overlayClassName={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
            panelClassName="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#E6C673]/30 bg-[#0B1120] shadow-2xl shadow-black/60"
            titleClassName="text-[13px] font-black text-[#E6C673]"
            headerClassName="flex shrink-0 items-center justify-between border-b border-[#E6C673]/20 px-4 py-3"
            zIndex={EXEC_MODAL_Z.nestedOverFollowUpPortal}
            portal
            tabSlots={4}
            tabRowClassName="grid grid-cols-2 gap-2 sm:grid-cols-4"
        />
    );
}

export function ExecutionFullTimelineInstantFrame({
    onClose,
}: {
    onClose: () => void;
}): React.ReactElement {
    return (
        <ExecutionOverlayInstantFrame
            title="السجل الزمني الكامل"
            onClose={onClose}
            testId="execution-full-timeline-instant"
            closeTestId="execution-full-timeline-instant-close"
            closeAriaLabel="إغلاق"
            labelledById="execution-full-timeline-instant-title"
            overlayClassName={`fixed inset-0 flex flex-col overflow-hidden bg-slate-950/85 p-0 sm:p-3 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            panelClassName={`mx-auto flex min-h-0 w-full max-w-lg flex-col overflow-hidden border border-white/10 bg-[#0A0F1C] shadow-lg sm:rounded-2xl ${EXEC_MODAL_SHELL_HEIGHT_CLASS}`}
            titleClassName="text-base font-bold text-slate-100 sm:text-lg"
            headerClassName={`flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
            zIndex={EXEC_MODAL_Z.timelineFullModal}
            portal
            lockBody
            bodySlots={4}
        />
    );
}

export function ExecutionSeizedAssetsInstantFrame({
    onClose,
}: {
    onClose: () => void;
}): React.ReactElement {
    return (
        <ExecutionOverlayInstantFrame
            title="إدارة الأموال المحجوزة والمزايدات العلنية"
            onClose={onClose}
            testId="execution-seized-assets-instant"
            closeTestId="execution-seized-assets-instant-close"
            closeAriaLabel="إغلاق"
            labelledById="execution-seized-assets-instant-title"
            overlayClassName={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG} ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            panelClassName="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0B1120]"
            titleClassName="text-base font-bold text-slate-100"
            zIndex={EXEC_MODAL_Z.nestedOverUnified}
            portal
        />
    );
}

export function ExecutionNamedOverlayInstantFrame({
    title,
    onClose,
    testId = 'execution-named-overlay-instant',
    zIndex = EXEC_MODAL_Z.nestedOverUnified,
}: {
    title: string;
    onClose: () => void;
    testId?: string;
    zIndex?: number;
}): React.ReactElement {
    return (
        <ExecutionOverlayInstantFrame
            title={title}
            onClose={onClose}
            testId={testId}
            closeTestId={`${testId}-close`}
            closeAriaLabel="إغلاق"
            labelledById={`${testId}-title`}
            overlayClassName={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG} ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            panelClassName="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0B1120] shadow-md"
            titleClassName="text-base font-bold text-slate-100"
            headerClassName={`flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
            zIndex={zIndex}
            portal
        />
    );
}
