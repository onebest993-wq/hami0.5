import React, { useMemo, useState } from 'react';
import { useCriminalStore } from './criminalStore';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildCriminalWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import {
    formatInvestigationDepositLocation,
    formatTrialCourtHeaderPrimary,
    hasJuvenileAccused,
    isInvestigationStoredStage,
    resolveCaseStageFromRecord,
    resolveStageListLabel,
} from './criminalStageUtils';

export type CriminalCasesListProps = {
    onClose: () => void;
    onOpenCase: (id: string) => void;
};

type ConfirmState = {
    id: string;
    title: string;
    subtitle: string;
} | null;

function caseReference(c: any): { primary: string; secondary: string } {
    const stage: string = c?.basics?.stage ?? '';
    const isInvestigation = isInvestigationStoredStage(stage);
    if (isInvestigation) {
        const primary = formatInvestigationDepositLocation(c?.location ?? {}) || '—';
        const number =
            String(c?.location?.investigationPapersAt ?? '').trim() === 'مكتب تحقيق قضائي'
                ? String(c?.location?.investigationDossierNumber ?? '').trim()
                : String(c?.location?.baseRegisterNumberAndDate ?? '').trim();
        return { primary, secondary: number || '—' };
    }
    const caseStage = resolveCaseStageFromRecord(c);
    if (caseStage === 'misdemeanor' || caseStage === 'felony') {
        const effectiveCourtName =
            String(c?.location?.courtName ?? '').trim() ||
            String(c?.location?.investigationCourtName ?? '').trim();
        const primary = formatTrialCourtHeaderPrimary(caseStage, {
            courtName: effectiveCourtName,
            courtCaseNumber: c?.courtCaseNumber,
            caseNumber: c?.location?.caseNumber,
        });
        return {
            primary,
            secondary: String(c?.courtCaseNumber ?? c?.location?.caseNumber ?? '').trim() || '—',
        };
    }
    const defs = Array.isArray(c?.defendants) ? c.defendants : [];
    return {
        primary:
            String(c?.location?.courtName ?? '').trim() ||
            resolveStageListLabel(stage, hasJuvenileAccused(defs)) ||
            '—',
        secondary: String(c?.location?.caseNumber ?? '').trim() || '—',
    };
}

function stageBadgeClass(stage: string): string {
    if (isInvestigationStoredStage(stage)) return 'bg-amber-500/15 border-amber-500/30 text-amber-200';
    if (stage === 'محكمة الجنح') return 'bg-blue-500/15 border-blue-500/30 text-blue-200';
    if (stage === 'محكمة الجنايات') return 'bg-red-500/15 border-red-500/30 text-red-200';
    if (stage === 'cassation_court') return 'bg-slate-500/15 border-slate-500/30 text-slate-200';
    return 'bg-white/5 border-white/10 text-white/70';
}

function stageLabel(stage: string, c: any): string {
    const defs = Array.isArray(c?.defendants) ? c.defendants : [];
    return resolveStageListLabel(stage, hasJuvenileAccused(defs));
}

