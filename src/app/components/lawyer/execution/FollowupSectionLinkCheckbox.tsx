import React from 'react';

/** خيار اختياري لربط إجراء محضر المتابعة بقسم المواعيد أو المهام */
export function FollowupSectionLinkCheckbox(props: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    hint?: string;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-right">
            <input
                type="checkbox"
                checked={props.checked}
                onChange={(e) => props.onChange(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-amber-500"
            />
            <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold text-slate-200">{props.label}</span>
                {props.hint ? (
                    <span className="mt-0.5 block text-[10px] text-slate-500 leading-relaxed">{props.hint}</span>
                ) : null}
            </span>
        </label>
    );
}
