import React from 'react';
import { formatMergeProvenanceBadge } from '../caseMergeMigration';

export type MergeProvenanceBadgeProps = {
    mergedFromCaseId?: string;
    mergedFromCaseNumber?: string;
    /** نَوع السِجل (اختياري لِشرح الـ tooltip بشكل دقيق). */
    recordKind?: 'إجراء' | 'قرار' | 'إفادة' | 'طلب' | 'سجل تحقيق' | 'حدث';
    /** نَمط مُختصر (مُجرّد رمز) — للوَضع المُكتظ. */
    compact?: boolean;
    className?: string;
};

/**
 * شارة تَتبّع للسِجلات المُرحَّلة من إضبارة مَضمومة — تَظهر بِجانب الإجراء/القرار/الإفادة/الطلب.
 *
 * المَظهر: زجاجي رَفيع، خَلفية بنفسجية شَفافة، نَص ذَهبي خفيف — يَنسجم مع ثيم الإضبارة الموحدة.
 * يَختفي تلقائياً إذا لم يَكن السِجل مُرحَّلاً.
 */
export const MergeProvenanceBadge: React.FC<MergeProvenanceBadgeProps> = ({
    mergedFromCaseId,
    mergedFromCaseNumber,
    recordKind = 'إجراء',
    compact = false,
    className = '',
}) => {
    const caseId = String(mergedFromCaseId ?? '').trim();
    const caseNumber = String(mergedFromCaseNumber ?? '').trim();
    if (!caseId && !caseNumber) return null;

    const label = caseNumber || 'إضبارة دون رقم';
    const fullText = formatMergeProvenanceBadge(label);
    const tooltip = `${recordKind} مُرحَّل من إضبارة مَضمومة (${label}) — للتَتبّع التاريخي فقط.`;

    if (compact) {
        return (
            <span
                title={tooltip}
                className={`inline-flex items-center gap-1 rounded-md border border-violet-500/40 bg-violet-950/30 px-1.5 py-0.5 text-[10px] font-black text-violet-200 whitespace-nowrap ${className}`}
            >
                <span aria-hidden>📌</span>
                <span>{label}</span>
            </span>
        );
    }

    return (
        <span
            title={tooltip}
            className={`inline-flex items-center gap-1.5 rounded-md border border-violet-500/40 bg-violet-950/30 px-2 py-0.5 text-[10px] font-black text-violet-100 whitespace-normal break-words ${className}`}
        >
            <span aria-hidden>📌</span>
            <span>{fullText.replace(/^📌\s*/, '')}</span>
        </span>
    );
};
