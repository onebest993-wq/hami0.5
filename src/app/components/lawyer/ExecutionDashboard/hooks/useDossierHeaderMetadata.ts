import { useMemo } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { EvictionPremisesUse } from '@/app/utils/executionModuleStrategies';
import {
    inferEvictionPremisesUse,
    hasAnyEvictionFieldStepRecorded,
} from '@/app/utils/executionModuleStrategies';
import { resolveDossierHeaderFields } from '@/app/utils/executionDossierHeaderFields';
import type { EncroachmentCaseExpenseRow } from '@/app/utils/encroachmentRemovalRequests';
import { executionFileContentSignature } from './useExecutionData';

export function useDossierHeaderMetadata(
    executionData: ExecutionFile | null | undefined,
    classification: string | undefined,
    claimType: string,
    evictionCaseExpenses: EncroachmentCaseExpenseRow[],
    visitChildNames: string[],
    custodyWardNamesList: string[],
    evictionPremisesUseRaw: string | undefined,
    evictionPropertyTypeField: string,
    judgmentDate: string | undefined,
    activeCoerciveActions: string[],
    activeTimelineEvents: TimelineEvent[],
    docType: string,
    docNumber: string,
) {
    const headerFields = useMemo(
        () => resolveDossierHeaderFields(executionData),
        [executionData ? executionFileContentSignature(executionData) : ''],
    );

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

    const classificationDisplay = headerFields.classificationDisplay || '—';
    const claimTypeArabicDisplay = headerFields.claimTypeDisplay || '—';

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

    const showJudgmentMeta =
        Boolean(headerFields.docType) ||
        Boolean(headerFields.docNumber) ||
        Boolean(headerFields.judgmentDate);

    return {
        headerFields,
        evictionPremisesUseResolved,
        evictionCaseExpensesSum,
        creditorExtraMinorNames,
        creditorExtraMinorLabel,
        classificationDisplay,
        claimTypeArabicDisplay,
        lawyerStartedPostNoticeExecution,
        judgmentDateDisplay,
        showJudgmentMeta,
    };
}