export const CriminalCasesList = ({ onClose, onOpenCase }: CriminalCasesListProps) => {
    const casesById = useCriminalStore((s) => s.casesById);
    const deleteCase = useCriminalStore((s) => s.deleteCase);

    const [confirm, setConfirm] = useState<ConfirmState>(null);
    const [showMergedArchive, setShowMergedArchive] = useState(false);

    const cases = useMemo(() => {
        const list = Object.values(casesById ?? {});
        list.sort((a: any, b: any) => {
            const aTime = typeof a?.createdAt === 'string' ? Date.parse(a.createdAt) : 0;
            const bTime = typeof b?.createdAt === 'string' ? Date.parse(b.createdAt) : 0;
            return bTime - aTime;
        });
        return list.filter((c: any) => {
            const mergedInto = String((c as any)?.mergedIntoCaseId ?? '').trim();
            const archived = Boolean((c as any)?.isArchived);
            const isArchivedAny = archived || Boolean(mergedInto);
            return showMergedArchive ? isArchivedAny : !isArchivedAny;
        });
    }, [casesById, showMergedArchive]);

    return (
        <div
            className="fixed inset-0 z-[215] flex flex-col overflow-hidden bg-[#0F172A] font-['Tajawal']"
            dir="rtl"
        >
            <div className="flex flex-1 min-h-0 w-full flex-col">
                <div className="h-16 border-b border-white/5 bg-[#0B1021] px-4 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors text-sm font-bold"
                    >
                        رجوع
                    </button>
                    <div className="text-white font-black text-sm">خزانة الأضابير الجزائية</div>
                    <div className="min-w-[64px]" />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] scrollbar-hide p-4">
                    <div className="max-w-5xl mx-auto w-full mb-4 flex items-center justify-between gap-3">
                        <div className="text-white/70 text-xs font-black whitespace-normal break-words">
                            {showMergedArchive ? 'عرض: الأضابير المؤرشفة/المدمجة' : 'عرض: الأضابير النشطة'}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowMergedArchive((v) => !v)}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/80 hover:text-white hover:bg-white/10 transition"
                        >
                            {showMergedArchive ? 'العودة للنشطة' : 'الأرشيف/المدمجة'}
                        </button>
                    </div>
                    {cases.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-white/60 font-bold text-sm text-center">
                                لا توجد أضابير جزائية محفوظة حالياً
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {cases.map((c: any) => {
                                const ref = caseReference(c);
                                const stage: string = c?.basics?.stage ?? '';
                                const legalArticle = String(c?.basics?.legalArticle ?? '').trim();
                                const crimeType = c?.basics?.crimeType ?? '';
                                const complainantName = String(c?.complainants?.[0]?.fullName ?? '').trim();
                                const isUnknown = Boolean(c?.unknownDefendant);
                                const defendants = Array.isArray(c?.defendants) ? c.defendants : [];
                                const primaryDefendantName = String(defendants?.[0]?.fullName ?? '').trim();
                                const mergedInto = String((c as any)?.mergedIntoCaseId ?? '').trim();
                                const isArchivedAny = Boolean(c?.isArchived) || Boolean(mergedInto);
                                const mandatoryCassation =
                                    c?.finalDecision?.decisionType === 'conviction' &&
                                    (c?.finalDecision?.punishmentType === 'death' || c?.finalDecision?.punishmentType === 'life') &&
                                    !Boolean(c?.isSentToCassation) &&
                                    !isArchivedAny;
                                const caseNotes = String((c as any)?.notes ?? '').trim();

                                return (
                                    <div
                                        key={String(c.id)}
                                        className="rounded-xl border border-white/10 bg-[#0B1021] overflow-hidden"
                                    >
                                        <div
                                            className={`h-1 w-full ${stageBadgeClass(stage).replace(/text-[^\s]+/g, '').replace(/border-[^\s]+/g, '')} bg-current opacity-80`}
                                            style={{ backgroundColor: isInvestigationStoredStage(stage) ? 'rgb(245 158 11 / 0.55)' : stage === 'محكمة الجنح' ? 'rgb(59 130 246 / 0.55)' : stage === 'محكمة الجنايات' ? 'rgb(239 68 68 / 0.55)' : 'rgb(148 163 184 / 0.35)' }}
                                            aria-hidden
                                        />
                                        <div className="p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="text-white font-medium text-[13px] truncate">{ref.primary}</div>
                                                <div className="text-[#A0AEC0] font-light text-[10px] mt-0.5 truncate">{ref.secondary}</div>
                                                {showMergedArchive && caseNotes ? (
                                                    <div className="text-amber-200/90 font-medium text-[10px] mt-1.5 whitespace-normal break-words">
                                                        {caseNotes}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="shrink-0 flex flex-col items-end gap-1.5">
                                                {(() => {
                                                    const pinPayload = buildCriminalWorkspacePin(c);
                                                    return pinPayload ? (
                                                        <WorkspacePinButton item={pinPayload} />
                                                    ) : null;
                                                })()}
                                                <div
                                                    className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${stageBadgeClass(stage)}`}
                                                >
                                                    {stageLabel(stage, c) || '—'}
                                                </div>
                                                {mandatoryCassation ? (
                                                    <div className="rounded-full border border-red-500/40 bg-red-900/20 px-2 py-0.5 text-[9px] font-medium text-red-200">
                                                        إرسال تمييزي وجوبي
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="mt-2 space-y-1">
                                            <div className="flex items-center justify-between gap-2 py-0.5">
                                                <span className="text-[#A0AEC0] text-[10px] font-light">المادة</span>
                                                <span className="text-white/95 text-[11px] font-medium truncate">
                                                    {legalArticle || crimeType || '—'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 py-0.5">
                                                <div className="h-7 w-7 shrink-0 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-[10px] font-medium text-white/70">
                                                    {(primaryDefendantName || complainantName || '?').slice(0, 1)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[#A0AEC0] text-[10px] font-light">المشتكي</span>
                                                        <span className="text-white/90 text-[11px] font-medium truncate">{complainantName || '—'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2 mt-0.5">
                                                        <span className="text-[#A0AEC0] text-[10px] font-light">المتهم</span>
                                                        {isUnknown ? (
                                                            <span className="text-red-300 font-medium text-[11px]">مجهول</span>
                                                        ) : (
                                                            <span className="text-white/90 text-[11px] font-medium truncate">{primaryDefendantName || '—'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => onOpenCase(String(c.id))}
                                                className="rounded-lg bg-[#E6C673]/90 text-[#0B1021] font-medium py-2 text-xs hover:brightness-110 active:brightness-95 transition"
                                            >
                                                فتح الإضبارة
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setConfirm({
                                                        id: String(c.id),
                                                        title: ref.primary,
                                                        subtitle: ref.secondary,
                                                    })
                                                }
                                                className="rounded-lg border border-red-500/25 bg-red-500/8 text-red-200 font-medium py-2 text-xs hover:bg-red-500/12 transition"
                                            >
                                                حذف
                                            </button>
                                        </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {confirm ? (
                <div className="fixed inset-0 z-[216] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1021] overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <div className="text-white font-black text-sm">تأكيد الحذف</div>
                            <div className="text-white/60 font-bold text-xs mt-1 truncate">
                                {confirm.title} • {confirm.subtitle}
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="text-white/90 font-bold text-sm">
                                هل أنت متأكد من حذف هذه الإضبارة الجزائية بالكامل؟ هذا الإجراء لا يمكن التراجع عنه وسيتم مسح كافة الإفادات والبيانات المرتبطة.
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirm(null)}
                                    className="rounded-xl border border-white/10 bg-white/5 text-white font-black py-2.5 text-sm hover:bg-white/10 transition"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        deleteCase(confirm.id);
                                        unpinWorkspaceItem(confirm.id, 'criminal');
                                        setConfirm(null);
                                    }}
                                    className="rounded-xl bg-red-600 text-white font-black py-2.5 text-sm hover:bg-red-700 transition"
                                >
                                    حذف نهائي
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
