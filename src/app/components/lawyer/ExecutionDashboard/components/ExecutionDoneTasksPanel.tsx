import React from 'react';
import type { DoneTaskNote } from './executionTasksSection.types';

export type ExecutionDoneTasksPanelProps = {
    doneTasks: DoneTaskNote[];
};

export const ExecutionDoneTasksPanel: React.FC<ExecutionDoneTasksPanelProps> = ({
    doneTasks,
}) => (
    <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-amber-500/15 bg-[#0A0F1C]/30 p-3">
        {doneTasks.length === 0 ? (
            <p className="text-center text-[11px] text-slate-500">لا توجد مهام منجزة بعد.</p>
        ) : (
            doneTasks.map((t) => (
                <div
                    key={t.id}
                    className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] px-2.5 py-2"
                >
                    <p className="text-[11px] font-bold text-amber-50 break-words">{t.title}</p>
                    {t.body ? (
                        <p className="mt-0.5 text-[10px] text-slate-400 whitespace-pre-line break-words">
                            {t.body}
                        </p>
                    ) : null}
                </div>
            ))
        )}
    </div>
);
