import React from 'react';
import type { Decision } from '../types';
import { buildAppealProceedingsForDecision } from '../utils';
import {
    appealAppellantDisplayLabel,
    isAppealResultFavorableToDebtorClient,
    type AppealUiPerspective,
} from '../appealUiLabels';

function resultToneClass(
    result: string,
    perspective: AppealUiPerspective,
    appellant: string
): string {
    if (result === 'قيد النظر' || result === 'بانتظار التسجيل') return 'text-blue-400';
    if (perspective === 'debtor_agent') {
        const actor =
            appellant === 'الدائن' || appellant === 'وكيل الدائن'
                ? 'lawyer'
                : appellant === 'المدين' || appellant === 'موكّلنا' || appellant === 'موكّل المدين'
                  ? 'debtor'
                  : null;
        return isAppealResultFavorableToDebtorClient(result, actor)
            ? 'text-emerald-400'
            : 'text-rose-400';
    }
    if (result === 'قبول التظلم' || result === 'تصديق القرار' || result === 'رد اللائحة') {
        return 'text-emerald-400';
    }
    if (result === 'نقض القرار') return 'text-amber-400';
    if (result === 'رد التظلم') return 'text-red-400';
    return 'text-gray-300';
}

export function AppealProceedingsSummary({
    row,
    perspective = 'creditor_agent',
}: {
    row: Decision;
    perspective?: AppealUiPerspective;
}) {
    const proceedings = buildAppealProceedingsForDecision(row, perspective);

    if (proceedings.length === 0) {
        return (
            <p className="text-[11px] leading-relaxed text-slate-500">
                لا توجد إجراءات طعن مسجّلة على هذا القرار بعد.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {proceedings.map((step, index) => (
                <div
                    key={`${step.stage}-${index}`}
                    className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-[11px] text-right"
                >
                    <span className="font-bold text-slate-300">المرحلة: {step.stage}</span>
                    {step.appellant && step.appellant !== '—' ? (
                        <>
                            <span className="text-gray-600">|</span>
                            <span className="text-gray-400">
                                الطاعن:{' '}
                                <span className="font-semibold text-slate-200">
                                    {appealAppellantDisplayLabel(step.appellant, perspective)}
                                </span>
                            </span>
                        </>
                    ) : null}
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400">
                        النتيجة:{' '}
                        <span
                            className={`font-bold ${resultToneClass(
                                step.result,
                                perspective,
                                appealAppellantDisplayLabel(step.appellant, perspective)
                            )}`}
                        >
                            {step.result}
                        </span>
                    </span>
                </div>
            ))}
        </div>
    );
}
