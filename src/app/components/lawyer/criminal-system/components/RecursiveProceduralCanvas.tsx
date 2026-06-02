import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCriminalStore } from '../criminalStore';
import {
    CONTAINER_COLOR_PRESETS,
    createProceduralId,
    actionStatusLabel,
    buildProceduralAttentionBoard,
    buildProceduralPlacementContext,
    buildProceduralSearchVisibility,
    childProceduralNumber,
    findActionAnchorInTree,
    findContainerAnchorInTree,
    findContainerInTree,
    findSubItemAnchorInTree,
    formatProceduralNumberChain,
    type ProceduralParentNumber,
    isFollowUpDueOrOverdue,
    pathStatusLabel,
    type ProceduralPlacementContext,
    type ProceduralAttentionEntry,
    type ProceduralActionItem,
    type ProceduralContainer,
    type ProceduralNoteItem,
    type ProceduralNavTarget,
    type AddChildKind,
} from '../proceduralContainersEngine';
import { ProceduralContainerFormModal } from './modals/ProceduralContainerFormModal';
import { ProceduralAddChildModal } from './modals/ProceduralAddChildModal';
import { ProceduralNoteFormModal } from './modals/ProceduralNoteFormModal';
import { ProceduralActionFormModal } from './modals/ProceduralActionFormModal';
import { ProceduralAdvancePhaseModal } from './modals/ProceduralAdvancePhaseModal';
import { ProceduralPlacementBreadcrumb } from './ProceduralPlacementBreadcrumb';
import {
    formatProceduralLinkDisplay,
    isProceduralLinkBroken,
    normalizeProceduralContextValue,
    resolveLiveLinkLabel,
    type ProceduralItemLink,
} from '../proceduralItemLink';
import { CasePhaseSegmentedControl } from './CasePhaseSegmentedControl';
import {
    caseRecordPhaseShortLabel,
    filterByCasePhase,
    isInvestigationClosedProceduralRoot,
    resolveProceduralRootCasePhase,
    resolveTrialPhasePivotMs,
    type CasePhaseFilter,
} from '../casePhaseFilterEngine';

export type RecursiveProceduralCanvasProps = {
    caseId: string;
    readOnly?: boolean;
    onOpenLinkedRecord?: (link: ProceduralItemLink) => void;
    /** انتقال من تبويب آخر (طلب/تايم لاين) */
    navTarget?: ProceduralNavTarget | null;
    onNavTargetHandled?: () => void;
};

/**
 * لوحة مسارات التتبع الإجرائي — نصوص وإجراءات حرة يدوياً.
 * دورة حياة جلسات المحاكمة والأحكام الفورية تُدار حصرياً من تبويب «المحاكمات» (trials[]).
 */

const ProceduralContextLine = ({
    contextLine,
    link,
    linkBroken,
    onOpen,
}: {
    contextLine: string;
    link?: ProceduralItemLink;
    linkBroken?: boolean;
    onOpen?: (link: ProceduralItemLink) => void;
}) => {
    if (linkBroken) {
        return (
            <div className="text-[8px] text-amber-300/80 font-bold mt-0.5 whitespace-normal break-words">
                ⚠️ ربط مكسور · {contextLine}
            </div>
        );
    }
    if (link && onOpen) {
        return (
            <button
                type="button"
                onClick={() => onOpen(link)}
                className="text-[8px] text-[#E6C673]/55 font-bold mt-0.5 whitespace-normal break-words text-right opacity-70 hover:opacity-90 hover:text-[#E6C673]/75 underline underline-offset-2"
            >
                {contextLine} ← فتح السجل
            </button>
        );
    }
    return (
        <div className="text-[8px] text-[#E6C673]/50 font-bold mt-0.5 whitespace-normal break-words opacity-65">
            {contextLine}
        </div>
    );
};

type DragPayload = {
    kind: 'root' | 'subitem' | 'container';
    id: string;
    fromParentId?: string | null;
};

type ContainerModalMode =
    | { kind: 'create-root' }
    | { kind: 'edit'; containerId: string }
    | { kind: 'create-nested'; parentId: string; branchRole: 'primary' | 'sub' }
    | null;

type NoteModalMode = { parentId: string; note?: ProceduralNoteItem } | null;
type ActionModalMode = { parentId: string; action?: ProceduralActionItem } | null;
type AdvanceModalMode = { parentId: string; actionId: string; actionTitle: string } | null;

const DRAG_MIME = 'text/procedural-drag';

type StructuralTone = 'root' | 'primary' | 'sub' | 'item';

/** رقم مرجعي واضح — منفصل عن أيقونة/إيموجي لتجنب التداخل البصري */
const StructuralIndexPill = ({ chain, tone }: { chain: ProceduralParentNumber; tone: StructuralTone }) => {
    const num = formatProceduralNumberChain(chain);
    const toneClass =
        tone === 'root'
            ? 'min-w-[2.1rem] bg-[#E6C673] text-[#0B1021] border-[#E6C673] shadow-[0_0_10px_rgba(230,198,115,0.25)]'
            : tone === 'primary'
              ? 'min-w-[2rem] bg-[#E6C673]/18 text-[#E6C673] border-[#E6C673]/55'
              : tone === 'sub'
                ? 'min-w-[2rem] bg-slate-800/90 text-white/75 border-slate-500/55 border-dashed'
                : 'min-w-[1.9rem] bg-slate-950 text-white/80 border-slate-600/60';
    return (
        <span
            className={`inline-flex h-8 items-center justify-center shrink-0 rounded-lg border px-1.5 text-[11px] font-black tabular-nums leading-none ${toneClass}`}
            dir="ltr"
            aria-label={`المرجع الهيكلي ${num}`}
            title={`المرجع ${num}`}
        >
            {num}
        </span>
    );
};

const RootKindBadge = () => (
    <span className="shrink-0 rounded-md border border-sky-400/45 bg-sky-500/12 px-2 py-0.5 text-[10px] font-black text-sky-100">
        مسار مستقل
    </span>
);

