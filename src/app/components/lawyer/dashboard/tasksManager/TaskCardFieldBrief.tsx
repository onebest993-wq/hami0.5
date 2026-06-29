import React from 'react';
import { CheckCircle2, ClipboardList, GitBranch, MapPinned } from 'lucide-react';
import type { LegalSubTask } from '@/app/types/TaskEngine';

export type TaskCardFieldBriefProps = {
    title: string;
    fieldLocation: string;
    fieldActions: LegalSubTask[];
    fieldPrimaryAction: string | null;
    hasFieldDetails: boolean;
    readOnly: boolean;
    onToggleSubComplete: (subId: string) => void;
};

export function TaskCardFieldBrief({
    title,
    fieldLocation,
    fieldActions,
    fieldPrimaryAction,
    hasFieldDetails,
    readOnly,
    onToggleSubComplete,
}: TaskCardFieldBriefProps) {
    return (
        <div className="rounded-xl border border-[#A67C52]/22 bg-[#0c0c0e]/45 divide-y divide-[#A67C52]/12 overflow-hidden">
            {hasFieldDetails ? (
                <div className="px-3 py-2.5 text-right">
                    <p className="text-[10px] font-extrabold text-[#B8956A]/85 mb-1 flex flex-row-reverse items-center gap-1">
                        <ClipboardList className="size-3 shrink-0 opacity-80" aria-hidden />
                        تفاصيل المهمة
                    </p>
                    <p className="text-sm sm:text-base font-extrabold text-[#E8F5F0] leading-snug break-words">
                        {title}
                    </p>
                </div>
            ) : null}

            <div className="px-3 py-2.5 text-right">
                <p className="text-[10px] font-extrabold text-[#B8956A]/85 mb-1 flex flex-row-reverse items-center gap-1">
                    <MapPinned className="size-3 shrink-0 opacity-80" aria-hidden />
                    المحكمة أو الدائرة
                </p>
                <p className="text-sm font-bold text-[#6BC4A8] leading-snug break-words">{fieldLocation}</p>
            </div>

            {fieldActions.length > 0 || fieldPrimaryAction ? (
                <div className="px-3 py-2.5 text-right">
                    <p className="text-[10px] font-extrabold text-[#B8956A]/85 mb-1.5 flex flex-row-reverse items-center gap-1">
                        <GitBranch className="size-3 shrink-0 opacity-80" aria-hidden />
                        {fieldActions.length > 1 ? 'الإجراءات الميدانية' : 'إجراء ميداني'}
                    </p>
                    {fieldActions.length > 0 ? (
                        <ul className="space-y-1.5">
                            {fieldActions.map((st, idx) => (
                                <li
                                    key={st.id}
                                    className={`flex flex-row-reverse items-start gap-2 rounded-lg border px-2.5 py-1.5 ${
                                        st.isCompleted
                                            ? 'border-[#1A7059]/30 bg-[#1A7059]/8'
                                            : 'border-[#A67C52]/18 bg-[#0c0c0e]/35'
                                    }`}
                                >
                                    <span className="text-[10px] font-bold text-[#A67C52]/55 tabular-nums shrink-0 pt-0.5">
                                        {idx + 1}.
                                    </span>
                                    <span
                                        className={`flex-1 text-sm font-bold leading-snug break-words ${
                                            st.isCompleted
                                                ? 'text-[#6BC4A8]/55 line-through'
                                                : 'text-[#E8F5F0]'
                                        }`}
                                    >
                                        {st.title}
                                    </span>
                                    {!st.isCompleted && !readOnly ? (
                                        <button
                                            type="button"
                                            onClick={() => onToggleSubComplete(st.id)}
                                            className="shrink-0 min-h-[44px] px-3 py-1 rounded-md bg-[#1A7059]/75 hover:bg-[#1A7059] border border-[#1A7059]/45 text-white text-[10px] font-extrabold transition whitespace-nowrap touch-manipulation"
                                        >
                                            تم
                                        </button>
                                    ) : st.isCompleted ? (
                                        <CheckCircle2
                                            className="size-3.5 shrink-0 text-[#6BC4A8]/75"
                                            aria-hidden
                                        />
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    ) : fieldPrimaryAction ? (
                        <p className="text-sm font-bold text-[#E8F5F0] leading-snug break-words rounded-lg border border-[#A67C52]/18 bg-[#0c0c0e]/35 px-2.5 py-1.5">
                            {fieldPrimaryAction}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
