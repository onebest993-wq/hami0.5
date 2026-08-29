import React from 'react';
import type { Statement } from '../criminalStore';
import type { TrialDeposition, TrialDepositionComparison } from '../trialDepositionsEngine';
import {
    linkedEntryContent,
    linkedEntryDate,
    linkedEntryGiverType,
    linkedEntryHighlights,
    linkedEntryPersonName,
    phaseLabelForEntry,
    resolveComparisonLinkedEntry,
    resolveComparisonTrialExcerpt,
    type LinkableStatementEntry,
} from '../statementLinking';
import { statementGiverRoleLabel, statementGiverRoleStyle } from '../statementGiverDisplay';
import { StatementHighlightedContent } from './StatementHighlightedContent';

function StatementReplicaShell({
    isInvestigation,
    children,
}: {
    isInvestigation: boolean;
    children: React.ReactNode;
}) {
    return (
        <div
            className={`rounded-xl border p-3 space-y-2 ${
                isInvestigation
                    ? 'border-slate-700/60 bg-slate-900/50'
                    : 'border-[#E6C673]/35 bg-[#E6C673]/5'
            }`}
        >
            {children}
        </div>
    );
}

export function StatementReplica({
    phase,
    personName,
    date,
    roleLabel,
    roleStyle,
    content,
    highlights,
    compact,
    isInvestigation,
}: {
    phase: string;
    personName: string;
    date: string;
    roleLabel: string;
    roleStyle: string;
    content: string;
    highlights?: Statement['contentHighlights'];
    compact?: boolean;
    isInvestigation: boolean;
}) {
    return (
        <StatementReplicaShell isInvestigation={isInvestigation}>
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-black ${
                        isInvestigation
                            ? 'border-slate-600/50 bg-slate-800/80 text-white/65'
                            : 'border-[#E6C673]/40 bg-[#E6C673]/10 text-[#E6C673]'
                    }`}
                >
                    [{phase}]
                </span>
                <span className="text-white/90 text-xs font-black whitespace-normal break-words">{personName}</span>
                <span className="text-white/45 text-[10px] font-bold" dir="ltr">
                    {date}
                </span>
                <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-black whitespace-normal break-words ${roleStyle}`}
                >
                    {roleLabel}
                </span>
            </div>
            <div
                className={`text-white/85 whitespace-pre-wrap break-words leading-relaxed ${
                    compact ? 'text-xs line-clamp-4' : 'text-sm'
                }`}
            >
                {highlights?.length ? (
                    <StatementHighlightedContent content={content} highlights={highlights} />
                ) : (
                    content
                )}
            </div>
        </StatementReplicaShell>
    );
}

export function LinkedStatementReplica({
    entry,
    compact,
}: {
    entry: LinkableStatementEntry;
    compact?: boolean;
}) {
    const giverType = linkedEntryGiverType(entry);
    return (
        <StatementReplica
            phase={phaseLabelForEntry(entry)}
            personName={linkedEntryPersonName(entry)}
            date={linkedEntryDate(entry)}
            roleLabel={statementGiverRoleLabel(giverType)}
            roleStyle={statementGiverRoleStyle(giverType)}
            content={linkedEntryContent(entry)}
            highlights={linkedEntryHighlights(entry)}
            compact={compact}
            isInvestigation={entry.phase === 'investigation'}
        />
    );
}

function CurrentDepositionColumn({
    deposition,
    excerpt,
}: {
    deposition: TrialDeposition;
    excerpt: string;
}) {
    const giverType = deposition.giverType ?? 'witness';
    const showHighlights = excerpt === deposition.content;
    return (
        <StatementReplica
            phase="محكمة الموضوع — الإفادة الحالية"
            personName={deposition.witnessName}
            date={deposition.date}
            roleLabel={statementGiverRoleLabel(giverType)}
            roleStyle={statementGiverRoleStyle(giverType)}
            content={excerpt}
            highlights={showHighlights ? deposition.contentHighlights : undefined}
            isInvestigation={false}
        />
    );
}

function MissingLinkNotice() {
    return (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-red-200/80 text-xs font-bold">
            الإفادة المربوطة غير موجودة (حُذفت أو نُقلت)
        </div>
    );
}

export function SavedComparisonBlock({
    deposition,
    row,
    linkableEntries,
    readOnly,
    onRemove,
}: {
    deposition: TrialDeposition;
    row: TrialDepositionComparison;
    linkableEntries: LinkableStatementEntry[];
    readOnly?: boolean;
    onRemove: () => void;
}) {
    const linked = resolveComparisonLinkedEntry(row, linkableEntries);
    const trialSide = resolveComparisonTrialExcerpt(deposition, row);

    return (
        <div className="rounded-xl border border-orange-500/40 bg-slate-950/50 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-orange-200/90 text-[11px] font-black">⚖️ مقارنة مربوطة — المادة 178</span>
                {!readOnly ? (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="mr-auto rounded-md border border-red-500/35 px-2 py-0.5 text-[10px] font-black text-red-300/80 hover:bg-red-950/30"
                    >
                        إلغاء الربط
                    </button>
                ) : null}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CurrentDepositionColumn deposition={deposition} excerpt={trialSide} />
                {linked ? (
                    <LinkedStatementReplica entry={linked} />
                ) : row.investigationText ? (
                    <StatementReplica
                        phase="التحقيق — أرشيف قديم"
                        personName="—"
                        date="—"
                        roleLabel="—"
                        roleStyle="border-slate-600/50 text-white/55"
                        content={row.investigationText}
                        isInvestigation
                    />
                ) : (
                    <MissingLinkNotice />
                )}
            </div>
        </div>
    );
}
