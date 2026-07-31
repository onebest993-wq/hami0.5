import React from 'react';
import {
    formatProceduralNumberChain,
    isFollowUpDueOrOverdue,
    type ProceduralParentNumber,
} from '../../proceduralContainersEngine';
import { type ProceduralItemLink } from '../../proceduralItemLink';
import type { StructuralTone } from './types';

export const ProceduralContextLine = ({
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

/** رقم مرجعي واضح — منفصل عن أيقونة/إيموجي لتجنب التداخل البصري */
export const StructuralIndexPill = ({ chain, tone }: { chain: ProceduralParentNumber; tone: StructuralTone }) => {
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

export const RootKindBadge = () => (
    <span className="shrink-0 rounded-md border border-sky-400/45 bg-sky-500/12 px-2 py-0.5 text-[10px] font-black text-sky-100">
        مسار مستقل
    </span>
);

/** طي/توسيع لكل مسار على حدة (جذر · أساسي · فرعي) */
export const PathFoldToggle = ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => (
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

export const BranchKindBadge = ({ role }: { role: 'primary' | 'sub' }) =>
    role === 'primary' ? (
        <span className="shrink-0 rounded-md border border-[#E6C673]/60 bg-[#E6C673]/14 px-2 py-0.5 text-[10px] font-black text-[#E6C673]">
            ◆ فرع أساسي
        </span>
    ) : (
        <span className="shrink-0 rounded-md border border-dashed border-slate-500/60 bg-slate-900/70 px-2 py-0.5 text-[10px] font-black text-white/60">
            ◇ فرع فرعي
        </span>
    );

export const buildStructuralLaneCaption = (input: {
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

export const containerSurfaceClass = (depth: number, isPrimaryBranch = false) => {
    if (depth === 0) return shellClassAt(CONTAINER_SHELL_CLASS, 0);
    if (depth === 1 && isPrimaryBranch) return shellClassAt(CONTAINER_SHELL_CLASS, 1);
    return shellClassAt(CONTAINER_SHELL_CLASS, Math.min(depth + 1, CONTAINER_SHELL_CLASS.length - 1));
};

export const itemSurfaceClass = (depth: number) => shellClassAt(ITEM_SHELL_CLASS, depth + 1);

export const SubItemsAriadneThread = ({ children, depth = 0 }: { children: React.ReactNode; depth?: number }) => (
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

export const SubItemThreadNode = ({
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
export const ActionFollowUpBadge = ({ followUpDate }: { followUpDate: string }) => {
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

export const withStarredBorder = (base: string, starred: boolean) => (starred ? `${base} ${STARRED_CARD}` : base);

export const TacticalTagPills = ({ tags }: { tags?: string[] }) => {
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

export const StarToggle = ({
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

export const InPathStepConnector = () => (
    <div className="flex items-center gap-2 py-1 pe-2" aria-hidden>
        <div className="w-px h-4 bg-[#E6C673]/35 ms-3" />
        <span className="text-[#E6C673]/50 text-[10px] font-black">↓</span>
    </div>
);

export const RowMenu = ({
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
