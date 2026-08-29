import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';

export function EncroachmentApprovedDetailsCollapsible(props: {
    title: string;
    row: Record<string, unknown>;
    open: boolean;
    onToggle: () => void;
    saved: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="mt-2 rounded-2xl border border-emerald-500/25 bg-emerald-950/15 overflow-hidden" dir="rtl">
            <button
                type="button"
                onClick={props.onToggle}
                className="w-full flex flex-row-reverse items-center justify-between gap-2 px-3 py-2.5 text-right hover:bg-white/[0.03] transition-colors"
            >
                <span className="text-[11px] font-bold text-emerald-200">{props.title}</span>
                <ChevronDown
                    size={14}
                    className={`shrink-0 text-slate-400 transition-transform ${props.open ? 'rotate-180' : ''}`}
                />
            </button>
            {props.open ? (
                <div className="overflow-hidden">
                    <div className="border-t border-emerald-500/20 px-3 py-3 space-y-2.5">
                        {props.saved ? (
                            <p className="text-[11px] text-emerald-100/85 leading-relaxed whitespace-pre-wrap">
                                {String(props.row.body || '').trim()}
                            </p>
                        ) : (
                            props.children
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
