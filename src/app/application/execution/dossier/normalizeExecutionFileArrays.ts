import type { ExecutionFile } from '@/app/types/execution';
import { asArray, asRecord } from '@/app/utils/asArray';

/**
 * كل حقول المصفوفة الشائعة على ExecutionFile التي يُستدعى عليها
 * .map / .filter / spread في مسار فتح الإضبارة. أي قيمة غير مصفوفة من التخزين
 * كانت تُسقط boot بخطأ واحد تلو الآخر.
 */
const EXECUTION_ARRAY_KEYS = [
    'timelineEvents',
    'caseNotesLog',
    'caseTasksPending',
    'seizedAssets',
    'financialLedger',
    'realEstateSeizureAssets',
    'thirdPartySeizureAssets',
    'standaloneExecutionMarks',
    'activeCoerciveActions',
    'creditors',
    'debtors',
    'linkedDossiers',
    'inaba_correspondence_log',
    'parties',
    'seizedProperties',
    'seizedMovables',
    'thirdPartySeizures',
    'other_party_actions_log',
    'other_party_request_tracks',
    'dossier_heirs_list',
    'visitationChildrenNames',
    'maritalFurnitureItems',
    'custodyWardNames',
    'specificDeliveryItems',
    'guarantor_followup_history',
    'procedural_guarantee_history',
    'eviction_case_expenses',
    'encroachment_case_expenses',
    'eviction_judicial_custodians',
    'ghuramaDistributionLogs',
    'coerciveActions',
    'pinnedTasks',
] as const;

type ExecutionArrayKey = (typeof EXECUTION_ARRAY_KEYS)[number];

/**
 * يصلح حقول المصفوفات الفاسدة القادمة من localStorage/IndexedDB
 * قبل أن تصل لأي مستهلك (.map/.filter على كائن → boot failure).
 */
export function normalizeExecutionFileArrays<T extends ExecutionFile>(file: T): T {
    if (!file || typeof file !== 'object') return file;
    let next: T | null = null;
    const src = file as Record<string, unknown>;

    for (const key of EXECUTION_ARRAY_KEYS) {
        const value = src[key];
        if (value == null || Array.isArray(value)) continue;
        if (!next) next = { ...file };
        (next as Record<string, unknown>)[key as ExecutionArrayKey] = asArray(value);
    }

    const drafts = src.seizureDraftsByDecisionId;
    if (drafts != null && (typeof drafts !== 'object' || Array.isArray(drafts))) {
        if (!next) next = { ...file };
        (next as Record<string, unknown>).seizureDraftsByDecisionId = asRecord(drafts);
    }

    return next ?? file;
}
