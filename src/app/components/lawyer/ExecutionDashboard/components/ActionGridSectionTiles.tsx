import React, { memo } from 'react';
import type { ElementType } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { ExecutionPinnedNotesTray } from './ExecutionPinnedNotesTray';
import { prefetchExecutionActionGridTile } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardOverlayPrefetch';
import { EXECUTION_DOSSIER_TEST_IDS } from '@/app/components/lawyer/ExecutionDashboard/executionDossierTestIds';
import { openFollowupModalStoreFallback } from '@/app/components/lawyer/ExecutionDashboard/utils/followupModalOpen';
import {
    EXECUTION_ACTION_LAW_ROW_CLASS,
    EXECUTION_ACTION_TILE_CLASS,
    EXECUTION_ACTION_TILE_ICON_WRAP,
} from '@/app/components/lawyer/ExecutionDashboard/executionDossierVisualLite';

type CaseNoteLogRow = NonNullable<ExecutionFile['caseNotesLog']>[number];
type CaseTaskRow = NonNullable<ExecutionFile['caseTasksPending']>[number];

export function ActionGridEmployeeCompulsoryBanner({
    show,
    executionToolsTimelineLockedUi,
    setEmployeeCompulsoryBannerDismissed,
    onMemoFollowupClick,
}: {
    show: boolean;
    executionToolsTimelineLockedUi: boolean;
    setEmployeeCompulsoryBannerDismissed: (dismissed: boolean) => void;
    onMemoFollowupClick?: () => void;
}) {
    if (!show) return null;
    return (
        <div className="mb-2 rounded-lg border border-amber-500/35 bg-amber-950/30 px-2.5 py-2">
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center sm:justify-between">
                <p className="min-w-0 flex-1 text-right text-[11px] font-bold leading-relaxed text-amber-100">
                    عدم حضور التكليف مسجّل — تابع من محضر المتابعة.
                </p>
                <div className="flex shrink-0 flex-row-reverse flex-wrap items-center justify-end gap-2">
                    <button
                        type="button"
                        disabled={executionToolsTimelineLockedUi}
                        onClick={() => {
                            setEmployeeCompulsoryBannerDismissed(true);
                            if (typeof onMemoFollowupClick === 'function') {
                                onMemoFollowupClick();
                                return;
                            }
                            openFollowupModalStoreFallback();
                        }}
                        className="min-h-[44px] rounded-lg border border-amber-400/50 bg-amber-600/80 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-amber-500/90 disabled:opacity-40 touch-manipulation"
                    >
                        الانتقال إلى المحضر
                    </button>
                    <button
                        type="button"
                        onClick={() => setEmployeeCompulsoryBannerDismissed(true)}
                        className="min-h-[44px] rounded-lg border border-white/15 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 hover:bg-white/5 touch-manipulation"
                    >
                        إخفاء
                    </button>
                </div>
            </div>
        </div>
    );
}

export type ActionGridTileModel = {
    key: string;
    icon: ElementType;
    label: string;
    tone: string;
    iconWrapClass: string;
    iconClass: string;
    onClick: () => void;
    locked: boolean;
};

export const ActionGridTileButton = memo(function ActionGridTileButton({
    tile,
}: {
    tile: ActionGridTileModel;
}) {
    const Ico = tile.icon;
    return (
        <button
            type="button"
            disabled={tile.locked}
            data-testid={
                tile.key === 'followup'
                    ? EXECUTION_DOSSIER_TEST_IDS.followupMemo
                    : tile.key === 'decisions'
                      ? EXECUTION_DOSSIER_TEST_IDS.decisions
                      : undefined
            }
            onPointerEnter={() => prefetchExecutionActionGridTile(tile.key)}
            onPointerDown={() => prefetchExecutionActionGridTile(tile.key)}
            onClick={tile.onClick}
            className={`${EXECUTION_ACTION_TILE_CLASS} ${tile.tone} ${
                tile.locked ? 'cursor-not-allowed opacity-40' : ''
            }`}
        >
            <span className={`${EXECUTION_ACTION_TILE_ICON_WRAP} ${tile.iconWrapClass}`}>
                <Ico size={16} strokeWidth={2} className={`shrink-0 ${tile.iconClass}`} />
            </span>
            <span className="relative min-w-0 flex-1 text-right text-[11px] font-bold leading-snug text-[#F8FAFC]">
                {tile.label}
            </span>
        </button>
    );
});

