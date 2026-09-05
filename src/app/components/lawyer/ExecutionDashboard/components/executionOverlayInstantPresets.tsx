import React from 'react';
import { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_NOTES_SHELL_MAX,
    EXEC_MODAL_SHELL_HEIGHT_CLASS,
    EXEC_MODAL_TRASH_SHELL_MAX,
    EXEC_OVERLAY_HEADER,
    EXEC_OVERLAY_PHONE_BACKDROP,
    EXEC_OVERLAY_PHONE_SHEET,
    EXEC_OVERLAY_PHONE_SHEET_WIDE,
    EXEC_OVERLAY_TITLE,
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
            overlayClassName={EXEC_OVERLAY_PHONE_BACKDROP}
            panelClassName={EXEC_OVERLAY_PHONE_SHEET}
            titleClassName={EXEC_OVERLAY_TITLE}
            headerClassName={EXEC_OVERLAY_HEADER}
            headerLayout="title-first"
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
            overlayClassName="fixed inset-0 flex flex-col bg-[#05060D]"
            panelClassName="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0A0F1C] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            titleClassName={EXEC_OVERLAY_TITLE}
            headerClassName={EXEC_OVERLAY_HEADER}
            headerLayout="title-first"
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
            title="سجل الملاحظات"
            onClose={onClose}
            testId="execution-notes-modal"
            closeTestId="execution-notes-instant-close"
            closeAriaLabel="إغلاق"
            labelledById="execution-notes-instant-title"
            overlayClassName={`${EXEC_OVERLAY_PHONE_BACKDROP} z-[60]`}
            panelClassName={EXEC_OVERLAY_PHONE_SHEET}
            titleClassName={EXEC_OVERLAY_TITLE}
            headerClassName={EXEC_OVERLAY_HEADER}
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
            overlayClassName={`${EXEC_OVERLAY_PHONE_BACKDROP} z-[60]`}
            panelClassName={EXEC_OVERLAY_PHONE_SHEET}
            titleClassName={EXEC_OVERLAY_TITLE}
            headerClassName={EXEC_OVERLAY_HEADER}
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
            overlayClassName={`${EXEC_OVERLAY_PHONE_BACKDROP} z-[110]`}
            panelClassName={EXEC_OVERLAY_PHONE_SHEET_WIDE}
            titleClassName={EXEC_OVERLAY_TITLE}
            headerClassName={EXEC_OVERLAY_HEADER}
            headerLayout="title-first"
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
            overlayClassName={`${EXEC_OVERLAY_PHONE_BACKDROP} overflow-hidden`}
            panelClassName={`${EXEC_OVERLAY_PHONE_SHEET_WIDE} sm:max-w-2xl`}
            titleClassName={EXEC_OVERLAY_TITLE}
            headerClassName={EXEC_OVERLAY_HEADER}
            headerLayout="title-first"
            zIndex={EXEC_MODAL_Z.decisionsShell}
            lockBody
            bodySlots={4}
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
            panelClassName={`flex ${EXEC_MODAL_NOTES_SHELL_MAX} w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0B1120]`}
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
            panelClassName={`flex ${EXEC_MODAL_TRASH_SHELL_MAX} w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0B1120] shadow-md`}
            titleClassName="text-base font-bold text-slate-100"
            headerClassName={`flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
            zIndex={zIndex}
            portal
        />
    );
}
