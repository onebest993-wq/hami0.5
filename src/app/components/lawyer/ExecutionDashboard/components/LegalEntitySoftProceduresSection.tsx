import React from 'react';
import { ClipboardList } from '@/app/components/ui/lucideIcons';
import { EncroachmentRemovalRequestCards } from './EncroachmentRemovalRequestCards';
import type { InlineActionGateKey } from '../types';

export interface LegalEntitySoftProceduresSectionProps {
    decisionsStorageExecutionId: string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean }
    ) => void;
    showEncroachmentSurveyor?: boolean;
    showSpecificDeliverySurveyor?: boolean;
    onEncroachmentExpenseRecorded?: (row: import('@/app/utils/encroachmentRemovalRequests').EncroachmentCaseExpenseRow) => void;
}

/**
 * إجراءات ميدانية لمدين معنوي — بدون قوة جبريّة وبدون مهلة إخبار.
 * (كشف، إزالة تجاوز، تسليم — عبر مخاطبات المنفذ)
 */
export function LegalEntitySoftProceduresSection(props: LegalEntitySoftProceduresSectionProps) {
    const {
        decisionsStorageExecutionId,
        inlineActionGateKey,
        setInlineActionGateKey,
        showToast,
        showEncroachmentSurveyor,
        showSpecificDeliverySurveyor,
        onEncroachmentExpenseRecorded,
    } = props;

    const hasAny = Boolean(showEncroachmentSurveyor || showSpecificDeliverySurveyor);
    if (!hasAny) return null;

    return (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 space-y-3" dir="rtl">
            <div className="flex items-center gap-2">
                <ClipboardList size={16} className="text-amber-300 shrink-0" />
                <h4 className="text-[11px] font-bold text-amber-100">
                    إجراءات ميدانية (بدون قوة جبريّة)
                </h4>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-400">
                للمدين المعنوي: تحديد موعد كشف، إزالة تجاوز، وتسليم — عبر طلبات المنفذ دون إحضار
                أو حبس أو كسر أقفال بالقوة.
            </p>
            {showEncroachmentSurveyor ? (
                <EncroachmentRemovalRequestCards
                    variant="surveyor_only"
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    showToast={showToast}
                    onExpenseRecorded={onEncroachmentExpenseRecorded}
                />
            ) : null}
            {showSpecificDeliverySurveyor && !showEncroachmentSurveyor ? (
                <p className="text-[10px] text-slate-500">
                    لطلب انتداب خبير مساح أو تحديد موعد كشف — استخدم «نماذج الطلبات» أو بطاقة
                    التسليم في سجل المخاطبات أعلاه.
                </p>
            ) : null}
        </div>
    );
}
