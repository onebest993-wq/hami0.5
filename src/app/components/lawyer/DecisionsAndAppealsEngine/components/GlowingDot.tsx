import React from 'react';
import type { AppealUiPerspective } from '../appealUiLabels';

interface GlowingDotProps {
    status?: string;
    outcome?: string;
    origin?: string;
    perspective?: AppealUiPerspective;
    /** من يقدّم الطلب — بمنظور وكيل المدين */
    requestFiler?: 'creditor' | 'debtor' | 'executor';
}

function GlowingDot({
    status,
    outcome,
    origin,
    perspective = 'creditor_agent',
    requestFiler,
}: GlowingDotProps) {
    let color = 'bg-slate-400';
    let shadow = '';

    const filer =
        perspective === 'debtor_agent'
            ? requestFiler ?? (origin === 'debtor_side' ? 'debtor' : 'creditor')
            : null;
    const debtorAgentCreditorRequest = filer === 'creditor';
    const debtorAgentDebtorRequest = filer === 'debtor';

    if (outcome === 'withdrawn') {
        color = 'bg-slate-400';
        shadow = '';
    } else if (outcome === 'pending') {
        color = 'bg-blue-500';
        shadow = '';
    } else if (status === 'accepted' || outcome === 'approved' || outcome === 'alternative') {
        if (debtorAgentCreditorRequest) {
            color = 'bg-rose-400';
            shadow = '';
        } else {
            color = 'bg-emerald-500';
            shadow = '';
        }
    } else if (status === 'rejected' || outcome === 'rejected') {
        if (debtorAgentCreditorRequest) {
            color = 'bg-emerald-500';
            shadow = '';
        } else if (debtorAgentDebtorRequest) {
            color = 'bg-rose-500';
            shadow = '';
        } else {
            color = 'bg-rose-500';
            shadow = '';
        }
    } else if (status === 'tadhallum_filed') {
        color = 'bg-amber-500';
        shadow = '';
    } else if (status === 'tamyeez_filed') {
        color = 'bg-purple-500';
        shadow = '';
    } else if (origin === 'debtor_side') {
        color = 'bg-slate-500';
        shadow = '';
    }

    return <div className={`w-2 h-2 rounded-full shrink-0 ${color} ${shadow}`} />;
}

export default GlowingDot;