/** طي/توسيع لكل مسار على حدة (جذر · أساسي · فرعي) */
const PathFoldToggle = ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => (
    <button
        type="button"
        onClick={onToggle}
        className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-black whitespace-nowrap transition ${
            collapsed
                ? 'border-sky-500/45 bg-sky-500/12 text-sky-100 hover:bg-sky-500/22'
                : 'border-slate-600/55 bg-slate-800/50 text-white/75 hover:bg-slate-700/55 hover:text-white'
        }`}
        aria-expanded={!collapsed}
    >
        {collapsed ? '▸ توسيع' : '▾ طي'}
    </button>
);

const BranchKindBadge = ({ role }: { role: 'primary' | 'sub' }) =>
    role === 'primary' ? (
        <span className="shrink-0 rounded-md border border-[#E6C673]/60 bg-[#E6C673]/14 px-2 py-0.5 text-[10px] font-black text-[#E6C673]">
            ◆ فرع أساسي
        </span>
    ) : (
        <span className="shrink-0 rounded-md border border-dashed border-slate-500/60 bg-slate-900/70 px-2 py-0.5 text-[10px] font-black text-white/60">
            ◇ فرع فرعي
        </span>
    );

const buildStructuralLaneCaption = (input: {
    isRoot: boolean;
    pathDone: boolean;
    parentNumber: ProceduralParentNumber;
    isPrimaryBranch: boolean;
    subItemCount: number;
}): string => {
    const ref = formatProceduralNumberChain(input.parentNumber);
    if (input.isRoot) {
        const st = input.pathDone ? 'منتهٍ' : 'نشط';
        return `أنت في المسار المستقل ${ref} · ${input.subItemCount} خطوة بالداخل · ${st}`;
    }
    const roleLine = input.isPrimaryBranch
        ? 'مسار أساسي داخل الأب (خط رئيسي للمرحلة)'
        : 'مسار فرعي داخل الأب (تفرع جانبي)';
    return `${roleLine} · المرجع ${ref} · ${input.subItemCount} عنصر`;
};

/** عمق أكبر = خلفية أخف قليلاً (إحساس الغوص للداخل). */
const CONTAINER_SHELL_CLASS = [
    'bg-slate-800/55',
    'bg-slate-800/45',
    'bg-slate-900/40',
    'bg-slate-900/35',
    'bg-slate-900/30',
    'bg-slate-900/25',
] as const;

const ITEM_SHELL_CLASS = [
    'bg-slate-900/50 border-slate-600/38',
    'bg-slate-900/42 border-slate-600/38',
    'bg-slate-950/38 border-slate-600/38',
    'bg-slate-950/32 border-slate-600/38',
    'bg-slate-950/28 border-slate-600/38',
    'bg-slate-950/24 border-slate-600/38',
] as const;

const shellClassAt = (classes: readonly string[], depth: number) =>
    classes[Math.min(Math.max(depth, 0), classes.length - 1)];

const containerSurfaceClass = (depth: number, isPrimaryBranch = false) => {
    if (depth === 0) return shellClassAt(CONTAINER_SHELL_CLASS, 0);
    if (depth === 1 && isPrimaryBranch) return shellClassAt(CONTAINER_SHELL_CLASS, 1);
    return shellClassAt(CONTAINER_SHELL_CLASS, Math.min(depth + 1, CONTAINER_SHELL_CLASS.length - 1));
};

const itemSurfaceClass = (depth: number) => shellClassAt(ITEM_SHELL_CLASS, depth + 1);

const SubItemsAriadneThread = ({ children, depth = 0 }: { children: React.ReactNode; depth?: number }) => (
    <ul className="relative space-y-0 pe-4 ps-0.5 min-h-[0.35rem]">
        <div
            className="absolute w-px rounded-full bg-slate-500/40"
            style={{
                insetInlineEnd: '0.45rem',
                top: '0.15rem',
                bottom: '0.15rem',
                opacity: Math.max(0.28, 0.5 - depth * 0.06),
            }}
            aria-hidden
        />
        {children}
    </ul>
);

const SubItemThreadNode = ({
    children,
    showConnector = true,
}: {
    children: React.ReactNode;
    showConnector?: boolean;
}) => (
    <li className="relative list-none">
        {showConnector ? (
            <span
                className="absolute top-[1.35rem] w-3 h-px bg-slate-500/50 z-[1]"
                style={{ insetInlineEnd: '0.45rem' }}
                aria-hidden
            />
        ) : null}
        {children}
    </li>
);

/** تسلسل داخل مسار واحد فقط — لا بين المسارات */
const ActionFollowUpBadge = ({ followUpDate }: { followUpDate: string }) => {
    const overdue = isFollowUpDueOrOverdue(followUpDate);
    return (
        <span
            dir="ltr"
            className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-bold tabular-nums opacity-70 ${
                overdue
                    ? 'text-red-300/90 border border-red-500/40 bg-red-950/30'
                    : 'text-orange-300/80 border border-orange-500/25 bg-orange-950/20'
            }`}
        >
            {overdue ? <span aria-hidden>🚨</span> : <span aria-hidden>⏳</span>}
            <span>المراجعة: {followUpDate}</span>
        </span>
    );
};

const STARRED_CARD =
    'border-[#E6C673]/60 ring-1 ring-[#E6C673]/50 shadow-[0_0_10px_rgba(230,198,115,0.1)]';

const withStarredBorder = (base: string, starred: boolean) => (starred ? `${base} ${STARRED_CARD}` : base);

const TacticalTagPills = ({ tags }: { tags?: string[] }) => {
    if (!tags?.length) return null;
    return (
        <div className="flex flex-wrap gap-0.5 mt-0.5 opacity-60">
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="rounded border border-slate-600/35 bg-slate-950/40 px-1 py-px text-[8px] font-bold text-white/45"
                >
                    {tag}
                </span>
            ))}
        </div>
    );
};

const StarToggle = ({
    starred,
    disabled,
    onToggle,
}: {
    starred: boolean;
    disabled?: boolean;
    onToggle: () => void;
}) => (
    <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
            e.stopPropagation();
            onToggle();
        }}
        aria-label={starred ? 'إلغاء التثبيت' : 'تثبيت تكتيكي'}
        className={`shrink-0 text-[12px] leading-none px-0.5 transition ${
            starred ? 'text-[#E6C673]' : 'text-white/30 hover:text-[#E6C673]/70'
        } disabled:opacity-40`}
    >
        {starred ? '⭐️' : '☆'}
    </button>
);

const AttentionMicroCard = ({
    entry,
    tone,
    onFocus,
}: {
    entry: ProceduralAttentionEntry;
    tone: 'overdue' | 'upcoming' | 'neutral';
    onFocus: (actionId: string) => void;
}) => {
    const toneClass =
        tone === 'overdue'
            ? 'border-red-500/35 bg-red-950/20 hover:border-red-400/50'
            : tone === 'upcoming'
              ? 'border-orange-500/30 bg-orange-950/15 hover:border-orange-400/45'
              : 'border-slate-600/45 bg-slate-900/50 hover:border-slate-500/60';
    return (
        <button
            type="button"
            onClick={() => onFocus(entry.actionId)}
            className={`w-full text-right rounded-lg border px-2 py-1.5 transition ${toneClass}`}
        >
            <div className="text-[10px] font-black text-white/90 whitespace-normal break-words leading-snug">
                {entry.title}
            </div>
            {entry.followUpDate ? (
                <div className="text-[9px] font-bold text-white/45 mt-0.5" dir="ltr">
                    {entry.followUpDate}
                </div>
            ) : null}
            <div className="text-[8px] text-white/30 font-bold mt-0.5 truncate" title={entry.pathLabel}>
                {entry.pathLabel}
            </div>
        </button>
    );
};

const AttentionColumn = ({
    title,
    entries,
    tone,
    emptyHint,
    onFocus,
}: {
    title: string;
    entries: ProceduralAttentionEntry[];
    tone: 'overdue' | 'upcoming' | 'neutral';
    emptyHint: string;
    onFocus: (actionId: string) => void;
}) => (
    <div className="min-w-0 flex-1 rounded-lg border border-slate-700/40 bg-slate-950/40 p-2">
        <div className="text-[10px] font-black text-white/55 mb-1.5">{title}</div>
        {entries.length === 0 ? (
            <div className="text-[9px] font-bold text-white/30 py-2 text-center">{emptyHint}</div>
        ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto pe-0.5">
                {entries.map((e) => (
                    <AttentionMicroCard key={e.actionId} entry={e} tone={tone} onFocus={onFocus} />
                ))}
            </div>
        )}
    </div>
);

const InPathStepConnector = () => (
    <div className="flex items-center gap-2 py-1 pe-2" aria-hidden>
        <div className="w-px h-4 bg-[#E6C673]/35 ms-3" />
        <span className="text-[#E6C673]/50 text-[10px] font-black">↓</span>
    </div>
);

