/**
 * قفل الوعاء الموحّد — معزول عن `utils` لأنه وحده يحتاج طابور قرارات الحجز.
 *
 * كان ساكناً في `FinancialOperationsCenter/utils`، فيستورد ذاك الملفّ
 * `executorSeizureDecisionQueue` (٩٣ وحدة و٧٥٩ كيلوبايت بإغلاقه: محرّك القرارات
 * والطعون). وكل من يمسّ `utils` يشحنها — ومنهم بطاقة أرشيف التنفيذ التي لا تسأل
 * عن القفل أصلاً، إنما عن مبلغ ورقم إضبارة.
 *
 * مستهلكو القفل خمسة، كلّهم داخل المركز المالي، وكلّهم يحتاج الطابور لغير هذا
 * السبب. فنقلُه إلى هنا لا يزيد وزن أحد.
 */
import { hasFrozenLedgerRows } from './utils';
import type { UnifiedLedgerStore } from './types';
import {
    getLatestUnifiedCollectionDecisionState,
    hasApprovedUnifiedCollection,
    type UnifiedCollectionDecisionState,
} from '@/app/utils/executorSeizureDecisionQueue';

export function isUnifiedLedgerLocked(
    executionId: string | undefined,
    store: UnifiedLedgerStore,
    decisionState?: UnifiedCollectionDecisionState,
): boolean {
    if (typeof store.collectionRequestedTotal === 'number' && store.collectionRequestedTotal > 0) return true;
    if (store.collectionRequestActive) return true;
    if (executionId && hasFrozenLedgerRows(store, executionId)) return true;
    if (!executionId) return false;
    if (hasApprovedUnifiedCollection(executionId)) return true;
    const state = decisionState ?? getLatestUnifiedCollectionDecisionState(executionId);
    return state === 'pending' || state === 'approved';
}
