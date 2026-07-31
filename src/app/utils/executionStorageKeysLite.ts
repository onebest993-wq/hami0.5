/** مفاتيح تخزين التنفيذ — بلا storageCache / SecureStore / decisions seed */

import {
    scopeExecutionDeviceStorageKey,
    stripExecutionDeviceStorageUserScope,
} from '@/app/utils/executionDeviceStorageScope';

export function normalizeExecutionStorageId(executionId: string | undefined): string {
    const id = String(executionId ?? 'default').trim();
    return id || 'default';
}

/**
 * المفتاح المنطقي للإضبارة — بدون نطاق مستخدم.
 * قرارات/وثائق تُبنى بإلحاق لاحقات على هذا الأساس؛ لا تُدخل `:u:` في الوسط.
 */
export function unscopedExecutionStorageKey(executionId: string | undefined): string {
    return `execution_${normalizeExecutionStorageId(executionId)}`;
}

/**
 * مفتاح التخزين الحي للإضبارة — يُبقي الأساس غير مقيّد لتوافق قرارات/e2e،
 * والنطاق بالمالك يُطبَّق عند القراءة/الكتابة في طبقة blob.
 */
export function executionStorageKey(executionId: string | undefined): string {
    return unscopedExecutionStorageKey(executionId);
}

export function executionDecisionsStorageKey(executionId: string | undefined): string {
    return `${unscopedExecutionStorageKey(executionId)}_decisions`;
}

export function executionFieldVisitAppointmentStorageKey(executionId: string | undefined): string {
    return `${unscopedExecutionStorageKey(executionId)}_eviction_field_visit_appointment_iso`;
}

export function executionDocumentsStorageKey(executionId: string | undefined): string {
    return `${unscopedExecutionStorageKey(executionId)}_documents`;
}

export function executionDocumentFoldersStorageKey(executionId: string | undefined): string {
    return `${unscopedExecutionStorageKey(executionId)}_document_folders`;
}

export function executionFormStorageKey(formId: string | undefined): string {
    return `execution_form_${normalizeExecutionStorageId(formId)}`;
}

export function executionExpensesStorageKey(): string {
    return 'execution_expenses';
}

export function executionExpensesChangedEventName(): string {
    return 'hami-expenses-changed';
}

export function executionGarnishmentFlagStorageKey(executionId: string | undefined): string {
    return `garnishment_${normalizeExecutionStorageId(executionId)}`;
}

export function executionGarnishmentDetailsStorageKey(executionId: string | undefined): string {
    return `hami_garnishment_details_${normalizeExecutionStorageId(executionId)}`;
}

export function executionBadgesHiddenStorageKey(executionId: string | undefined): string {
    return `hami_party_badges_hidden_${normalizeExecutionStorageId(executionId)}`;
}

export function executionUnifiedFundsLedgerStorageKey(executionId: string | undefined): string {
    return `hami_unified_funds_ledger_${normalizeExecutionStorageId(executionId)}`;
}

export function executionEvictionGracePinnedStorageKey(executionId: string | undefined): string {
    return `hami_eviction_grace_pinned_${normalizeExecutionStorageId(executionId)}`;
}

export function executionEvictionGraceHiddenStorageKey(executionId: string | undefined): string {
    return `hami_eviction_grace_hidden_${normalizeExecutionStorageId(executionId)}`;
}

export function executionEmployeePersonalUnlockStorageKey(executionId: string | undefined): string {
    return `hami:employee_personal_unlock:${normalizeExecutionStorageId(executionId)}`;
}

export function generateExecutionDossierId(): string {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi?.randomUUID) return `exec_${cryptoApi.randomUUID()}`;
    return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function expandScopedAndLegacyStorageKeys(unscopedKey: string): string[] {
    const scoped = scopeExecutionDeviceStorageKey(unscopedKey);
    return scoped === unscopedKey ? [unscopedKey] : [scoped, unscopedKey];
}

/**
 * للحذف/المسح: المفتاح المنطقي + المقيّد بالمالك إن وُجد.
 *
 * تحذير لمن يُعدّل: المسح بالبادئة في `removeExecutionStorageBundleAsync` يطابق
 * `execution_{id}` فقط، فأي مفتاح لا يبدأ بذلك **يجب** أن يُدرَج هنا صريحاً وإلا
 * نجا من «الحذف النهائي». هكذا نجا السجل المالي وحالة مهلة التخلية سابقاً.
 * الاختبار في `__tests__/executionStorageBundleCoverage.test.ts` يمنع الانحراف
 * عن `EXECUTION_WIPE_KEY_PREFIXES`.
 */
export function getExecutionStorageBundleKeys(executionId: string | undefined): string[] {
    const base = unscopedExecutionStorageKey(executionId);
    const id = normalizeExecutionStorageId(executionId);
    const unscopedKeys = [
        base,
        `${base}_decisions`,
        `${base}_documents`,
        `${base}_document_folders`,
        `${base}_eviction_field_visit_appointment_iso`,
        `execution_form_${id}`,
        `garnishment_${id}`,
        `hami_garnishment_details_${id}`,
        `hami_party_badges_hidden_${id}`,
        executionUnifiedFundsLedgerStorageKey(id),
        executionEvictionGracePinnedStorageKey(id),
        executionEvictionGraceHiddenStorageKey(id),
        executionEmployeePersonalUnlockStorageKey(id),
    ];
    return unscopedKeys.flatMap(expandScopedAndLegacyStorageKeys);
}

/** يستخرج معرّف الإضبارة من مفتاح blob رئيسي (مع أو بدون :u:) */
export function executionDossierIdFromStorageKey(key: string): string {
    const withoutPrefix = stripExecutionDeviceStorageUserScope(key).slice('execution_'.length);
    return normalizeExecutionStorageId(withoutPrefix);
}

export {
    scopeExecutionDeviceStorageKey,
    stripExecutionDeviceStorageUserScope,
} from '@/app/utils/executionDeviceStorageScope';
