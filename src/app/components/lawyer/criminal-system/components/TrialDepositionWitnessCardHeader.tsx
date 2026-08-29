import React from 'react';

function CardHeaderNameRow({
    giverType,
    witnessName,
    date,
    roleLabel,
    roleStyle,
}: {
    giverType: string;
    witnessName: string;
    date: string;
    roleLabel: string;
    roleStyle: string;
}) {
    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className={
                        giverType === 'witness'
                            ? 'text-violet-200 font-black text-base whitespace-normal break-words'
                            : 'text-white font-black text-sm whitespace-normal break-words'
                    }
                >
                    {witnessName}
                </span>
                <span className="text-white/45 text-xs font-bold" dir="ltr">
                    {date}
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-black whitespace-normal break-words ${roleStyle}`}
                >
                    {roleLabel}
                </span>
                <span className="rounded-full border border-[#E6C673]/35 bg-[#E6C673]/10 px-2.5 py-1 text-[10px] font-black text-[#E6C673]/90">
                    محكمة الموضوع
                </span>
            </div>
        </>
    );
}

export type TrialDepositionWitnessCardHeaderProps = {
    giverType: string;
    witnessName: string;
    date: string;
    roleLabel: string;
    roleStyle: string;
    witnessDetails?: string;
    readOnly?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
};

export function TrialDepositionWitnessCardHeader({
    giverType,
    witnessName,
    date,
    roleLabel,
    roleStyle,
    witnessDetails,
    readOnly,
    onEdit,
    onDelete,
}: TrialDepositionWitnessCardHeaderProps) {
    return (
        <>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                    <CardHeaderNameRow
                        giverType={giverType}
                        witnessName={witnessName}
                        date={date}
                        roleLabel={roleLabel}
                        roleStyle={roleStyle}
                    />
                </div>
                {!readOnly ? (
                    <div className="flex flex-wrap gap-2 shrink-0">
                        {onEdit ? (
                            <button
                                type="button"
                                onClick={onEdit}
                                className="rounded-lg border border-slate-600/60 px-2.5 py-1 text-[10px] font-black text-white/70 hover:text-[#E6C673]"
                            >
                                تعديل
                            </button>
                        ) : null}
                        {onDelete ? (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="rounded-lg border border-red-500/35 px-2.5 py-1 text-[10px] font-black text-red-300/80 hover:bg-red-950/30"
                            >
                                حذف
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {giverType === 'witness' && witnessDetails?.trim() ? (
                <div className="text-violet-200/90 text-xs font-bold whitespace-normal break-words">
                    {witnessDetails.trim()}
                </div>
            ) : null}
        </>
    );
}
