import { useMemo } from 'react';
import type { EvictionPremisesUse } from '@/app/utils/executionModuleStrategies';
import {
    inferEvictionPremisesUse,
    formatClaimTypeArabic,
    hasAnyEvictionFieldStepRecorded,
} from '@/app/utils/executionModuleStrategies';

export function useDossierHeaderMetadata(
    executionData: any,
    classification: string | undefined,
    claimType: string,
    evictionCaseExpenses: any[],
    visitChildNames: string[],
    custodyWardNamesList: string[],
    evictionPremisesUseRaw: string | undefined,
    evictionPropertyTypeField: string,
    judgmentDate: string | undefined,
    activeCoerciveActions: any[],
    activeTimelineEvents: any[],
    docType: string,
    docNumber: string,
) {
    const evictionPremisesUseResolved = useMemo(
        () =>
            inferEvictionPremisesUse({
                explicit: evictionPremisesUseRaw as EvictionPremisesUse | null | undefined,
                propertyTypeText: evictionPropertyTypeField,
            }),
        [evictionPremisesUseRaw, evictionPropertyTypeField]
    );

    const evictionCaseExpensesSum = useMemo(
        () => evictionCaseExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0),
        [evictionCaseExpenses]
    );

    const creditorExtraMinorNames =
        claimType === 'مشاهدة' ? visitChildNames : claimType === 'تسليم ولد' ? custodyWardNamesList : [];
    const creditorExtraMinorLabel =
        claimType === 'مشاهدة' ? 'أسماء الأولاد' : claimType === 'تسليم ولد' ? 'أسماء المحضونين' : '';

    const classificationDisplay = useMemo(() => {
        if (classification === 'شرعي') return 'شرعي / أحوال شخصية';
        if (classification === 'مدني') return 'مدني';
        if (classification && classification !== 'none') return classification;
        const cat = (executionData as { category?: string })?.category;
        if (cat === 'sharia') return 'شرعي / أحوال شخصية';
        if (cat === 'civil') return 'مدني';
        return '—';
    }, [classification, executionData]);

    const claimTypeArabicDisplay = useMemo(
        () => formatClaimTypeArabic(claimType, evictionPremisesUseResolved),
        [claimType, evictionPremisesUseResolved]
    );

    const lawyerStartedPostNoticeExecution = useMemo(
        () =>
            activeCoerciveActions.length > 0 ||
            hasAnyEvictionFieldStepRecorded(activeTimelineEvents),
        [activeCoerciveActions, activeTimelineEvents]
    );

    const judgmentDateDisplay = useMemo(() => {
        if (!judgmentDate) return '';
        const dt = new Date(judgmentDate);
        return Number.isNaN(dt.getTime()) ? judgmentDate : dt.toLocaleDateString('ar-IQ');
    }, [judgmentDate]);

    const walnutHeaderClaimShort = useMemo(() => {
        const full = String(claimTypeArabicDisplay || '').trim();
        if (!full) return '';
        const first = full.split(/\s*[—–-]\s*/)[0]?.trim();
        return first || full;
    }, [claimTypeArabicDisplay]);

    const walnutHeaderExecShort = useMemo(() => {
        const t = String((executionData as { executionType?: string })?.executionType || '').trim();
        if (!t) return '';
        if (/^(مدني|شرعي)(\s|\/|$)/.test(t) || t === 'شرعي / أحوال شخصية') return '';
        return t;
    }, [executionData]);

    const showJudgmentMeta =
        docType === 'قرارات وأحكام المحاكم' || Boolean(docNumber?.trim()) || Boolean(judgmentDate?.trim());

    return {
        evictionPremisesUseResolved,
        evictionCaseExpensesSum,
        creditorExtraMinorNames,
        creditorExtraMinorLabel,
        classificationDisplay,
        claimTypeArabicDisplay,
        lawyerStartedPostNoticeExecution,
        judgmentDateDisplay,
        walnutHeaderClaimShort,
        walnutHeaderExecShort,
        showJudgmentMeta,
    };
}
