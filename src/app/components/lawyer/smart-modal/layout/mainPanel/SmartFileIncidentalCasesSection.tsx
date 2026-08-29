import React, { Suspense, lazy } from 'react';
import { ArrowRightLeft } from '@/app/components/ui/icons/ArrowRightLeft';
import type { CaseStage, IncidentalStatus } from '../../../LawyerShared';

const LazyIncidentalCasesManager = lazy(() =>
    import('../../parts/IncidentalCasesManager').then((m) => ({ default: m.IncidentalCasesManager })),
);

type IncidentalParentLink = {
    parentFileId: number;
    parentCaseNo?: string;
} | null;

type LinkedChildIncidental = {
    id: string;
    type?: string;
    linkedFileId?: number;
    linkedCaseNo?: string;
};

type ConsolidationRef = {
    id: string;
    caseNo: string;
    consolidationDate?: string;
    reason?: string;
};

export type SmartFileIncidentalCasesSectionProps = {
    showFirstInstanceIncidentalUi: boolean;
    incidentalParentLink: IncidentalParentLink;
    linkedChildIncidentalCases: LinkedChildIncidental[];
    externalConsolidationRefs: ConsolidationRef[];
    displayStage: CaseStage;
    interactionLocked: boolean;
    onOpenLinkedFile?: (fileId: number, criminalId?: string) => void;
    handleResolveIncidentalCase: (id: string, status: IncidentalStatus) => void;
};

export function SmartFileIncidentalCasesSection({
    showFirstInstanceIncidentalUi,
    incidentalParentLink,
    linkedChildIncidentalCases,
    externalConsolidationRefs,
    displayStage,
    interactionLocked,
    onOpenLinkedFile,
    handleResolveIncidentalCase,
}: SmartFileIncidentalCasesSectionProps) {
    if (!showFirstInstanceIncidentalUi) return null;

    return (
        <div className="mt-2 space-y-2">
            {incidentalParentLink && onOpenLinkedFile ? (
                <button
                    type="button"
                    onClick={() => onOpenLinkedFile(incidentalParentLink.parentFileId)}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-3 py-2.5 text-right hover:bg-[#E6C673]/12 transition-colors"
                >
                    <ArrowRightLeft size={14} className="text-[#E6C673] shrink-0" />
                    <span className="text-xs font-bold text-[#E6C673]">
                        الانتقال إلى الدعوى الأم ({incidentalParentLink.parentCaseNo || '—'})
                    </span>
                </button>
            ) : null}
            {externalConsolidationRefs.map((ref) => (
                <div
                    key={ref.id}
                    className="rounded-xl border border-dashed border-teal-400/20 bg-teal-400/5 px-3 py-2.5 text-right"
                >
                    <p className="text-[10px] text-teal-300/70 mb-0.5">
                        دعوى موحّدة (مرجع — غير موجودة في المخزن)
                    </p>
                    <p className="text-xs font-bold text-white/80" dir="ltr">
                        {ref.caseNo}
                    </p>
                    {ref.consolidationDate ? (
                        <p className="text-[10px] text-white/40 mt-1">
                            تاريخ التوحيد: {ref.consolidationDate}
                        </p>
                    ) : null}
                    {ref.reason ? (
                        <p className="text-[10px] text-white/50 mt-0.5">{ref.reason}</p>
                    ) : null}
                </div>
            ))}
            {linkedChildIncidentalCases.length > 0 && onOpenLinkedFile
                ? linkedChildIncidentalCases.map((linkedCase) => (
                      <button
                          key={linkedCase.id}
                          type="button"
                          onClick={() => onOpenLinkedFile(linkedCase.linkedFileId!)}
                          className="w-full flex items-center justify-between gap-2 rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-3 py-2.5 text-right hover:bg-[#E6C673]/12 transition-colors"
                      >
                          <ArrowRightLeft size={14} className="text-[#E6C673] shrink-0" />
                          <span className="text-xs font-bold text-[#E6C673]">
                              {linkedCase.type === 'joined'
                                  ? 'الانتقال إلى الدعوى المنضمة'
                                  : 'الانتقال إلى الدعوى المتقابلة'}{' '}
                              ({linkedCase.linkedCaseNo || '—'})
                          </span>
                      </button>
                  ))
                : null}
            <Suspense fallback={null}>
                <LazyIncidentalCasesManager
                    cases={displayStage?.incidentalCases || []}
                    onResolve={!interactionLocked ? handleResolveIncidentalCase : undefined}
                    onOpenLinkedFile={onOpenLinkedFile}
                />
            </Suspense>
        </div>
    );
}
