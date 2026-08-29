import React, { memo, useMemo } from 'react';
import type { ElementType } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { prefetchExecutionActionGridTile } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardOverlayPrefetch';
import { EXECUTION_ACTION_TILE_TONES, EXECUTION_DOSSIER_ACTION_GRID_SHELL } from '@/app/components/lawyer/ExecutionDashboard/executionDossierVisualLite';
import { openFollowupModalStoreFallback } from '@/app/components/lawyer/ExecutionDashboard/utils/followupModalOpen';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import {
    ActionGridEmployeeCompulsoryBanner,
    ActionGridLawReferenceRow,
    ActionGridNotesTile,
    ActionGridSeizureLogTile,
    ActionGridTileButton,
    type ActionGridTileModel,
} from './ActionGridSectionTiles';

type CaseNoteLogRow = NonNullable<ExecutionFile['caseNotesLog']>[number];
type CaseTaskRow = NonNullable<ExecutionFile['caseTasksPending']>[number];

function prefetchLawReferencePanel(): void {
    prefetchExecutionActionGridTile('law');
}

interface ActionGridSectionProps {
    Book: ElementType;
    Calendar: ElementType;
    FileText: ElementType;
    FolderOpen: ElementType;
    Scale: ElementType;
    ClipboardList: ElementType;
    CreditCard: ElementType;
    showEmployeeCompulsoryProceduresBanner: boolean;
    executionToolsTimelineLockedUi: boolean;
    executionActionsGridLocked: boolean;
    setEmployeeCompulsoryBannerDismissed: (dismissed: boolean) => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info'
    ) => void;
    onOpenAppointmentModal?: () => void;
    onOpenNotesModal?: () => void;
    onOpenDocumentsModal?: () => void;
    onOpenDecisionsModal?: () => void;
    onOpenFinancialCenter?: () => void;
    onMemoFollowupClick?: () => void;
    onOpenSeizureLog: () => void;
    showSeizureLogButton: boolean;
    pinnedNotes: CaseNoteLogRow[];
    pinnedTasks: CaseTaskRow[];
    onToggleNotePin: (id: string) => void;
    onToggleTaskPin: (id: string) => void;
    onTrashPinnedNote: (id: string) => void;
}