const RowMenu = ({
    onEdit,
    onClone,
    onDelete,
}: {
    onEdit: () => void;
    onClone?: () => void;
    onDelete: () => void;
}) => (
    <details className="relative shrink-0 z-30">
        <summary className="list-none cursor-pointer rounded-lg border border-slate-600/50 px-2 py-1 text-white/60 hover:text-white hover:bg-slate-700/50 text-xs font-black [&::-webkit-details-marker]:hidden">
            ⋯
        </summary>
        <div className="absolute top-full end-0 z-[80] mt-1 min-w-[7.5rem] rounded-xl border border-slate-600 bg-slate-900 shadow-2xl p-1 flex flex-col gap-0.5">
            {onClone ? (
                <button
                    type="button"
                    onClick={onClone}
                    className="w-full text-right rounded-lg px-3 py-2 text-[11px] font-black text-sky-200/95 hover:bg-slate-800 whitespace-nowrap"
                >
                    👯 استنساخ
                </button>
            ) : null}
            <button
                type="button"
                onClick={onEdit}
                className="w-full text-right rounded-lg px-3 py-2 text-[11px] font-black text-white/85 hover:bg-slate-800 whitespace-nowrap"
            >
                تعديل
            </button>
            <button
                type="button"
                onClick={onDelete}
                className="w-full text-right rounded-lg px-3 py-2 text-[11px] font-black text-red-300/90 hover:bg-red-950/40 whitespace-nowrap"
            >
                حذف
            </button>
        </div>
    </details>
);

