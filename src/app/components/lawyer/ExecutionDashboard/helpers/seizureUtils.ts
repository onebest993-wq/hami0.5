/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 Seizure Utilities - دوال مساعدة للحجز والتحصيل
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * دوال مساعدة للتعامل مع أصول الحجز والتحصيل
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

import type { SeizedAsset } from '@/app/types/execution';
import {
    getExecutorDecisionRowById,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorDecisionRowEffectivelyEnforced } from '@/app/components/lawyer/ExecutionDashboard/utils/executorRequestEnforceability';

// ═══════════════════════════════════════════════════════════════════════════
// SEIZURE TYPE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * استخراج مفتاح الإكراه من نوع الأصل
 */
export function seizureCoerciveKeyFromAssetType(a: SeizedAsset): 'vehicle' | 'property' | 'salary' | null {
    const t = String(a.type);
    if (/راتب|salary|خُمس/i.test(t) || a.type === 'salary') return 'salary';
    if (/عقار|real_estate|أرض/i.test(t) || a.type === 'real_estate') return 'property';
    if (a.type === 'vehicle' || /مال\s*منقول|مركبة|طلب\s*حجز\s*مال/i.test(t)) return 'vehicle';
    return null;
}

/**
 * تنظيف عنوان نوع الحجز بعد الفك أو لإزالة «قيد البت» من العرض
 */
export function stripSeizureTypeDecorators(tRaw: string): string {
    return String(tRaw)
        .replace(/\s*—\s*موافقة\s*المنفذ\s*/gi, '')
        .replace(/\s*—\s*رفض\s*(?:المنفذ|الطلب)\s*/gi, '')
        .replace(/\s*—\s*قرار\s*بديل\s*/gi, '')
        .replace(/\s*\(\s*قيد\s*البت\s*\)\s*/gi, '')
        .replace(/\s*قيد\s*البت\s*/gi, '')
        .trim();
}

/**
 * التحقق مما إذا كان الصف يمثل حجز راتب (سجل أو مسودة)
 */
export { isSalarySeizureAsset } from '@/app/utils/execution/isSalarySeizureAsset';

/**
 * التحقق مما إذا كان الصف يمثل حجز راتب
 */
export function isSalarySeizureRow(a: SeizedAsset): boolean {
    const t = String(a.type);
    return /راتب|salary|خُمس/i.test(t) || a.type === 'salary';
}

/**
 * التحقق مما إذا كان الصف يمثل حجز مال منقول
 */
/** صف قرار حجز مكتمل — موافقة منفذ + حفظ التفاصيل */
export function isSeizureDecisionRowFullyRegistered(
    row: Record<string, unknown> | null | undefined
): boolean {
    if (!row) return true;
    const id = String((row as { id?: string }).id ?? '').trim();
    if (!id) return true;
    if (isExecutorRowRejectedAndFinal(row)) return false;
    if (!isExecutorRowEffectivelyApproved(row)) return false;
    return Boolean(String((row as { seizureRequestSavedAt?: string }).seizureRequestSavedAt ?? '').trim());
}

/** محجوز نشط يستحق شارة — لا يُعرض عند «قيد البت» أو قبل موافقة المنفذ */
export function isSeizureAssetEnforceableForBadge(
    asset: SeizedAsset,
    decisionsExecutionId?: string
): boolean {
    if (asset.seizure_record_locked) return false;
    const st = String(asset.status || '');
    if (st === 'pending' || st === 'released' || st === 'sold') return false;
    if (/قيد\s*البت/i.test(String(asset.type || ''))) return false;

    const det =
        typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
            ? (asset.details as Record<string, unknown>)
            : {};
    const decisionRowId = String(det.decisionRowId ?? '').trim();
    if (!decisionRowId) return st === 'seized' || st === 'auctioned';

    const exId = String(decisionsExecutionId ?? '').trim();
    if (!exId) return false;
    const row = getExecutorDecisionRowById(exId, decisionRowId) as Record<string, unknown> | null;
    if (!row) return false;
    if (!isSeizureDecisionRowFullyRegistered(row)) return false;
    const all = readExecutorDecisionsArray(exId) as Record<string, unknown>[];
    return isExecutorDecisionRowEffectivelyEnforced(row, all);
}

export function isMovablePropertySeizureRow(a: SeizedAsset): boolean {
    const det =
        typeof a.details === 'object' && a.details && !Array.isArray(a.details)
            ? (a.details as Record<string, unknown>)
            : null;
    const kind = String(det?.seizureUiKind ?? '').trim();
    if (kind === 'vehicle') return true;
    
    const t = String(a.type);
    if (/عقار|real_estate|أرض/i.test(t) || a.type === 'real_estate') return false;
    if (/راتب|salary|خُمس|خمس/i.test(t) || a.type === 'salary') return false;
    
    return /مال\s*منقول|طلب\s*حجز\s*مال\s*منقول|مركبة|سيارة/i.test(t) || a.type === 'vehicle';
}