import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionGridSection } from '../ActionGridSection';
import { DashboardHeaderSection } from '../DashboardHeaderSection';
import type { ExecutionFile } from '@/app/types/execution';

const IconStub = () => <span aria-hidden="true" />;

describe('execution dashboard runtime regressions', () => {
    it('renders dossier header metadata from execution data when header fields are blank', () => {
        const executionData = {
            id: 'exec-1',
            creditors: [{ id: 'c-1', type: 'creditor', name: 'الدائن الأول', phone: '', address: '' }],
            debtors: [{ id: 'd-1', type: 'debtor', name: 'المدين الأول', phone: '', address: '', notificationDate: null }],
            directorate: 'تنفيذ الكرخ',
            fileNumber: '12',
            fileYear: '2026',
            claimType: 'دين',
            classification: 'مدني',
            docType: 'حكم',
            docNumber: '55',
            judgmentDate: '2026-01-02',
        } as unknown as ExecutionFile;

        render(
            <DashboardHeaderSection
                statuteStatus={null}
                isAlimonyClaim={false}
                executionPaused={false}
                handleResumeExecution={vi.fn()}
                stayOfExecutionActive={false}
                executionData={executionData}
                handleLiftStayOfExecution={vi.fn()}
                XCircle={IconStub}
                isHeaderExpanded={false}
                toggleHeaderExpanded={vi.fn()}
                headerFields={{
                    directorate: '',
                    fileNumber: '',
                    fileYear: '',
                    fileRefDisplay: '',
                    docType: '',
                    claimType: '',
                    classification: '',
                    classificationDisplay: '',
                    claimTypeDisplay: '',
                    docNumber: '',
                    judgmentDate: '',
                    specificDeliveryItemName: '',
                    specificDeliveryItemNature: '',
                    specificDeliveryItemNatureDisplay: '',
                }}
                openEditDossierMeta={vi.fn()}
                Pencil={IconStub}
                isEvictionExecutionModule={false}
                classificationDisplay=""
                showJudgmentMeta={false}
                docNumber=""
                judgmentDateDisplay=""
                claimTypeArabicDisplay=""
                evictionPropertyNumber=""
                evictionPropertyDistrict=""
                evictionPropertyTypeField=""
                evictionFullAddressField=""
            />,
        );

        expect(screen.getByText('تنفيذ الكرخ')).toBeTruthy();
        expect(screen.getByText(/12\s*\/\s*2026/)).toBeTruthy();
    });

    it('falls back to legacy dossier and party fields when arrays are absent', () => {
        const executionData = {
            id: 'exec-legacy',
            caseNo: '99/2026',
            court: 'تنفيذ الرصافة',
            creditor: { name: 'الدائن المفرد' },
            debtor: { fullName: 'المدين المفرد' },
        } as unknown as ExecutionFile;

        render(
            <DashboardHeaderSection
                statuteStatus={null}
                isAlimonyClaim={false}
                executionPaused={false}
                handleResumeExecution={vi.fn()}
                stayOfExecutionActive={false}
                executionData={executionData}
                handleLiftStayOfExecution={vi.fn()}
                XCircle={IconStub}
                isHeaderExpanded={false}
                toggleHeaderExpanded={vi.fn()}
                headerFields={{
                    directorate: '',
                    fileNumber: '',
                    fileYear: '',
                    fileRefDisplay: '',
                    docType: '',
                    claimType: '',
                    classification: '',
                    classificationDisplay: '',
                    claimTypeDisplay: '',
                    docNumber: '',
                    judgmentDate: '',
                    specificDeliveryItemName: '',
                    specificDeliveryItemNature: '',
                    specificDeliveryItemNatureDisplay: '',
                }}
                openEditDossierMeta={vi.fn()}
                Pencil={IconStub}
                isEvictionExecutionModule={false}
                classificationDisplay=""
                showJudgmentMeta={false}
                docNumber=""
                judgmentDateDisplay=""
                claimTypeArabicDisplay=""
                evictionPropertyNumber=""
                evictionPropertyDistrict=""
                evictionPropertyTypeField=""
                evictionFullAddressField=""
            />,
        );

        expect(screen.getByText('تنفيذ الرصافة')).toBeTruthy();
        expect(screen.getByText(/99\s*\/\s*2026/)).toBeTruthy();
    });

    it('opens dossier edit without toggling the header container', () => {
        const toggleHeaderExpanded = vi.fn();
        const openEditDossierMeta = vi.fn();
        const executionData = {
            id: 'exec-2',
            directorate: 'تنفيذ الكرخ',
            fileNumber: '12',
            fileYear: '2026',
        } as unknown as ExecutionFile;

        render(
            <DashboardHeaderSection
                statuteStatus={null}
                isAlimonyClaim={false}
                executionPaused={false}
                handleResumeExecution={vi.fn()}
                stayOfExecutionActive={false}
                executionData={executionData}
                handleLiftStayOfExecution={vi.fn()}
                XCircle={IconStub}
                isHeaderExpanded
                toggleHeaderExpanded={toggleHeaderExpanded}
                headerFields={{
                    directorate: 'تنفيذ الكرخ',
                    fileNumber: '12',
                    fileYear: '2026',
                    fileRefDisplay: '12 / 2026',
                    docType: '',
                    claimType: '',
                    classification: '',
                    classificationDisplay: '',
                    claimTypeDisplay: '',
                    docNumber: '',
                    judgmentDate: '',
                    specificDeliveryItemName: '',
                    specificDeliveryItemNature: '',
                    specificDeliveryItemNatureDisplay: '',
                }}
                openEditDossierMeta={openEditDossierMeta}
                Pencil={IconStub}
                isEvictionExecutionModule={false}
                classificationDisplay=""
                showJudgmentMeta={false}
                docNumber=""
                judgmentDateDisplay=""
                claimTypeArabicDisplay=""
                evictionPropertyNumber=""
                evictionPropertyDistrict=""
                evictionPropertyTypeField=""
                evictionFullAddressField=""
            />,
        );

        const editButton = screen.getByRole('button', { name: /تعديل الإضبارة والحكم/i });
        expect(editButton.getAttribute('data-exec-interactive')).toBe('true');

        fireEvent.click(editButton);

        expect(openEditDossierMeta).toHaveBeenCalledTimes(1);
        expect(toggleHeaderExpanded).not.toHaveBeenCalled();
    });

    it('uses the latest dossier edit opener after rerender', () => {
        const firstOpenEditDossierMeta = vi.fn();
        const latestOpenEditDossierMeta = vi.fn();
        const executionData = {
            id: 'exec-2b',
            directorate: 'تنفيذ الكرخ',
            fileNumber: '12',
            fileYear: '2026',
        } as unknown as ExecutionFile;

        const baseProps = {
            statuteStatus: null,
            isAlimonyClaim: false,
            executionPaused: false,
            handleResumeExecution: vi.fn(),
            stayOfExecutionActive: false,
            executionData,
            handleLiftStayOfExecution: vi.fn(),
            XCircle: IconStub,
            isHeaderExpanded: true,
            toggleHeaderExpanded: vi.fn(),
            headerFields: {
                directorate: 'تنفيذ الكرخ',
                fileNumber: '12',
                fileYear: '2026',
                fileRefDisplay: '12 / 2026',
                docType: '',
                claimType: '',
                classification: '',
                classificationDisplay: '',
                claimTypeDisplay: '',
                docNumber: '',
                judgmentDate: '',
                specificDeliveryItemName: '',
                specificDeliveryItemNature: '',
                specificDeliveryItemNatureDisplay: '',
            },
            Pencil: IconStub,
            isEvictionExecutionModule: false,
            classificationDisplay: '',
            showJudgmentMeta: false,
            docNumber: '',
            judgmentDateDisplay: '',
            claimTypeArabicDisplay: '',
            evictionPropertyNumber: '',
            evictionPropertyDistrict: '',
            evictionPropertyTypeField: '',
            evictionFullAddressField: '',
        } as const;

        const { rerender } = render(
            <DashboardHeaderSection
                {...baseProps}
                openEditDossierMeta={firstOpenEditDossierMeta}
            />,
        );

        rerender(
            <DashboardHeaderSection
                {...baseProps}
                openEditDossierMeta={latestOpenEditDossierMeta}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /تعديل الإضبارة والحكم/i }));

        expect(firstOpenEditDossierMeta).not.toHaveBeenCalled();
        expect(latestOpenEditDossierMeta).toHaveBeenCalledTimes(1);
    });

    it('toggles dossier header locally without depending on parent rerender wiring', () => {
        const toggleHeaderExpanded = vi.fn();
        const executionData = {
            id: 'exec-3',
            directorate: 'تنفيذ الكرخ',
            fileNumber: '12',
            fileYear: '2026',
        } as unknown as ExecutionFile;

        render(
            <DashboardHeaderSection
                statuteStatus={null}
                isAlimonyClaim={false}
                executionPaused={false}
                handleResumeExecution={vi.fn()}
                stayOfExecutionActive={false}
                executionData={executionData}
                handleLiftStayOfExecution={vi.fn()}
                XCircle={IconStub}
                isHeaderExpanded={false}
                toggleHeaderExpanded={toggleHeaderExpanded}
                headerFields={{
                    directorate: 'تنفيذ الكرخ',
                    fileNumber: '12',
                    fileYear: '2026',
                    fileRefDisplay: '12 / 2026',
                    docType: '',
                    claimType: '',
                    classification: '',
                    classificationDisplay: '',
                    claimTypeDisplay: '',
                    docNumber: '',
                    judgmentDate: '',
                    specificDeliveryItemName: '',
                    specificDeliveryItemNature: '',
                    specificDeliveryItemNatureDisplay: '',
                }}
                openEditDossierMeta={vi.fn()}
                Pencil={IconStub}
                isEvictionExecutionModule={false}
                classificationDisplay=""
                showJudgmentMeta={false}
                docNumber=""
                judgmentDateDisplay=""
                claimTypeArabicDisplay=""
                evictionPropertyNumber=""
                evictionPropertyDistrict=""
                evictionPropertyTypeField=""
                evictionFullAddressField=""
            />,
        );

        const headerToggle = screen.getByRole('button', { name: 'توسيع تفاصيل الإضبارة' });
        fireEvent.click(headerToggle);

        expect(screen.getByRole('button', { name: 'طيّ تفاصيل الإضبارة' })).toBeTruthy();
        expect(toggleHeaderExpanded).not.toHaveBeenCalled();
    });

    it('opens followup via store without error toast when handler is missing', async () => {
        const showToast = vi.fn();
        const openModal = vi.fn();
        const { useExecutionDashboardStore } = await import('@/app/stores/executionDashboardStore');
        vi.spyOn(useExecutionDashboardStore, 'getState').mockReturnValue({
            openModal,
        } as ReturnType<typeof useExecutionDashboardStore.getState>);

        render(
            <ActionGridSection
                Book={IconStub}
                Calendar={IconStub}
                FileText={IconStub}
                FolderOpen={IconStub}
                Scale={IconStub}
                ClipboardList={IconStub}
                CreditCard={IconStub}
                showEmployeeCompulsoryProceduresBanner={false}
                executionToolsTimelineLockedUi={false}
                executionActionsGridLocked={false}
                setEmployeeCompulsoryBannerDismissed={vi.fn()}
                showToast={showToast}
                onOpenDecisionsModal={vi.fn()}
                onMemoFollowupClick={undefined as never}
                onOpenSeizureLog={vi.fn()}
                showSeizureLogButton={false}
                pinnedNotes={[]}
                pinnedTasks={[]}
                onToggleNotePin={vi.fn()}
                onToggleTaskPin={vi.fn()}
                onTrashPinnedNote={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'محضر المتابعة' }));

        expect(openModal).toHaveBeenCalledWith('showUnifiedExecutionModal');
        expect(showToast).not.toHaveBeenCalledWith(
            'تعذر فتح محضر المتابعة لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
            'error',
        );
    });

    it('shows an explicit error when appointment opener is missing', () => {
        const showToast = vi.fn();

        render(
            <ActionGridSection
                Book={IconStub}
                Calendar={IconStub}
                FileText={IconStub}
                FolderOpen={IconStub}
                Scale={IconStub}
                ClipboardList={IconStub}
                CreditCard={IconStub}
                showEmployeeCompulsoryProceduresBanner={false}
                executionToolsTimelineLockedUi={false}
                executionActionsGridLocked={false}
                setEmployeeCompulsoryBannerDismissed={vi.fn()}
                showToast={showToast}
                onOpenAppointmentModal={undefined as never}
                onOpenDecisionsModal={vi.fn()}
                onMemoFollowupClick={vi.fn()}
                onOpenSeizureLog={vi.fn()}
                showSeizureLogButton={false}
                pinnedNotes={[]}
                pinnedTasks={[]}
                onToggleNotePin={vi.fn()}
                onToggleTaskPin={vi.fn()}
                onTrashPinnedNote={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'إضافة موعد' }));

        expect(showToast).toHaveBeenCalledWith(
            'تعذر فتح نافذة إضافة الموعد لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
            'error',
        );
    });

    it('shows an explicit error when decisions opener is missing', () => {
        const showToast = vi.fn();

        render(
            <ActionGridSection
                Book={IconStub}
                Calendar={IconStub}
                FileText={IconStub}
                FolderOpen={IconStub}
                Scale={IconStub}
                ClipboardList={IconStub}
                CreditCard={IconStub}
                showEmployeeCompulsoryProceduresBanner={false}
                executionToolsTimelineLockedUi={false}
                executionActionsGridLocked={false}
                setEmployeeCompulsoryBannerDismissed={vi.fn()}
                showToast={showToast}
                onOpenDecisionsModal={undefined as never}
                onMemoFollowupClick={vi.fn()}
                onOpenSeizureLog={vi.fn()}
                showSeizureLogButton={false}
                pinnedNotes={[]}
                pinnedTasks={[]}
                onToggleNotePin={vi.fn()}
                onToggleTaskPin={vi.fn()}
                onTrashPinnedNote={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'القرارات والطعون' }));

        expect(screen.getByRole('button', { name: 'القرارات والطعون' })).toBeTruthy();
        expect(showToast).toHaveBeenCalledWith(
            'تعذر فتح القرارات والطعون لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
            'error',
        );
    });

    it('shows an explicit error when notes opener is missing', () => {
        const showToast = vi.fn();

        render(
            <ActionGridSection
                Book={IconStub}
                Calendar={IconStub}
                FileText={IconStub}
                FolderOpen={IconStub}
                Scale={IconStub}
                ClipboardList={IconStub}
                CreditCard={IconStub}
                showEmployeeCompulsoryProceduresBanner={false}
                executionToolsTimelineLockedUi={false}
                executionActionsGridLocked={false}
                setEmployeeCompulsoryBannerDismissed={vi.fn()}
                showToast={showToast}
                onOpenNotesModal={undefined as never}
                onOpenDecisionsModal={vi.fn()}
                onMemoFollowupClick={vi.fn()}
                onOpenSeizureLog={vi.fn()}
                showSeizureLogButton={false}
                pinnedNotes={[]}
                pinnedTasks={[]}
                onToggleNotePin={vi.fn()}
                onToggleTaskPin={vi.fn()}
                onTrashPinnedNote={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'ملاحظات' }));

        expect(showToast).toHaveBeenCalledWith(
            'تعذر فتح الملاحظات لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
            'error',
        );
    });

    it('shows an explicit error when documents opener is missing', () => {
        const showToast = vi.fn();

        render(
            <ActionGridSection
                Book={IconStub}
                Calendar={IconStub}
                FileText={IconStub}
                FolderOpen={IconStub}
                Scale={IconStub}
                ClipboardList={IconStub}
                CreditCard={IconStub}
                showEmployeeCompulsoryProceduresBanner={false}
                executionToolsTimelineLockedUi={false}
                executionActionsGridLocked={false}
                setEmployeeCompulsoryBannerDismissed={vi.fn()}
                showToast={showToast}
                onOpenDocumentsModal={undefined as never}
                onOpenDecisionsModal={vi.fn()}
                onMemoFollowupClick={vi.fn()}
                onOpenSeizureLog={vi.fn()}
                showSeizureLogButton={false}
                pinnedNotes={[]}
                pinnedTasks={[]}
                onToggleNotePin={vi.fn()}
                onToggleTaskPin={vi.fn()}
                onTrashPinnedNote={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'المستندات' }));

        expect(showToast).toHaveBeenCalledWith(
            'تعذر فتح المستندات لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
            'error',
        );
    });

    it('shows an explicit error when financial opener is missing', () => {
        const showToast = vi.fn();

        render(
            <ActionGridSection
                Book={IconStub}
                Calendar={IconStub}
                FileText={IconStub}
                FolderOpen={IconStub}
                Scale={IconStub}
                ClipboardList={IconStub}
                CreditCard={IconStub}
                showEmployeeCompulsoryProceduresBanner={false}
                executionToolsTimelineLockedUi={false}
                executionActionsGridLocked={false}
                setEmployeeCompulsoryBannerDismissed={vi.fn()}
                showToast={showToast}
                onOpenDecisionsModal={vi.fn()}
                onOpenFinancialCenter={undefined as never}
                onMemoFollowupClick={vi.fn()}
                onOpenSeizureLog={vi.fn()}
                showSeizureLogButton={false}
                pinnedNotes={[]}
                pinnedTasks={[]}
                onToggleNotePin={vi.fn()}
                onToggleTaskPin={vi.fn()}
                onTrashPinnedNote={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'المركز المالي' }));

        expect(screen.getByRole('button', { name: 'المركز المالي' })).toBeTruthy();
        expect(showToast).toHaveBeenCalledWith(
            'تعذر فتح المركز المالي لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
            'error',
        );
    });

    it('invokes direct openers for appointment, notes, documents, decisions, and financial center', () => {
        const onOpenAppointmentModal = vi.fn();
        const onOpenNotesModal = vi.fn();
        const onOpenDocumentsModal = vi.fn();
        const onOpenDecisionsModal = vi.fn();
        const onOpenFinancialCenter = vi.fn();

        render(
            <ActionGridSection
                Book={IconStub}
                Calendar={IconStub}
                FileText={IconStub}
                FolderOpen={IconStub}
                Scale={IconStub}
                ClipboardList={IconStub}
                CreditCard={IconStub}
                showEmployeeCompulsoryProceduresBanner={false}
                executionToolsTimelineLockedUi={false}
                executionActionsGridLocked={false}
                setEmployeeCompulsoryBannerDismissed={vi.fn()}
                showToast={vi.fn()}
                onOpenAppointmentModal={onOpenAppointmentModal}
                onOpenNotesModal={onOpenNotesModal}
                onOpenDocumentsModal={onOpenDocumentsModal}
                onOpenDecisionsModal={onOpenDecisionsModal}
                onOpenFinancialCenter={onOpenFinancialCenter}
                onMemoFollowupClick={undefined as never}
                onOpenSeizureLog={vi.fn()}
                showSeizureLogButton={false}
                pinnedNotes={[]}
                pinnedTasks={[]}
                onToggleNotePin={vi.fn()}
                onToggleTaskPin={vi.fn()}
                onTrashPinnedNote={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'إضافة موعد' }));
        fireEvent.click(screen.getByRole('button', { name: 'ملاحظات' }));
        fireEvent.click(screen.getByRole('button', { name: 'المستندات' }));
        fireEvent.click(screen.getByRole('button', { name: 'القرارات والطعون' }));
        fireEvent.click(screen.getByRole('button', { name: 'المركز المالي' }));

        expect(onOpenAppointmentModal).toHaveBeenCalledTimes(1);
        expect(onOpenNotesModal).toHaveBeenCalledTimes(1);
        expect(onOpenDocumentsModal).toHaveBeenCalledTimes(1);
        expect(onOpenDecisionsModal).toHaveBeenCalledTimes(1);
        expect(onOpenFinancialCenter).toHaveBeenCalledTimes(1);
    });
});