export const ActionGridSection = memo(function ActionGridSection({
    Book,
    Calendar,
    FileText,
    FolderOpen,
    Scale,
    ClipboardList,
    CreditCard,
    showEmployeeCompulsoryProceduresBanner,
    executionToolsTimelineLockedUi,
    executionActionsGridLocked,
    setEmployeeCompulsoryBannerDismissed,
    showToast,
    onOpenAppointmentModal,
    onOpenNotesModal,
    onOpenDocumentsModal,
    onOpenDecisionsModal,
    onOpenFinancialCenter,
    onMemoFollowupClick,
    onOpenSeizureLog,
    showSeizureLogButton,
    pinnedNotes,
    pinnedTasks,
    onToggleNotePin,
    onToggleTaskPin,
    onTrashPinnedNote,
}: ActionGridSectionProps) {
    const safePinnedNotes = Array.isArray(pinnedNotes) ? pinnedNotes : [];
    const safePinnedTasks = Array.isArray(pinnedTasks) ? pinnedTasks : [];
    const pinnedCount = safePinnedNotes.length + safePinnedTasks.length;

    const lockedToast = () =>
        showToast(
            executionActionsGridLocked
                ? '⚠️ الإضبارة مستأخرة — ارفع الاستئخار من الشريط التنبيهي أعلى الصفحة عند انقضاء السبب.'
                : '⚠️ معاينة تاريخية — لا يمكن فتح الأدوات من الوضع الزمني.',
            'warning'
        );

    const gridTiles = useMemo(
        (): ActionGridTileModel[] => [
            {
                key: 'appt',
                icon: Calendar,
                label: 'إضافة موعد',
                ...EXECUTION_ACTION_TILE_TONES.appt,
                onClick: () => {
                    if (typeof onOpenAppointmentModal === 'function') {
                        onOpenAppointmentModal();
                        return;
                    }
                    showToast('تعذر فتح نافذة إضافة الموعد لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
                },
                locked: executionToolsTimelineLockedUi,
            },
            {
                key: 'notes',
                icon: FileText,
                label: 'ملاحظات',
                ...EXECUTION_ACTION_TILE_TONES.notes,
                onClick: () => {
                    if (typeof onOpenNotesModal === 'function') {
                        onOpenNotesModal();
                        return;
                    }
                    showToast('تعذر فتح الملاحظات لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
                },
                locked: executionToolsTimelineLockedUi,
            },
            {
                key: 'documents',
                icon: FolderOpen,
                label: 'المستندات',
                ...EXECUTION_ACTION_TILE_TONES.documents,
                onClick: () => {
                    if (typeof onOpenDocumentsModal === 'function') {
                        onOpenDocumentsModal();
                        return;
                    }
                    showToast('تعذر فتح المستندات لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
                },
                locked: executionToolsTimelineLockedUi,
            },
            {
                key: 'decisions',
                icon: Scale,
                label: 'القرارات والطعون',
                ...EXECUTION_ACTION_TILE_TONES.decisions,
                onClick: () => {
                    if (executionToolsTimelineLockedUi) {
                        lockedToast();
                        return;
                    }
                    if (typeof onOpenDecisionsModal === 'function') {
                        onOpenDecisionsModal();
                        return;
                    }
                    showToast('تعذر فتح القرارات والطعون لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
                },
                locked: executionToolsTimelineLockedUi,
            },
            {
                key: 'followup',
                icon: ClipboardList,
                label: 'محضر المتابعة',
                ...EXECUTION_ACTION_TILE_TONES.followup,
                onClick: () => {
                    if (executionToolsTimelineLockedUi) {
                        lockedToast();
                        return;
                    }
                    if (typeof onMemoFollowupClick === 'function') {
                        onMemoFollowupClick();
                        return;
                    }
                    openFollowupModalStoreFallback();
                },
                locked: executionToolsTimelineLockedUi,
            },
            {
                key: 'finance',
                icon: CreditCard,
                label: 'المركز المالي',
                ...EXECUTION_ACTION_TILE_TONES.finance,
                onClick: () => {
                    if (executionToolsTimelineLockedUi) {
                        lockedToast();
                        return;
                    }
                    if (typeof onOpenFinancialCenter === 'function') {
                        onOpenFinancialCenter();
                        return;
                    }
                    showToast('تعذر فتح المركز المالي لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
                },
                locked: executionToolsTimelineLockedUi,
            },
        ],
        [
            Calendar,
            ClipboardList,
            CreditCard,
            FileText,
            FolderOpen,
            Scale,
            executionActionsGridLocked,
            executionToolsTimelineLockedUi,
            onMemoFollowupClick,
            onOpenAppointmentModal,
            onOpenDocumentsModal,
            onOpenDecisionsModal,
            onOpenFinancialCenter,
            onOpenNotesModal,
            showToast,
        ]
    );

    return (
        <div className={EXECUTION_DOSSIER_ACTION_GRID_SHELL}>
            <ActionGridEmployeeCompulsoryBanner
                show={showEmployeeCompulsoryProceduresBanner}
                executionToolsTimelineLockedUi={executionToolsTimelineLockedUi}
                setEmployeeCompulsoryBannerDismissed={setEmployeeCompulsoryBannerDismissed}
                onMemoFollowupClick={onMemoFollowupClick}
            />

            <div className="grid grid-cols-2 gap-1.5" dir="rtl">
                {gridTiles.map((tile) =>
                    tile.key === 'notes' ? (
                        <ActionGridNotesTile
                            key={tile.key}
                            tile={tile}
                            pinnedCount={pinnedCount}
                            safePinnedNotes={safePinnedNotes}
                            safePinnedTasks={safePinnedTasks}
                            onToggleNotePin={onToggleNotePin}
                            onToggleTaskPin={onToggleTaskPin}
                            onTrashPinnedNote={onTrashPinnedNote}
                        />
                    ) : (
                        <div key={tile.key}>
                            <ActionGridTileButton tile={tile} />
                        </div>
                    )
                )}
                <ActionGridSeizureLogTile
                    show={showSeizureLogButton}
                    ClipboardList={ClipboardList}
                    onOpenSeizureLog={onOpenSeizureLog}
                />
            </div>

            <ActionGridLawReferenceRow
                Book={Book}
                prefetchLawReferencePanel={prefetchLawReferencePanel}
                openLawReference={() =>
                    useExecutionDashboardStore.getState().openModal('showLawReferencePanel')
                }
            />
        </div>
    );
});
