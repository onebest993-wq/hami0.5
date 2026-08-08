import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { resolveSeizureWorkflowDossierId } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureWorkflowDossierUtils';
import type { SeizureWorkflowDossierInput } from './seizureWorkflowTypes';

/**
 * قرارات المسار الحيّة لإضبارة الحجز.
 *
 * لوحتا المنقول والعقار تتلقّيان `decisions` من الأب، لكن الطلبات تُلحق بطابور
 * القرارات مباشرةً فتسبق prop الأب. تُقرأ القائمة من مُعرّف تخزين القرارات
 * الموحَّد، ويُستعمل prop الأب احتياطياً فقط: إن غاب المُعرّف أو كان الطابور
 * فارغاً — حتى لا تُفرَّغ اللوحة بسبب تعذّر القراءة.
 *
 * تعيش في domain/seizure لا في ExecutionDashboard/utils: الوحدة الثانية لا
 * تستورد طابور القرارات، وإضافة الاعتماد إليها كانت ستفتح دائرة استيراد جديدة.
 */
export function readSeizureWorkflowLiveDecisions(
    dossierInput: SeizureWorkflowDossierInput,
    fallbackDecisions: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
    const dossierId = resolveSeizureWorkflowDossierId(dossierInput);
    if (!dossierId) return fallbackDecisions;

    const live = readExecutorDecisionsArray(dossierId, dossierInput.executionData ?? null);
    return live.length > 0 ? live : fallbackDecisions;
}
