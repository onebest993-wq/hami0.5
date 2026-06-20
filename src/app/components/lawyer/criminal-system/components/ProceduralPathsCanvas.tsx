// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { useCriminalStore } from '../criminalStore';
import type { ProceduralPath, ProceduralPathStep } from '../proceduralPathsEngine';
import { proceduralStepStatusLabel, sortPathStepsChronologically } from '../proceduralPathsEngine';
import { ProceduralPathFormModal } from './modals/ProceduralPathFormModal';
import { ProceduralStepFormModal } from './modals/ProceduralStepFormModal';

export type ProceduralPathsCanvasProps = {
    caseId: string;
    readOnly?: boolean;
};

type PathModalMode = { kind: 'create' } | { kind: 'edit'; pathId: string } | null;
type StepModalMode = { pathId: string; step?: ProceduralPathStep } | null;

const StepRow = ({
    step,
    pathColor,
    readOnly,
    onEdit,
    onDelete,
}: {
    step: ProceduralPathStep;
    pathColor: string;
    readOnly?: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) => {
    const done = step.status === 'done';
    const postponed = step.status === 'postponed';
    return (
        <li
            className={`rounded-xl border px-3 py-2 flex flex-wrap items-start justify-between gap-2 ${
                done
                    ? 'border-slate-600/40 bg-slate-900/30 opacity-65'
                    : postponed
                      ? 'border-amber-500/30 bg-amber-950/20'
                      : 'border-slate-600/50 bg-slate-900/50'
            }`}
        >
            <div className="min-w-0 flex-1">
                <div
                    className={`text-sm font-bold text-white whitespace-normal break-words ${
                        done ? 'line-through decoration-slate-400' : ''
                    }`}
                >
                    {step.title}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-black">
                    <span className="text-white/50" dir="ltr">
                        {step.date}
                    </span>
                    <span
                        className="rounded-full px-2 py-0.5"
                        style={{
                            backgroundColor: `${pathColor}22`,
                            color: pathColor,
                            border: `1px solid ${pathColor}55`,
                        }}
                    >
                        {proceduralStepStatusLabel(step.status)}
                    </span>
                </div>
            </div>
            {!readOnly ? (
                <div className="flex gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="rounded-md border border-slate-600/60 px-2 py-1 text-[10px] font-black text-white/70 hover:text-white"
                    >
                        تعديل
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="rounded-md border border-red-500/30 px-2 py-1 text-[10px] font-black text-red-300/80 hover:text-red-200"
                    >
                        حذف
                    </button>
                </div>
            ) : null}
        </li>
    );
};

const PathCard = ({
    path,
    readOnly,
    isDragging,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    onEditPath,
    onDeletePath,
    onAddStep,
    onEditStep,
    onDeleteStep,
}: {
    path: ProceduralPath;
    readOnly?: boolean;
    isDragging: boolean;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onEditPath: () => void;
    onDeletePath: () => void;
    onAddStep: () => void;
    onEditStep: (step: ProceduralPathStep) => void;
    onDeleteStep: (stepId: string) => void;
}) => {
    const steps = useMemo(() => sortPathStepsChronologically(path.items), [path.items]);

    return (
        <div
            draggable={!readOnly}
            onDragStart={(e) => {
                if (readOnly) return;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/procedural-path-id', path.id);
                onDragStart();
            }}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={`rounded-2xl border-2 bg-slate-800/35 p-4 flex flex-col gap-3 min-h-[12rem] transition ${
                isDragging ? 'opacity-50 scale-[0.98]' : 'opacity-100'
            } ${readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
            style={{ borderColor: `${path.color}88`, boxShadow: `0 0 0 1px ${path.color}22 inset` }}
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <div
                        className="text-base font-black text-white whitespace-normal break-words"
                        style={{ color: path.color }}
                    >
                        {path.name}
                    </div>
                    <div className="text-[10px] font-bold text-white/40 mt-0.5">
                        {steps.length} خطوة — اسحب الحاوية لإعادة الترتيب
                    </div>
                </div>
                {!readOnly ? (
                    <div className="flex flex-wrap gap-1">
                        <button
                            type="button"
                            onClick={onEditPath}
                            className="rounded-lg border border-slate-600/60 px-2 py-1 text-[10px] font-black text-white/75 hover:bg-slate-700/50"
                        >
                            تعديل الاسم/اللون
                        </button>
                        <button
                            type="button"
                            onClick={onDeletePath}
                            className="rounded-lg border border-red-500/35 px-2 py-1 text-[10px] font-black text-red-300/90 hover:bg-red-950/30"
                        >
                            حذف الحاوية
                        </button>
                    </div>
                ) : null}
            </div>

            {steps.length === 0 ? (
                <div className="flex-1 rounded-xl border border-dashed border-slate-600/50 px-3 py-6 text-center text-white/45 text-xs font-bold">
                    لا توجد خطوات بعد.
                </div>
            ) : (
                <ul className="space-y-2 flex-1">
                    {steps.map((step) => (
                        <StepRow
                            key={step.id}
                            step={step}
                            pathColor={path.color}
                            readOnly={readOnly}
                            onEdit={() => onEditStep(step)}
                            onDelete={() => onDeleteStep(step.id)}
                        />
                    ))}
                </ul>
            )}

            {!readOnly ? (
                <button
                    type="button"
                    onClick={onAddStep}
                    className="w-full rounded-xl border border-dashed py-2 text-xs font-black transition hover:bg-slate-800/50"
                    style={{ borderColor: `${path.color}66`, color: path.color }}
                >
                    + إضافة خطوة جديدة
                </button>
            ) : null}
        </div>
    );
};

export const ProceduralPathsCanvas = ({ caseId, readOnly = false }: ProceduralPathsCanvasProps) => {
    const paths = useCriminalStore((s) => {
        const c = s.casesById[caseId];
        return Array.isArray(c?.proceduralPaths) ? c.proceduralPaths : [];
    });
    const addProceduralPath = useCriminalStore((s) => s.addProceduralPath);
    const updateProceduralPath = useCriminalStore((s) => s.updateProceduralPath);
    const deleteProceduralPath = useCriminalStore((s) => s.deleteProceduralPath);
    const reorderProceduralPaths = useCriminalStore((s) => s.reorderProceduralPaths);
    const upsertProceduralPathStep = useCriminalStore((s) => s.upsertProceduralPathStep);
    const deleteProceduralPathStep = useCriminalStore((s) => s.deleteProceduralPathStep);

    const [pathModal, setPathModal] = useState<PathModalMode>(null);
    const [stepModal, setStepModal] = useState<StepModalMode>(null);
    const [dragPathId, setDragPathId] = useState<string | null>(null);
    const [confirmDeletePathId, setConfirmDeletePathId] = useState<string | null>(null);

    const editingPath = pathModal?.kind === 'edit' ? paths.find((p) => p.id === pathModal.pathId) : null;

    const handlePathDrop = (targetId: string) => (e: React.DragEvent) => {
        e.preventDefault();
        const fromId = e.dataTransfer.getData('text/procedural-path-id');
        if (!fromId || fromId === targetId) return;
        reorderProceduralPaths(caseId, fromId, targetId);
        setDragPathId(null);
    };

    return (
        <div className="flex flex-col p-6 max-w-6xl mx-auto w-full gap-6 print:text-black" dir="rtl">
            <div>
                <div className="text-white/80 font-black text-sm">لوحة مسارات التتبع الحرة</div>
                <p className="text-white/45 text-[11px] font-bold mt-1">
                    ابنِ مساراتك الإجرائية يدوياً — بلا تصنيفات جامدة أو اقتراحات تلقائية.
                </p>
            </div>

            {!readOnly ? (
                <button
                    type="button"
                    onClick={() => setPathModal({ kind: 'create' })}
                    className="w-full rounded-2xl bg-[#E6C673] text-[#0B1021] py-3.5 text-sm font-black hover:brightness-110 transition print:hidden"
                >
                    ➕ إنشاء مسار تتبع جديد
                </button>
            ) : null}

            {paths.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-600/60 px-6 py-14 text-center">
                    <div className="text-white/55 text-sm font-bold whitespace-normal break-words">
                        لا توجد مسارات بعد. ابدأ بإنشاء مسار تتبع جديد.
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paths.map((path) => (
                        <PathCard
                            key={path.id}
                            path={path}
                            readOnly={readOnly}
                            isDragging={dragPathId === path.id}
                            onDragStart={() => setDragPathId(path.id)}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={handlePathDrop(path.id)}
                            onDragEnd={() => setDragPathId(null)}
                            onEditPath={() => setPathModal({ kind: 'edit', pathId: path.id })}
                            onDeletePath={() => setConfirmDeletePathId(path.id)}
                            onAddStep={() => setStepModal({ pathId: path.id })}
                            onEditStep={(step) => setStepModal({ pathId: path.id, step })}
                            onDeleteStep={(stepId) => deleteProceduralPathStep(caseId, path.id, stepId)}
                        />
                    ))}
                </div>
            )}

            <ProceduralPathFormModal
                open={pathModal !== null}
                title={pathModal?.kind === 'edit' ? 'تعديل المسار' : 'مسار تتبع جديد'}
                initial={
                    pathModal?.kind === 'edit' && editingPath
                        ? { name: editingPath.name, color: editingPath.color }
                        : undefined
                }
                onClose={() => setPathModal(null)}
                onSubmit={(payload) => {
                    if (pathModal?.kind === 'edit') {
                        updateProceduralPath(caseId, pathModal.pathId, payload);
                    } else {
                        addProceduralPath(caseId, payload);
                    }
                    setPathModal(null);
                }}
            />

            <ProceduralStepFormModal
                open={stepModal !== null}
                initial={stepModal?.step ?? null}
                onClose={() => setStepModal(null)}
                onSubmit={(payload) => {
                    if (!stepModal) return;
                    upsertProceduralPathStep(caseId, stepModal.pathId, payload);
                    setStepModal(null);
                }}
            />

            {confirmDeletePathId ? (
                <div className="fixed inset-0 z-[223] bg-black/80 p-4 flex items-center justify-center print:hidden" dir="rtl">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-3">
                        <div className="text-white font-black text-sm">حذف مسار التتبع؟</div>
                        <p className="text-white/70 text-xs font-bold">سيتم حذف المسار وجميع خطواته نهائياً.</p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmDeletePathId(null)}
                                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/75"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    deleteProceduralPath(caseId, confirmDeletePathId);
                                    setConfirmDeletePathId(null);
                                }}
                                className="rounded-xl bg-red-600/80 px-4 py-2 text-sm font-black text-white"
                            >
                                حذف نهائي
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