export function ActionGridNotesTile({
    tile,
    pinnedCount,
    safePinnedNotes,
    safePinnedTasks,
    onToggleNotePin,
    onToggleTaskPin,
    onTrashPinnedNote,
}: {
    tile: ActionGridTileModel;
    pinnedCount: number;
    safePinnedNotes: CaseNoteLogRow[];
    safePinnedTasks: CaseTaskRow[];
    onToggleNotePin: (id: string) => void;
    onToggleTaskPin: (id: string) => void;
    onTrashPinnedNote: (id: string) => void;
}) {
    return (
        <div className="relative z-20 min-h-[44px] overflow-visible">
            <div className="relative">
                <ActionGridTileButton tile={tile} />
                {pinnedCount > 0 ? (
                    <ExecutionPinnedNotesTray
                        variant="dock"
                        pinnedNotes={safePinnedNotes}
                        pinnedTasks={safePinnedTasks}
                        onToggleNotePin={onToggleNotePin}
                        onToggleTaskPin={onToggleTaskPin}
                        onTrashNote={onTrashPinnedNote}
                    />
                ) : null}
            </div>
        </div>
    );
}

export function ActionGridSeizureLogTile({
    show,
    ClipboardList,
    onOpenSeizureLog,
}: {
    show: boolean;
    ClipboardList: ElementType;
    onOpenSeizureLog: () => void;
}) {
    if (!show) return null;
    return (
        <button
            type="button"
            onPointerEnter={() => prefetchExecutionActionGridTile('seizure-log')}
            onClick={onOpenSeizureLog}
            dir="rtl"
            className={`${EXECUTION_ACTION_TILE_CLASS} border-[#E6C673]/18 bg-[#E6C673]/[0.05] hover:border-[#E6C673]/32 hover:bg-[#E6C673]/[0.09] focus-visible:ring-[#E6C673]/28`}
        >
            <span className={`${EXECUTION_ACTION_TILE_ICON_WRAP} border-[#E6C673]/20`}>
                <ClipboardList size={16} className="text-[#E6C673]" strokeWidth={2} />
            </span>
            <span className="relative min-w-0 flex-1 text-right text-[11px] font-bold leading-snug text-[#F5E6B8]" dir="rtl">
                سجل الحجز
            </span>
        </button>
    );
}

export function ActionGridLawReferenceRow({
    Book,
    prefetchLawReferencePanel,
    openLawReference,
}: {
    Book: ElementType;
    prefetchLawReferencePanel: () => void;
    openLawReference: () => void;
}) {
    return (
        <div className="mt-2 border-t border-white/[0.06] pt-2">
            <button
                type="button"
                onPointerEnter={() => prefetchLawReferencePanel()}
                onClick={() => {
                    prefetchLawReferencePanel();
                    openLawReference();
                }}
                dir="rtl"
                className={EXECUTION_ACTION_LAW_ROW_CLASS}
                data-testid="execution-law-reference-open"
            >
                <span className={`${EXECUTION_ACTION_TILE_ICON_WRAP} border-[#E6C673]/22`}>
                    <Book size={16} className="shrink-0 text-[#E6C673]" strokeWidth={2} />
                </span>
                <span className="relative text-[11px] font-bold leading-snug text-[#F5E6B8]">
                    قانون التنفيذ
                </span>
            </button>
        </div>
    );
}
