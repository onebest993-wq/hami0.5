/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 Progress Bars - مكونات أشرطة التقدم
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * مكونات عرض التقدم المالي للمدينين والمدفوعات
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ProgressBarProps {
    allocated: number;
    paid: number;
    label?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEBTOR FINANCIAL PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * شريط التقدم المالي للمدين
 * يعرض نسبة المبلغ المدفوع إلى المبلغ المخصص
 */
export const DebtorFinancialProgressBar: React.FC<ProgressBarProps> = ({
    allocated,
    paid,
    label,
}) => {
    const pct = allocated > 0 ? Math.min(100, Math.round((paid / allocated) * 100)) : paid > 0 ? 100 : 0;
    
    return (
        <div className="mx-1 mb-3 rounded-xl border border-slate-600/40 bg-slate-900/50 p-3">
            <div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-400">
                <span className="tabular-nums">
                    {paid.toLocaleString('ar-IQ')} / {allocated.toLocaleString('ar-IQ')} د.ع
                </span>
                <span>{label || 'تقدّم الذمة'}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div 
                    className="h-full bg-emerald-500/80 transition-all" 
                    style={{ width: `${pct}%` }} 
                />
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * تحقق مما إذا كان صف المدين قد تم تسويته
 */
export function executionDebtorRowCleared(
    allocated: number,
    paid: number,
    additionalStatus?: 'Active' | 'Cleared'
): boolean {
    if (additionalStatus === 'Cleared') return true;
    return allocated > 0 && paid >= allocated;
}