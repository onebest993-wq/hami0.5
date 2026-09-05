import React from 'react';
import { paintCaseNo } from './smartHeaderPresentation';

/**
 * عرض رقم الدعوى العراقية بالترتيب الثابت: رقم / حرف / سنة
 * يُرسم كشرائح LTR معزولة حتى لا يعكس RTL المحارف.
 */
export function IraqiCaseNoDisplay({ caseNo }: { caseNo: unknown }) {
    const text = paintCaseNo(caseNo);
    if (text === 'غير محدد') return <>{text}</>;

    const parts = text.split('/');
    if (parts.length === 3 && parts.every((p) => p.trim())) {
        return (
            <span
                dir="ltr"
                className="inline-flex items-center tabular-nums whitespace-nowrap"
                style={{ unicodeBidi: 'isolate' }}
            >
                <span>{parts[0]}</span>
                <span aria-hidden className="mx-0.5 opacity-70">
                    /
                </span>
                <span>{parts[1]}</span>
                <span aria-hidden className="mx-0.5 opacity-70">
                    /
                </span>
                <span>{parts[2]}</span>
            </span>
        );
    }

    return (
        <span dir="ltr" className="tabular-nums whitespace-nowrap" style={{ unicodeBidi: 'isolate' }}>
            {text}
        </span>
    );
}
