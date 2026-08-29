import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Statement } from '../criminalStore';
import type {
    TrialDeposition,
    TrialDepositionComparison,
    TrialDepositionCrossExam,
    UpdateTrialDepositionPatch,
} from '../trialDepositionsEngine';
import { createTrialDepositionId } from '../trialDepositionsEngine';
import {
    buildLinkableStatementEntries,
    linkedEntryPersonName,
    type LinkableStatementEntry,
} from '../statementLinking';
import {
    statementGiverRoleLabel,
    statementGiverRoleStyle,
    trialDepositionCardShellClass,
} from '../statementGiverDisplay';
import { TrialDepositionWitnessCardHeader } from './TrialDepositionWitnessCardHeader';
import {
    TrialDepositionWitnessCardContent,
    type TrialDepositionFloatBtnState,
} from './TrialDepositionWitnessCardContent';
import {
    TrialDepositionWitnessCardLinkPicker,
    type TrialDepositionLinkPickerState,
} from './TrialDepositionWitnessCardLinkPicker';
import { SavedComparisonBlock } from './TrialDepositionWitnessCardReplicas';
import { TrialDepositionWitnessCardCrossExam } from './TrialDepositionWitnessCardCrossExam';

export type TrialDepositionWitnessCardProps = {
    deposition: TrialDeposition;
    investigationStatements?: Statement[];
    trialStatements?: Statement[];
    allTrialDepositions?: TrialDeposition[];
    readOnly?: boolean;
    onUpdate: (patch: UpdateTrialDepositionPatch) => void;
    onEdit?: () => void;
    onDelete?: () => void;
};

