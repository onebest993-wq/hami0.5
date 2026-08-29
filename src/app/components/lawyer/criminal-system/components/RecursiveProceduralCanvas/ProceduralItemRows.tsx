import React from 'react';
import {
    actionStatusLabel,
    type ProceduralActionItem,
    type ProceduralNoteItem,
    type ProceduralParentNumber,
} from '../../proceduralContainersEngine';
import { type ProceduralItemLink } from '../../proceduralItemLink';
import { DRAG_MIME } from './dragUtils';
import {
    ActionFollowUpBadge,
    ProceduralContextLine,
    RowMenu,
    StarToggle,
    StructuralIndexPill,
    TacticalTagPills,
    itemSurfaceClass,
    withStarredBorder,
} from './primitives';

export const NoteRow = ({
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
            } ${focusPulse ? 'ring-2 ring-[#E6C673]/75 motion-safe:animate-pulse' : ''}`,
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

export const ActionRow = ({
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
                        ? 'ring-2 ring-[#E6C673]/75 motion-safe:animate-pulse'
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
