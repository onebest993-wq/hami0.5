import React from 'react';
import { infoPillClass } from './criminalDashboardHeaderChrome';

export type CriminalDashboardHeaderMergedLink = {
    id: string;
    caseNumber: string;
    defendants?: string[];
    primaryLabel?: string;
    detailLabel?: string;
    isResolved?: boolean;
};

export type CriminalDashboardHeaderStatusPillsProps = {
    isUnifiedParentDossier: boolean;
    mergedCaseDisplayLinks: CriminalDashboardHeaderMergedLink[];
    onOpenMergedChildCase?: (caseId: string) => void;
    hasPendingBail: boolean;
    canConfirmPendingBail: boolean;
    onConfirmPendingBail: () => void;
};

/**
 * شارات حالة الترويسة — إضبارة موحدة، روابط الضم، كفالة معلقة.
 * مستخرَج حرفياً من CriminalDashboardHeader (صفر تغيير بصري).
 */
export function CriminalDashboardHeaderStatusPills({
    isUnifiedParentDossier,
    mergedCaseDisplayLinks,
    onOpenMergedChildCase,
    hasPendingBail,
    canConfirmPendingBail,
    onConfirmPendingBail,
}: CriminalDashboardHeaderStatusPillsProps) {
    return (
        <div className="flex flex-wrap gap-2 items-center">
            {isUnifiedParentDossier ? (
                <span className={infoPillClass} title="إضبارة موحدة">
                    📂 إضبارة موحدة (جامعة)
                </span>
            ) : null}
            {mergedCaseDisplayLinks.map((link) => {
                /**
                 * نص الشارة المعروض: يَستعمل عند توفّره `primaryLabel`
                 * (الذي يَتسامح مع غياب رقم الإضبارة بعرض أسماء المتهمين بَدلاً)،
                 * وإلا يَعود إلى السلوك القديم.
                 */
                const primary =
                    String(link.primaryLabel ?? '').trim() ||
                    (link.caseNumber && link.caseNumber !== '—'
                        ? link.caseNumber
                        : 'إضبارة دون رقم');
                const tooltip = link.detailLabel || `إضبارة مضمومة: ${primary}`;
                const clickable = Boolean(onOpenMergedChildCase && link.isResolved !== false);
                const content = (
                    <>
                        <span aria-hidden>🔗</span>
                        <span className="text-gray-400 font-bold">ضمّ:</span>
                        <span className="text-white">{primary}</span>
                    </>
                );
                return clickable ? (
                    <button
                        key={link.id}
                        type="button"
                        title={tooltip}
                        onClick={() => onOpenMergedChildCase?.(link.id)}
                        className={`${infoPillClass} cursor-pointer hover:bg-white/10 transition`}
                    >
                        {content}
                    </button>
                ) : (
                    <span
                        key={link.id}
                        title={tooltip}
                        className={`${infoPillClass} opacity-70`}
                    >
                        {content}
                    </span>
                );
            })}
            {hasPendingBail ? (
                <>
                    <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-b from-amber-900/30 to-amber-950/45 border border-amber-700/35 text-sm font-bold text-amber-200 whitespace-normal break-words"
                        title="كفالة معلقة (مهلة 72 ساعة)"
                    >
                        ⏳ كفالة معلقة (72 ساعة)
                    </span>
                    <button
                        type="button"
                        onClick={onConfirmPendingBail}
                        disabled={!canConfirmPendingBail}
                        className="print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-b from-emerald-900/35 to-emerald-950/55 border border-emerald-700/35 text-sm font-bold text-emerald-200 hover:from-emerald-800/50 hover:border-emerald-600/50 hover:text-emerald-100 transition-all disabled:opacity-40 disabled:pointer-events-none"
                    >
                        مضي المدة وتصديق الكفالة
                    </button>
                </>
            ) : null}
        </div>
    );
}