export const TrialDepositionWitnessCard = ({
    deposition,
    investigationStatements = [],
    trialStatements = [],
    allTrialDepositions = [],
    readOnly,
    onUpdate,
    onEdit,
    onDelete,
}: TrialDepositionWitnessCardProps) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [floatBtn, setFloatBtn] = useState<TrialDepositionFloatBtnState | null>(null);
    const [linkPicker, setLinkPicker] = useState<TrialDepositionLinkPickerState | null>(null);
    const [newQuestion, setNewQuestion] = useState('');
    const [crossOpen, setCrossOpen] = useState(true);

    const comparisons = deposition.comparisons ?? [];
    const crossExam = deposition.crossExamination ?? [];
    const giverType = deposition.giverType ?? 'witness';
    const roleLabel = statementGiverRoleLabel(giverType);
    const roleStyle = statementGiverRoleStyle(giverType);

    const linkableEntries = useMemo(
        () =>
            buildLinkableStatementEntries({
                investigationStatements,
                trialStatements,
                trialDepositions: allTrialDepositions,
                excludeDepositionId: deposition.id,
            }),
        [allTrialDepositions, deposition.id, investigationStatements, trialStatements],
    );

    const linkedIds = useMemo(
        () =>
            new Set(
                comparisons
                    .filter((c) => c.linkedKind && c.linkedId)
                    .map((c) => `${c.linkedKind}:${c.linkedId}`),
            ),
        [comparisons],
    );

    const dismissFloat = useCallback(() => setFloatBtn(null), []);

    useEffect(() => {
        if (readOnly) return;
        const onDocMouseDown = (e: MouseEvent) => {
            const target = e.target as Node | null;
            if (!floatBtn || !target) return;
            const btn = document.getElementById(`td-compare-float-${deposition.id}`);
            if (btn?.contains(target)) return;
            if (contentRef.current?.contains(target)) return;
            dismissFloat();
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [deposition.id, dismissFloat, floatBtn, readOnly]);

    const handleContentMouseUp = () => {
        if (readOnly) return;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !contentRef.current) {
            setFloatBtn(null);
            return;
        }
        const anchor = sel.anchorNode;
        const focus = sel.focusNode;
        if (
            !anchor ||
            !focus ||
            !contentRef.current.contains(anchor) ||
            !contentRef.current.contains(focus)
        ) {
            setFloatBtn(null);
            return;
        }
        const text = sel.toString().trim();
        if (!text) {
            setFloatBtn(null);
            return;
        }
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setFloatBtn({
            top: Math.max(8, rect.top - 40),
            left: rect.left + rect.width / 2,
            text,
        });
    };

    const openLinkPicker = (trialExcerpt?: string) => {
        setLinkPicker({ trialExcerpt: trialExcerpt?.trim() || undefined });
        setFloatBtn(null);
        window.getSelection()?.removeAllRanges();
    };

    const saveLink = (entry: LinkableStatementEntry) => {
        const linkedKind = entry.kind === 'statement' ? 'statement' : 'trial_deposition';
        const linkedId = entry.record.id;
        const key = `${linkedKind}:${linkedId}`;
        if (linkedIds.has(key) && !linkPicker?.trialExcerpt) {
            setLinkPicker(null);
            return;
        }
        const next: TrialDepositionComparison = {
            id: createTrialDepositionId(),
            trialExcerpt: linkPicker?.trialExcerpt,
            linkedKind,
            linkedId,
        };
        onUpdate({ comparisons: [...comparisons, next] });
        setLinkPicker(null);
    };

    const removeComparison = (comparisonId: string) => {
        onUpdate({ comparisons: comparisons.filter((c) => c.id !== comparisonId) });
    };

    const patchCrossExam = (questionId: string, patch: Partial<TrialDepositionCrossExam>) => {
        const next = crossExam.map((q) => (q.id === questionId ? { ...q, ...patch } : q));
        onUpdate({ crossExamination: next });
    };

    const addCrossQuestion = () => {
        const q = newQuestion.trim();
        if (!q) return;
        onUpdate({
            crossExamination: [
                ...crossExam,
                { id: createTrialDepositionId(), question: q, isAsked: false },
            ],
        });
        setNewQuestion('');
    };

    const removeCrossQuestion = (questionId: string) => {
        onUpdate({ crossExamination: crossExam.filter((q) => q.id !== questionId) });
    };

    const pickerEntries = useMemo(() => {
        const name = deposition.witnessName.trim().toLowerCase();
        const same = name
            ? linkableEntries.filter((e) => linkedEntryPersonName(e).toLowerCase() === name)
            : [];
        const sameIds = new Set(same.map((e) => `${e.kind}:${e.record.id}`));
        const rest = linkableEntries.filter((e) => !sameIds.has(`${e.kind}:${e.record.id}`));
        return [...same, ...rest];
    }, [deposition.witnessName, linkableEntries]);

    const showCrossExam = giverType === 'witness' || giverType === 'defendant';
    const crossExamTitle =
        giverType === 'defendant' ? '🎯 استجواب المشكو منه' : '🎯 خطة استجواب ومناقشة الشاهد';
    const liveResponsePlaceholder =
        giverType === 'defendant' ? 'الإجابة الحية للمشكو منه...' : 'الإجابة الحية للشاهد...';

    return (
        <div className={trialDepositionCardShellClass(giverType)}>
            <TrialDepositionWitnessCardHeader
                giverType={giverType}
                witnessName={deposition.witnessName}
                date={deposition.date}
                roleLabel={roleLabel}
                roleStyle={roleStyle}
                witnessDetails={deposition.witnessDetails}
                readOnly={readOnly}
                onEdit={onEdit}
                onDelete={onDelete}
            />

            <TrialDepositionWitnessCardContent
                depositionId={deposition.id}
                content={deposition.content}
                contentHighlights={deposition.contentHighlights}
                contentRef={contentRef}
                floatBtn={floatBtn}
                readOnly={readOnly}
                onContentMouseUp={handleContentMouseUp}
                onOpenLinkPicker={openLinkPicker}
                showLinkButton={linkableEntries.length > 0}
            />

            {linkPicker && !readOnly ? (
                <TrialDepositionWitnessCardLinkPicker
                    linkPicker={linkPicker}
                    pickerEntries={pickerEntries}
                    linkedIds={linkedIds}
                    onSaveLink={saveLink}
                    onCancel={() => setLinkPicker(null)}
                />
            ) : null}

            {comparisons.length > 0 ? (
                <div className="space-y-3">
                    {comparisons.map((row) => (
                        <SavedComparisonBlock
                            key={row.id}
                            deposition={deposition}
                            row={row}
                            linkableEntries={linkableEntries}
                            readOnly={readOnly}
                            onRemove={() => removeComparison(row.id)}
                        />
                    ))}
                </div>
            ) : null}

            {showCrossExam ? (
                <TrialDepositionWitnessCardCrossExam
                    crossExamTitle={crossExamTitle}
                    crossExam={crossExam}
                    crossOpen={crossOpen}
                    onToggleOpen={setCrossOpen}
                    liveResponsePlaceholder={liveResponsePlaceholder}
                    readOnly={readOnly}
                    newQuestion={newQuestion}
                    onNewQuestionChange={setNewQuestion}
                    onPatchCrossExam={patchCrossExam}
                    onRemoveCrossQuestion={removeCrossQuestion}
                    onAddCrossQuestion={addCrossQuestion}
                />
            ) : null}
        </div>
    );
};