const NoteRow = ({
    note,
    contextLine,
    contextLink,
    contextLinkBroken,
    onOpenLinkedRecord,
    parentId,
    readOnly,
    onEdit,
    onClone,
    onDelete,
    onToggleStar,
    onDragOver,
    onDrop,
    surfaceDepth = 0,
    parentNumber,
    searchHighlight,
    focusPulse,
}: {
    note: ProceduralNoteItem;
    contextLine?: string | null;
    contextLink?: ProceduralItemLink;
    contextLinkBroken?: boolean;
    onOpenLinkedRecord?: (link: ProceduralItemLink) => void;
    parentId: string;
    readOnly?: boolean;
    onEdit: () => void;
    onClone?: () => void;
    onDelete: () => void;
    onToggleStar?: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    surfaceDepth?: number;
    parentNumber: ProceduralParentNumber;
    searchHighlight?: boolean;
    focusPulse?: boolean;
}) => (
    <li
        id={`procedural-note-${note.id}`}
        draggable={!readOnly}
        onDragStart={(e) => {
            if (readOnly) return;
            e.dataTransfer.setData(
                DRAG_MIME,
                JSON.stringify({ kind: 'subitem', id: note.id, fromParentId: parentId }),
            );
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={withStarredBorder(
            `flex items-start gap-2 rounded-lg border px-2.5 py-2 shadow-sm ${itemSurfaceClass(surfaceDepth)} ${
                searchHighlight ? 'ring-1 ring-sky-400/50 bg-sky-950/25' : ''
            } ${focusPulse ? 'ring-2 ring-[#E6C673]/75 animate-pulse' : ''}`,
            note.isStarred === true,
        )}
    >
        <StructuralIndexPill chain={parentNumber} tone="item" />
        <span
            className="shrink-0 w-7 h-7 rounded-md bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sm shadow-inner"
            aria-hidden
        >
            📝
        </span>
        <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1.5">
                <div className="text-sm font-bold text-white whitespace-normal break-words flex-1 min-w-0">
                    {note.title}
                </div>
                {!readOnly && onToggleStar ? (
                    <StarToggle starred={note.isStarred === true} onToggle={onToggleStar} />
                ) : note.isStarred ? (
                    <span className="text-[12px] shrink-0" aria-hidden>
                        ⭐️
                    </span>
                ) : null}
            </div>
            <TacticalTagPills tags={note.tags} />
            {contextLine ? (
                <ProceduralContextLine
                    contextLine={contextLine}
                    link={contextLink}
                    linkBroken={contextLinkBroken}
                    onOpen={onOpenLinkedRecord}
                />
            ) : null}
            {note.body ? (
                <div className="text-[11px] text-white/55 font-bold mt-1 whitespace-pre-wrap break-words">{note.body}</div>
            ) : null}
        </div>
        {!readOnly ? (
            <RowMenu onEdit={onEdit} onClone={onClone} onDelete={onDelete} />
        ) : null}
    </li>
);

const ActionRow = ({
    action,
    contextLine,
    contextLink,
    onOpenLinkedRecord,
    parentId,
    readOnly,
    onEdit,
    onClone,
    onDelete,
    onToggleStar,
    onAdvance,
    onDragOver,
    onDrop,
    focusPulse,
    surfaceDepth = 0,
    parentNumber,
    searchHighlight,
    contextLinkBroken,
}: {
    action: ProceduralActionItem;
    contextLine?: string | null;
    contextLink?: ProceduralItemLink;
    contextLinkBroken?: boolean;
    onOpenLinkedRecord?: (link: ProceduralItemLink) => void;
    parentId: string;
    readOnly?: boolean;
    onEdit: () => void;
    onClone?: () => void;
    onDelete: () => void;
    onToggleStar?: () => void;
    onAdvance: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    focusPulse?: boolean;
    surfaceDepth?: number;
    parentNumber: ProceduralParentNumber;
    searchHighlight?: boolean;
}) => {
    const done = action.status === 'done';
    const postponed = action.status === 'postponed';
    const inProgress = action.status === 'in_progress';
    const showFollowUp = inProgress && Boolean(action.followUpDate?.trim());
    const starred = action.isStarred === true;
    const baseCard = done
        ? `border-slate-700/35 ${itemSurfaceClass(surfaceDepth)} opacity-60 saturate-[0.85]`
        : postponed
          ? 'border-amber-500/30 bg-amber-950/18 shadow-sm'
          : `border-emerald-500/25 ${itemSurfaceClass(surfaceDepth)} shadow-sm`;
    return (
        <li
            id={`procedural-action-${action.id}`}
            draggable={!readOnly && !done}
            onDragStart={(e) => {
                if (readOnly) return;
                e.dataTransfer.setData(
                    DRAG_MIME,
                    JSON.stringify({ kind: 'subitem', id: action.id, fromParentId: parentId }),
                );
            }}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={withStarredBorder(
                `flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-all ${baseCard} ${
                    done ? 'grayscale-[0.35]' : ''
                } ${
                    focusPulse && !done
                        ? 'ring-2 ring-[#E6C673]/75 shadow-[0_0_14px_rgba(230,198,115,0.35)] animate-pulse'
                        : ''
                } ${searchHighlight ? 'ring-1 ring-sky-400/50' : ''}`,
                starred && !done,
            )}
        >
            <StructuralIndexPill chain={parentNumber} tone="item" />
            <span
                className={`shrink-0 w-7 h-7 rounded-md border flex items-center justify-center text-sm ${
                    done
                        ? 'bg-slate-800/40 border-slate-600/40 opacity-70'
                        : 'bg-emerald-500/15 border-emerald-500/25 shadow-inner'
                }`}
                aria-hidden
            >
                ⚡
            </span>
            <div className="min-w-0 flex-1">
                <div
                    className={`text-sm font-bold whitespace-normal break-words ${
                        done
                            ? 'text-white/45 line-through decoration-2 decoration-slate-400'
                            : 'text-white'
                    }`}
                >
                    {action.title}
                </div>
                <TacticalTagPills tags={action.tags} />
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-black text-white/50">
                    <span dir="ltr">{action.date}</span>
                    {!readOnly && onToggleStar ? (
                        <StarToggle starred={starred} onToggle={onToggleStar} />
                    ) : starred ? (
                        <span className="text-[12px]" aria-hidden>
                            ⭐️
                        </span>
                    ) : null}
                    {showFollowUp && action.followUpDate ? (
                        <ActionFollowUpBadge followUpDate={action.followUpDate} />
                    ) : null}
                    <span
                        className={`rounded-full px-2 py-0.5 ${
                            done
                                ? 'bg-slate-600/30 text-slate-300'
                                : postponed
                                  ? 'bg-amber-500/20 text-amber-200'
                                  : 'bg-emerald-500/15 text-emerald-200'
                        }`}
                    >
                        {actionStatusLabel(action.status)}
                    </span>
                    {contextLine ? (
                        <span className="w-full">
                            <ProceduralContextLine
                                contextLine={contextLine}
                                link={contextLink}
                                linkBroken={contextLinkBroken}
                                onOpen={onOpenLinkedRecord}
                            />
                        </span>
                    ) : null}
                </div>
                {!readOnly && action.status !== 'done' ? (
                    <button
                        type="button"
                        onClick={onAdvance}
                        className="mt-2 rounded-lg bg-emerald-600/25 border border-emerald-500/35 px-2.5 py-1 text-[10px] font-black text-emerald-100 hover:bg-emerald-600/35"
                    >
                        ← انتقال للمرحلة التالية
                    </button>
                ) : null}
            </div>
            {!readOnly && !done ? (
                <RowMenu onEdit={onEdit} onClone={onClone} onDelete={onDelete} />
            ) : null}
        </li>
    );
};

export const RecursiveProceduralCanvas = ({
    caseId,
    readOnly = false,
    onOpenLinkedRecord,
    navTarget,
    onNavTargetHandled,
}: RecursiveProceduralCanvasProps) => {
    const caseRow = useCriminalStore((s) => s.casesById[caseId]);
    const containers = Array.isArray(caseRow?.proceduralContainers) ? caseRow.proceduralContainers : [];
    const addRoot = useCriminalStore((s) => s.addRootProceduralContainer);
    const updateContainer = useCriminalStore((s) => s.updateProceduralContainer);
    const deleteContainer = useCriminalStore((s) => s.deleteProceduralContainer);
    const reorderRoot = useCriminalStore((s) => s.reorderRootProceduralContainers);
    const addSubItem = useCriminalStore((s) => s.addProceduralSubItem);
    const updateSubItem = useCriminalStore((s) => s.updateProceduralSubItem);
    const deleteSubItem = useCriminalStore((s) => s.deleteProceduralSubItem);
    const duplicateSubItem = useCriminalStore((s) => s.duplicateProceduralSubItem);
    const moveSubItem = useCriminalStore((s) => s.moveProceduralSubItem);
    const moveContainer = useCriminalStore((s) => s.moveProceduralContainer);
    const advanceAction = useCriminalStore((s) => s.advanceProceduralActionPhase);
    const duplicateContainer = useCriminalStore((s) => s.duplicateProceduralContainer);

    const [containerModal, setContainerModal] = useState<ContainerModalMode>(null);
    const [addChildParentId, setAddChildParentId] = useState<string | null>(null);
    const [noteModal, setNoteModal] = useState<NoteModalMode>(null);
    const [actionModal, setActionModal] = useState<ActionModalMode>(null);
    const [advanceModal, setAdvanceModal] = useState<AdvanceModalMode>(null);
    const [dragRootId, setDragRootId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [attentionOpen, setAttentionOpen] = useState(true);
    const [navExpandIds, setNavExpandIds] = useState<Set<string>>(() => new Set());
    const [focusActionId, setFocusActionId] = useState<string | null>(null);
    const [focusNoteId, setFocusNoteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const stageJourney = Array.isArray(caseRow?.stageJourney) ? caseRow.stageJourney : [];
    const hasTrialPhase = resolveTrialPhasePivotMs(stageJourney) != null;

    /**
     * مرشّح المرحلة للمسارات الإجرائية:
     *   • قبل وجود مرحلة محاكمة ⇒ `'all'` (لا قائمة اختيار حيث لا يوجد فصل بعد).
     *   • مع وجود مرحلة محاكمة ⇒ يَبدأ افتراضياً عند `'trial'` لإخفاء مسارات التحقيق المُغلقة،
     *     ويُمكن للمستخدم التَوسعة يدوياً عبر شريط الترشيح.
     */
    const [pathsPhaseFilter, setPathsPhaseFilter] = useState<CasePhaseFilter>(
        () => (hasTrialPhase ? 'trial' : 'all'),
    );
    const prevHasTrialPhaseRef = useRef(hasTrialPhase);
    useEffect(() => {
        const wasTrial = prevHasTrialPhaseRef.current;
        prevHasTrialPhaseRef.current = hasTrialPhase;
        if (!hasTrialPhase) {
            setPathsPhaseFilter('all');
            return;
        }
        if (!wasTrial) setPathsPhaseFilter('trial');
    }, [hasTrialPhase]);

    const searchVisibility = useMemo(
        () => buildProceduralSearchVisibility(containers, searchQuery),
        [containers, searchQuery],
    );

    const attentionBoard = useMemo(() => buildProceduralAttentionBoard(containers), [containers]);

    const notePlacement = useMemo((): ProceduralPlacementContext | null => {
        if (!noteModal?.parentId) return null;
        return buildProceduralPlacementContext(containers, noteModal.parentId);
    }, [containers, noteModal?.parentId]);

    const actionPlacement = useMemo((): ProceduralPlacementContext | null => {
        if (!actionModal?.parentId) return null;
        return buildProceduralPlacementContext(containers, actionModal.parentId);
    }, [containers, actionModal?.parentId]);

    const focusActionInCanvas = useCallback(
        (actionId: string) => {
            const anchor = findActionAnchorInTree(containers, actionId);
            if (!anchor) return;
            setNavExpandIds(new Set(anchor.expandContainerIds));
            setFocusActionId(actionId);
            window.setTimeout(() => {
                const el = document.getElementById(`procedural-action-${actionId}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
            window.setTimeout(() => setFocusActionId(null), 1000);
        },
        [containers],
    );

    const focusNoteInCanvas = useCallback(
        (noteId: string) => {
            const anchor = findSubItemAnchorInTree(containers, noteId);
            if (!anchor || anchor.itemType !== 'note') return;
            setNavExpandIds(new Set(anchor.expandContainerIds));
            setFocusNoteId(noteId);
            window.setTimeout(() => {
                document.getElementById(`procedural-note-${noteId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
            window.setTimeout(() => setFocusNoteId(null), 1000);
        },
        [containers],
    );

    const focusContainerInCanvas = useCallback(
        (containerId: string) => {
            const anchor = findContainerAnchorInTree(containers, containerId);
            if (!anchor) return;
            setNavExpandIds(new Set(anchor.expandContainerIds));
            window.setTimeout(() => {
                document.getElementById(`procedural-container-${containerId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        },
        [containers],
    );

    useEffect(() => {
        if (!navTarget) return;
        if (navTarget.kind === 'action') focusActionInCanvas(navTarget.id);
        else if (navTarget.kind === 'note') focusNoteInCanvas(navTarget.id);
        else focusContainerInCanvas(navTarget.id);
        onNavTargetHandled?.();
    }, [navTarget, focusActionInCanvas, focusNoteInCanvas, focusContainerInCanvas, onNavTargetHandled]);

    useEffect(() => {
        if (!searchVisibility.active) return;
        setNavExpandIds((prev) => {
            const next = new Set(prev);
            searchVisibility.expandContainerIds.forEach((id) => next.add(id));
            return next;
        });
    }, [searchVisibility.active, searchVisibility.expandContainerIds]);

    const toggleContainerFold = (containerId: string, currentlyCollapsed: boolean) => {
        updateContainer(caseId, containerId, { collapsed: !currentlyCollapsed });
        setNavExpandIds((prev) => {
            const next = new Set(prev);
            if (currentlyCollapsed) next.add(containerId);
            else next.delete(containerId);
            return next;
        });
    };

    const linkResolverInput = useMemo(
        () => ({
            timelineEvents: caseRow?.timelineEvents,
            lawyerRequests: caseRow?.lawyerRequests,
        }),
        [caseRow?.lawyerRequests, caseRow?.timelineEvents],
    );

    const proceduralContextDisplay = (
        item: ProceduralNoteItem | ProceduralActionItem,
    ): { line: string | null; link?: ProceduralItemLink; linkBroken?: boolean } => {
        const ctx = normalizeProceduralContextValue(item.link, item.contextRef, item.contextNote);
        const live =
            ctx.link != null ? resolveLiveLinkLabel(ctx.link, linkResolverInput) : undefined;
        const line = formatProceduralLinkDisplay(ctx, live);
        const linkBroken =
            ctx.link != null ? isProceduralLinkBroken(ctx.link, linkResolverInput) : false;
        return { line, link: ctx.link, linkBroken };
    };

    const phaseFilteredRoots = useMemo(() => {
        if (!hasTrialPhase || pathsPhaseFilter === 'all') return containers;
        return filterByCasePhase(containers, pathsPhaseFilter, (root) =>
            resolveProceduralRootCasePhase(root, stageJourney),
        );
    }, [containers, hasTrialPhase, pathsPhaseFilter, stageJourney]);

    const pathStats = useMemo(() => {
        const completed = phaseFilteredRoots.filter((c) => c.pathStatus === 'completed').length;
        return {
            total: phaseFilteredRoots.length,
            active: phaseFilteredRoots.length - completed,
            completed,
        };
    }, [phaseFilteredRoots]);

    const editingContainer = useMemo(() => {
        if (containerModal?.kind !== 'edit') return null;
        const walk = (list: ProceduralContainer[]): ProceduralContainer | null => {
            for (const c of list) {
                if (c.id === containerModal.containerId) return c;
                for (const item of c.subItems) {
                    if (item.type === 'container') {
                        const hit = walk([item.container]);
                        if (hit) return hit;
                    }
                }
            }
            return null;
        };
        return walk(containers);
    }, [containerModal, containers]);

    const parseDrag = (e: React.DragEvent): DragPayload | null => {
        try {
            const raw = e.dataTransfer.getData(DRAG_MIME);
            if (!raw) return null;
            const o = JSON.parse(raw) as DragPayload;
            if (!o?.id || !o?.kind) return null;
            return o;
        } catch {
            return null;
        }
    };

    const handleRootDrop = (targetId: string) => (e: React.DragEvent) => {
        e.preventDefault();
        const drag = parseDrag(e);
        if (!drag) return;
        if (drag.kind === 'root' && drag.id !== targetId) {
            reorderRoot(caseId, drag.id, targetId);
        } else if (drag.kind === 'container') {
            moveContainer(caseId, drag.id, null, containers.findIndex((c) => c.id === targetId));
        } else if (drag.kind === 'subitem' && drag.fromParentId) {
            const hit = findContainerInTree(containers, targetId);
            const toIndex = hit?.container.subItems.length ?? 0;
            moveSubItem(caseId, drag.fromParentId, targetId, drag.id, toIndex);
        }
        setDragRootId(null);
    };

    const handleDropOnSubList = (parentId: string, toIndex: number) => (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const drag = parseDrag(e);
        if (!drag) return;
        if (drag.kind === 'subitem' && drag.fromParentId) {
            moveSubItem(caseId, drag.fromParentId, parentId, drag.id, toIndex);
        } else if (drag.kind === 'container') {
            moveContainer(caseId, drag.id, parentId, toIndex);
        }
    };

    const handleDropOnContainer = (parentId: string) => (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const drag = parseDrag(e);
        if (!drag) return;
        const hit = findContainerInTree(containers, parentId);
        const len = hit?.container.subItems.length ?? 0;
        if (drag.kind === 'container') {
            moveContainer(caseId, drag.id, parentId, len);
        } else if (drag.kind === 'subitem' && drag.fromParentId) {
            moveSubItem(caseId, drag.fromParentId, parentId, drag.id, len);
        }
    };

    const renderContainerTree = (
        container: ProceduralContainer,
        depth: number,
        isRoot: boolean,
        pathLocked = false,
        parentNumber: ProceduralParentNumber = [1],
    ) => {
        if (searchVisibility.active && !searchVisibility.visibleContainerIds.has(container.id)) {
            return null;
        }
        const collapsed = container.collapsed === true && !navExpandIds.has(container.id);
        const pathDone = isRoot && container.pathStatus === 'completed';
        const pathActive = isRoot && container.pathStatus !== 'completed';
        const locked = pathLocked || pathDone;
        const insideReadOnly = readOnly || locked;
        const prevent = (e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        };

        const isPrimaryBranch = !isRoot && container.branchRole === 'primary';
        const laneCaption = buildStructuralLaneCaption({
            isRoot,
            pathDone,
            parentNumber,
            isPrimaryBranch,
            subItemCount: container.subItems.length,
        });
        const indexTone: StructuralTone = isRoot ? 'root' : isPrimaryBranch ? 'primary' : 'sub';
        const canEditInside = !readOnly && !locked;
        const itemSurfaceDepth = depth + 1;
        const shellDepth = isRoot ? 0 : depth;
        const rootPhase =
            isRoot && hasTrialPhase ? resolveProceduralRootCasePhase(container, stageJourney) : null;
        /**
         * عند عرض المحاكمة بمُرشّح «الكل»: نُبهّت بصرياً مسارات التحقيق المُغلقة
         * كي يَبقى التمييز واضحاً وإن ظَهرت في القائمة.
         */
        const dimAsInvestigationLegacy =
            isRoot &&
            hasTrialPhase &&
            pathsPhaseFilter === 'all' &&
            isInvestigationClosedProceduralRoot(container, stageJourney);

        return (
            <div
                key={container.id}
                id={`procedural-container-${container.id}`}
                draggable={isRoot && !readOnly && pathActive && !locked}
                onDragStart={(e) => {
                    if (!isRoot || readOnly || !pathActive || locked) return;
                    e.dataTransfer.setData(
                        DRAG_MIME,
                        JSON.stringify({ kind: 'root', id: container.id, fromParentId: null }),
                    );
                    setDragRootId(container.id);
                }}
                onDragOver={
                    isRoot
                        ? (e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                          }
                        : prevent
                }
                onDrop={isRoot ? handleRootDrop(container.id) : undefined}
                className={`rounded-xl transition overflow-hidden ${
                    isRoot
                        ? `border border-slate-600/40 border-e-4 shadow-lg shadow-black/25 ${containerSurfaceClass(shellDepth)} ${
                              pathDone ? 'opacity-90' : ''
                          }`
                        : `border pe-4 sm:pe-6 ms-1 ${containerSurfaceClass(shellDepth, isPrimaryBranch)} ${
                              isPrimaryBranch
                                  ? 'border-slate-600/45 border-e-[3px] border-e-[#E6C673]/55'
                                  : 'border-slate-600/45 border-e border-dashed border-slate-600/55'
                          }`
                } ${isRoot && dragRootId === container.id ? 'opacity-50' : ''} ${
                    isRoot && pathActive && !readOnly ? 'cursor-grab active:cursor-grabbing' : ''
                } ${dimAsInvestigationLegacy ? 'opacity-60' : ''}`}
                style={isRoot ? { borderInlineEndColor: container.color } : { borderInlineEndColor: `${container.color}55` }}
                onDragOverCapture={!isRoot ? prevent : undefined}
                onDropCapture={!isRoot ? handleDropOnContainer(container.id) : undefined}
            >
                <div className="relative z-10 px-3 py-2.5 border-b border-slate-700/35 flex items-start gap-2 overflow-visible">
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <StructuralIndexPill chain={parentNumber} tone={indexTone} />
                        <PathFoldToggle
                            collapsed={collapsed}
                            onToggle={() => toggleContainerFold(container.id, collapsed)}
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            {isRoot ? <RootKindBadge /> : <BranchKindBadge role={isPrimaryBranch ? 'primary' : 'sub'} />}
                            <div className="text-sm font-black text-white whitespace-normal break-words">
                                {container.title}
                            </div>
                            {isRoot ? (
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                        pathDone
                                            ? 'bg-slate-600/30 text-slate-300'
                                            : 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/25'
                                    }`}
                                >
                                    {pathStatusLabel(pathDone ? 'completed' : 'active')}
                                </span>
                            ) : null}
                            {rootPhase ? (
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-black border ${
                                        rootPhase === 'investigation'
                                            ? 'bg-amber-500/10 text-amber-100 border-amber-500/30'
                                            : 'bg-violet-500/10 text-violet-100 border-violet-500/30'
                                    }`}
                                    title={`مسار في ${caseRecordPhaseShortLabel(rootPhase)}`}
                                >
                                    {caseRecordPhaseShortLabel(rootPhase)}
                                </span>
                            ) : null}
                            {!isRoot && container.icon ? (
                                <span className="text-base opacity-45" aria-hidden title="أيقونة المرحلة">
                                    {container.icon}
                                </span>
                            ) : null}
                        </div>
                        <div className="text-[10px] font-bold text-white/55 mt-1 leading-relaxed whitespace-normal break-words">
                            {laneCaption}
                            {collapsed ? (
                                <span className="text-sky-200/80 font-black"> · مطوي — اضغط «توسيع» لعرض المحتوى</span>
                            ) : null}
                        </div>
                    </div>
                    {isRoot && !readOnly ? (
                        <div className="flex flex-wrap items-center gap-1 shrink-0 max-w-[42%] justify-end">
                            {pathActive ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        updateContainer(caseId, container.id, {
                                            pathStatus: 'completed',
                                            pathEndedAt: new Date().toISOString().slice(0, 10),
                                        });
                                    }}
                                    className="rounded-lg border border-emerald-500/35 px-2 py-0.5 text-[9px] font-black text-emerald-200 hover:bg-emerald-950/35 whitespace-nowrap"
                                >
                                    إنهاء
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        updateContainer(caseId, container.id, {
                                            pathStatus: 'active',
                                            pathEndedAt: undefined,
                                        });
                                    }}
                                    className="rounded-lg border border-sky-500/35 px-2 py-0.5 text-[9px] font-black text-sky-200 hover:bg-slate-800 whitespace-nowrap"
                                >
                                    إعادة فتح
                                </button>
                            )}
                            {pathActive ? (
                                <button
                                    type="button"
                                    onClick={() => duplicateContainer(caseId, container.id)}
                                    className="rounded-lg border border-slate-600/50 px-2 py-0.5 text-[9px] font-black text-white/70 hover:bg-slate-800 whitespace-nowrap"
                                >
                                    نسخ
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    {!readOnly && !locked ? (
                        <RowMenu
                            onEdit={() => setContainerModal({ kind: 'edit', containerId: container.id })}
                            onDelete={() => setConfirmDeleteId(container.id)}
                        />
                    ) : null}
                </div>

                {!collapsed ? (
                    <div
                        className={`px-3 py-3 ${!isRoot ? `bg-slate-950/${Math.max(12, 24 - depth * 3)}` : ''}`}
                    >
                        {isRoot ? (
                            <div className="text-[10px] font-black text-[#E6C673]/75 mb-2 flex items-center gap-1">
                                <span>●</span> بداية المسار — وسّع لبناء المراحل والإجراءات بالداخل
                            </div>
                        ) : null}
                        {container.subItems.length === 0 ? (
                            <div
                                className="rounded-lg border border-dashed border-slate-600/45 px-3 py-4 text-center text-white/40 text-[11px] font-bold"
                                onDragOver={insideReadOnly ? undefined : prevent}
                                onDrop={insideReadOnly ? undefined : handleDropOnSubList(container.id, 0)}
                            >
                                {locked
                                    ? 'لا عناصر — المسار مغلق للمراجعة فقط'
                                    : isRoot
                                      ? 'المسار فارغ — أضف مراحل وإجراءات داخله (الترتيب من الأعلى للأسفل)'
                                      : 'فارغ — أضف إجراءً أو ملاحظة'}
                            </div>
                        ) : (
                            <SubItemsAriadneThread depth={itemSurfaceDepth}>
                                {container.subItems.map((item, idx) => {
                                    const childNumber = childProceduralNumber(parentNumber, idx);
                                    const ctxDisplay =
                                        item.type === 'note' || item.type === 'action'
                                            ? proceduralContextDisplay(item)
                                            : null;
                                    return (
                                    <SubItemThreadNode key={item.type === 'container' ? item.container.id : item.id}>
                                        {idx > 0 ? <InPathStepConnector /> : null}
                                        {item.type === 'note' ? (
                                            <NoteRow
                                                note={item}
                                                parentNumber={childNumber}
                                                surfaceDepth={itemSurfaceDepth}
                                                contextLine={ctxDisplay?.line ?? undefined}
                                                contextLink={ctxDisplay?.link}
                                                contextLinkBroken={ctxDisplay?.linkBroken}
                                                searchHighlight={searchVisibility.matchedItemIds.has(item.id)}
                                                focusPulse={focusNoteId === item.id}
                                                onOpenLinkedRecord={onOpenLinkedRecord}
                                                parentId={container.id}
                                                readOnly={insideReadOnly}
                                                onEdit={() => setNoteModal({ parentId: container.id, note: item })}
                                                onClone={
                                                    insideReadOnly
                                                        ? undefined
                                                        : () => duplicateSubItem(caseId, container.id, item.id)
                                                }
                                                onToggleStar={
                                                    insideReadOnly
                                                        ? undefined
                                                        : () =>
                                                              updateSubItem(caseId, container.id, item.id, {
                                                                  isStarred: item.isStarred !== true,
                                                              })
                                                }
                                                onDelete={() => deleteSubItem(caseId, container.id, item.id)}
                                                onDragOver={insideReadOnly ? undefined : prevent}
                                                onDrop={
                                                    insideReadOnly
                                                        ? undefined
                                                        : handleDropOnSubList(container.id, idx)
                                                }
                                            />
                                        ) : null}
                                        {item.type === 'action' ? (
                                            <ActionRow
                                                action={item}
                                                parentNumber={childNumber}
                                                surfaceDepth={itemSurfaceDepth}
                                                focusPulse={focusActionId === item.id}
                                                contextLine={ctxDisplay?.line ?? undefined}
                                                contextLink={ctxDisplay?.link}
                                                contextLinkBroken={ctxDisplay?.linkBroken}
                                                searchHighlight={searchVisibility.matchedItemIds.has(item.id)}
                                                onOpenLinkedRecord={onOpenLinkedRecord}
                                                parentId={container.id}
                                                readOnly={insideReadOnly}
                                                onEdit={() =>
                                                    setActionModal({ parentId: container.id, action: item })
                                                }
                                                onClone={
                                                    insideReadOnly
                                                        ? undefined
                                                        : () => duplicateSubItem(caseId, container.id, item.id)
                                                }
                                                onToggleStar={
                                                    insideReadOnly
                                                        ? undefined
                                                        : () =>
                                                              updateSubItem(caseId, container.id, item.id, {
                                                                  isStarred: item.isStarred !== true,
                                                              })
                                                }
                                                onDelete={() => deleteSubItem(caseId, container.id, item.id)}
                                                onAdvance={() =>
                                                    setAdvanceModal({
                                                        parentId: container.id,
                                                        actionId: item.id,
                                                        actionTitle: item.title,
                                                    })
                                                }
                                                onDragOver={insideReadOnly ? undefined : prevent}
                                                onDrop={
                                                    insideReadOnly
                                                        ? undefined
                                                        : handleDropOnSubList(container.id, idx)
                                                }
                                            />
                                        ) : null}
                                        {item.type === 'container' ? (
                                            <div
                                                draggable={!insideReadOnly}
                                                onDragStart={(e) => {
                                                    if (insideReadOnly) return;
                                                    e.dataTransfer.setData(
                                                        DRAG_MIME,
                                                        JSON.stringify({
                                                            kind: 'container',
                                                            id: item.container.id,
                                                            fromParentId: container.id,
                                                        }),
                                                    );
                                                    e.stopPropagation();
                                                }}
                                                onDragOver={insideReadOnly ? undefined : prevent}
                                                onDrop={
                                                    insideReadOnly
                                                        ? undefined
                                                        : handleDropOnSubList(container.id, idx)
                                                }
                                                className={`relative mt-1 pe-1 ${
                                                    item.container.branchRole === 'primary'
                                                        ? 'border-e-[3px] border-e-[#E6C673]/50'
                                                        : 'border-e border-dashed border-slate-600/40'
                                                }`}
                                            >
                                                {renderContainerTree(
                                                    item.container,
                                                    depth + 1,
                                                    false,
                                                    locked,
                                                    childNumber,
                                                )}
                                            </div>
                                        ) : null}
                                    </SubItemThreadNode>
                                    );
                                })}
                            </SubItemsAriadneThread>
                        )}

                        {canEditInside ? (
                            <div className="mt-3 space-y-2">
                                {isRoot ? (
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setContainerModal({
                                                    kind: 'create-nested',
                                                    parentId: container.id,
                                                    branchRole: 'primary',
                                                })
                                            }
                                            className="flex-1 min-w-[7.5rem] rounded-lg border border-[#E6C673]/45 bg-[#E6C673]/10 py-2 text-[11px] font-black text-[#E6C673] hover:bg-[#E6C673]/20 transition"
                                        >
                                            + مسار أساسي
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setContainerModal({
                                                    kind: 'create-nested',
                                                    parentId: container.id,
                                                    branchRole: 'sub',
                                                })
                                            }
                                            className="flex-1 min-w-[7.5rem] rounded-lg border border-slate-600/55 py-2 text-[11px] font-black text-white/70 hover:text-white hover:border-slate-500 transition"
                                        >
                                            + مسار فرعي
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setContainerModal({
                                                kind: 'create-nested',
                                                parentId: container.id,
                                                branchRole: 'sub',
                                            })
                                        }
                                        className="w-full rounded-lg border border-slate-600/55 py-2 text-[11px] font-black text-white/70 hover:text-white hover:border-slate-500 transition"
                                    >
                                        + مسار فرعي
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setAddChildParentId(container.id)}
                                    className="w-full rounded-lg border border-dashed border-slate-600/50 py-2 text-[11px] font-black text-white/55 hover:text-[#E6C673] hover:border-[#E6C673]/40 transition"
                                >
                                    + ملاحظة أو إجراء
                                </button>
                            </div>
                        ) : null}
                        {locked && isRoot ? (
                            <div className="mt-2 text-center text-[10px] font-bold text-white/35">
                                مسار منتهٍ — للمراجعة فقط (أعد فتحه من الأعلى للتعديل)
                            </div>
                        ) : null}
                        {isRoot && pathDone ? (
                            <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/25 px-3 py-2.5 text-center">
                                <div className="text-[11px] font-black text-emerald-200">● نهاية المسار</div>
                                {container.pathEndedAt ? (
                                    <div className="text-[10px] text-white/45 font-bold mt-0.5" dir="ltr">
                                        {container.pathEndedAt}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        );
    };

    const displayRoots = useMemo(() => {
        if (!searchVisibility.active) return phaseFilteredRoots;
        return phaseFilteredRoots.filter((c) => searchVisibility.visibleContainerIds.has(c.id));
    }, [phaseFilteredRoots, searchVisibility.active, searchVisibility.visibleContainerIds]);

    return (
        <div
            id="procedural-canvas-root"
            className="flex flex-col p-4 sm:p-6 max-w-3xl mx-auto w-full gap-4"
            dir="rtl"
        >
            <div className="space-y-2 print:hidden">
                <div className="text-white/85 font-black text-sm">مسارات التتبع</div>
                {pathStats.total > 0 ? (
                    <div className="text-[10px] font-black text-white/50">
                        {pathStats.active} نشط · {pathStats.completed} منتهٍ · {pathStats.total} مسار
                    </div>
                ) : null}
            </div>

            {hasTrialPhase && containers.length > 0 ? (
                <CasePhaseSegmentedControl
                    value={pathsPhaseFilter}
                    onChange={setPathsPhaseFilter}
                    className="print:hidden"
                    ariaLabel="فلتر مرحلة مسارات التتبع"
                    labelOverrides={{
                        investigation: 'مسارات التحقيق',
                        trial: 'مسارات المحاكمة',
                    }}
                />
            ) : null}

            {containers.length > 0 ? (
                <div className="flex flex-col gap-2 print:hidden">
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="بحث في المسارات والملاحظات والإجراءات…"
                        className="w-full rounded-xl border border-slate-600/55 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/45 placeholder:text-white/35"
                    />
                    {searchVisibility.active ? (
                        <div className="text-[10px] font-bold text-sky-200/80">
                            {searchVisibility.matchedItemIds.size > 0
                                ? `${searchVisibility.matchedItemIds.size} نتيجة مطابقة`
                                : 'لا نتائج — جرّب كلمة أخرى'}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {attentionBoard.total > 0 ? (
                <details
                    className="rounded-xl border border-slate-600/50 bg-slate-900/60 overflow-hidden print:hidden"
                    open={attentionOpen}
                    onToggle={(e) => setAttentionOpen(e.currentTarget.open)}
                >
                    <summary className="list-none cursor-pointer px-3 py-2.5 flex items-center justify-between gap-2 border-b border-slate-700/40 bg-slate-800/40 [&::-webkit-details-marker]:hidden">
                        <div className="text-[11px] font-black text-white/85">
                            🎯 مركز المتابعة والانتباه
                            <span className="text-white/45 font-bold ms-2">
                                ({attentionBoard.total} قيد المتابعة)
                            </span>
                        </div>
                        <span className="text-white/40 text-[10px] font-black">{attentionOpen ? '▾' : '▸'}</span>
                    </summary>
                    <div className="p-2 flex flex-col sm:flex-row gap-2">
                        <AttentionColumn
                            title={`🚨 متأخرة (${attentionBoard.overdue.length})`}
                            entries={attentionBoard.overdue}
                            tone="overdue"
                            emptyHint="—"
                            onFocus={focusActionInCanvas}
                        />
                        <AttentionColumn
                            title={`⏳ قادمة/اليوم (${attentionBoard.upcoming.length})`}
                            entries={attentionBoard.upcoming}
                            tone="upcoming"
                            emptyHint="—"
                            onFocus={focusActionInCanvas}
                        />
                        <AttentionColumn
                            title={`📌 بدون موعد (${attentionBoard.noDate.length})`}
                            entries={attentionBoard.noDate}
                            tone="neutral"
                            emptyHint="—"
                            onFocus={focusActionInCanvas}
                        />
                    </div>
                </details>
            ) : null}

            {containers.length > 0 && !readOnly ? (
                <div className="flex flex-wrap gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={() => setContainerModal({ kind: 'create-root' })}
                        className="flex-1 min-w-[9rem] rounded-xl bg-[#E6C673] text-[#0B1021] py-2.5 text-sm font-black hover:brightness-110 transition"
                    >
                        + مسار جديد
                    </button>
                </div>
            ) : null}

            {containers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-600/45 px-6 py-16 text-center gap-5">
                    <p className="text-white/55 text-sm font-bold max-w-xs">
                        اللوحة فارغة. ابدأ خطتك الإجرائية الآن.
                    </p>
                    {!readOnly ? (
                        <button
                            type="button"
                            onClick={() => setContainerModal({ kind: 'create-root' })}
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] px-8 py-3 text-sm font-black hover:brightness-110 transition shadow-lg shadow-[#E6C673]/15"
                        >
                            ➕ مسار جديد
                        </button>
                    ) : null}
                </div>
            ) : displayRoots.length === 0 && searchVisibility.active ? (
                <div className="rounded-xl border border-dashed border-slate-600/45 px-6 py-10 text-center text-white/45 text-sm font-bold">
                    لا مسارات تطابق البحث.
                </div>
            ) : displayRoots.length === 0 && pathsPhaseFilter !== 'all' ? (
                <div className="rounded-xl border border-dashed border-slate-600/45 px-6 py-10 text-center text-white/45 text-sm font-bold">
                    لا مسارات في{' '}
                    {pathsPhaseFilter === 'investigation' ? 'مرحلة التحقيق' : 'مرحلة المحاكمة'}.
                </div>
            ) : (
                <div className="flex flex-col gap-8 procedural-print-target">
                    {displayRoots.map((c, mapIdx) => {
                        const rootIdx = containers.indexOf(c);
                        const showDivider = mapIdx > 0;
                        return (
                        <div
                            key={c.id}
                            className={showDivider ? 'pt-6 border-t border-dashed border-slate-600/40' : ''}
                        >
                            {renderContainerTree(c, 0, true, false, [rootIdx + 1])}
                        </div>
                        );
                    })}
                </div>
            )}

            <ProceduralContainerFormModal
                open={containerModal !== null}
                title={
                    containerModal?.kind === 'edit'
                        ? 'تعديل'
                        : containerModal?.kind === 'create-nested'
                          ? containerModal.branchRole === 'primary'
                              ? 'مسار أساسي داخل المسار'
                              : 'مسار فرعي'
                          : 'مسار جديد'
                }
                initial={
                    containerModal?.kind === 'edit' && editingContainer
                        ? {
                              title: editingContainer.title,
                              color: editingContainer.color,
                              icon: editingContainer.icon,
                          }
                        : containerModal?.kind === 'create-nested'
                          ? {
                                title: '',
                                color: CONTAINER_COLOR_PRESETS[containerModal.branchRole === 'primary' ? 0 : 1],
                                icon: containerModal.branchRole === 'primary' ? '🛤️' : '📁',
                            }
                          : undefined
                }
                onClose={() => setContainerModal(null)}
                onSubmit={(payload) => {
                    if (containerModal?.kind === 'create-root') {
                        addRoot(caseId, payload);
                    } else if (containerModal?.kind === 'create-nested') {
                        const branchRole = containerModal.branchRole;
                        addSubItem(caseId, containerModal.parentId, {
                            type: 'container',
                            container: {
                                id: createProceduralId(),
                                title: payload.title,
                                color: payload.color,
                                icon: payload.icon,
                                parentId: containerModal.parentId,
                                branchRole,
                                subItems: [],
                            },
                        });
                    } else if (containerModal?.kind === 'edit') {
                        updateContainer(caseId, containerModal.containerId, payload);
                    }
                    setContainerModal(null);
                }}
            />

            <ProceduralAddChildModal
                open={addChildParentId !== null}
                onClose={() => setAddChildParentId(null)}
                onPick={(kind: AddChildKind) => {
                    const parentId = addChildParentId;
                    if (!parentId) return;
                    setAddChildParentId(null);
                    if (kind === 'note') setNoteModal({ parentId });
                    else if (kind === 'action') setActionModal({ parentId });
                }}
            />

            <ProceduralNoteFormModal
                caseId={caseId}
                open={noteModal !== null}
                placement={notePlacement}
                initial={noteModal?.note ?? null}
                onClose={() => setNoteModal(null)}
                onSubmit={(payload) => {
                    if (!noteModal) return;
                    if (noteModal.note?.id) {
                        updateSubItem(caseId, noteModal.parentId, noteModal.note.id, payload);
                    } else {
                        addSubItem(caseId, noteModal.parentId, {
                            type: 'note',
                            id: createProceduralId(),
                            title: payload.title,
                            body: payload.body,
                            link: payload.link,
                            contextNote: payload.contextNote,
                            tags: payload.tags,
                            isStarred: payload.isStarred,
                        });
                    }
                    setNoteModal(null);
                }}
            />

            <ProceduralActionFormModal
                caseId={caseId}
                open={actionModal !== null}
                placement={actionPlacement}
                initial={actionModal?.action ?? null}
                onClose={() => setActionModal(null)}
                onSubmit={(payload) => {
                    if (!actionModal) return;
                    if (actionModal.action?.id) {
                        updateSubItem(caseId, actionModal.parentId, actionModal.action.id, payload);
                    } else {
                        addSubItem(caseId, actionModal.parentId, {
                            type: 'action',
                            id: createProceduralId(),
                            title: payload.title,
                            date: payload.date,
                            status: payload.status,
                            followUpDate: payload.followUpDate,
                            tags: payload.tags,
                            isStarred: payload.isStarred,
                            link: payload.link,
                            contextNote: payload.contextNote,
                        });
                    }
                    setActionModal(null);
                }}
            />

            <ProceduralAdvancePhaseModal
                open={advanceModal !== null}
                actionTitle={advanceModal?.actionTitle ?? ''}
                onClose={() => setAdvanceModal(null)}
                onSubmit={(payload) => {
                    if (!advanceModal) return;
                    advanceAction(caseId, advanceModal.parentId, advanceModal.actionId, {
                        spawnChildTitle: payload.spawnChildTitle,
                    });
                    setAdvanceModal(null);
                }}
            />

            {confirmDeleteId ? (
                <div
                    className="fixed inset-0 z-[223] bg-black/80 p-4 flex items-center justify-center"
                    dir="rtl"
                >
                    <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-3">
                        <div className="text-white font-black text-sm">نقل مسار التتبع للسلة؟</div>
                        <p className="text-white/70 text-xs font-bold">
                            سيتم إخفاء المسار بكل مراحله وإجراءاته — يمكن استرجاعه من سلة المهملات.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/75"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    deleteContainer(caseId, confirmDeleteId);
                                    setConfirmDeleteId(null);
                                }}
                                className="rounded-xl bg-red-600/80 px-4 py-2 text-sm font-black text-white"
                            >
                                نقل للسلة
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
