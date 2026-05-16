import React from 'react';

interface GlowingDotProps {
    status?: string;
    outcome?: string;
    origin?: string;
}

function GlowingDot({ status, outcome, origin }: GlowingDotProps) {
    let color = 'bg-slate-400';
    let shadow = 'shadow-[0_0_8px_rgba(148,163,184,0.8)]';

    if (outcome === 'pending') {
        color = 'bg-blue-500';
        shadow = 'shadow-[0_0_8px_rgba(59,130,246,0.8)]';
    } else if (status === 'accepted' || outcome === 'approved') {
        color = 'bg-emerald-500';
        shadow = 'shadow-[0_0_8px_rgba(16,185,129,0.8)]';
    } else if (status === 'rejected' || outcome === 'rejected') {
        color = 'bg-rose-500';
        shadow = 'shadow-[0_0_8px_rgba(244,63,94,0.8)]';
    } else if (status === 'tadhallum_filed') {
        color = 'bg-amber-500';
        shadow = 'shadow-[0_0_8px_rgba(245,158,11,0.8)]';
    } else if (status === 'tamyeez_filed') {
        color = 'bg-purple-500';
        shadow = 'shadow-[0_0_8px_rgba(168,85,247,0.8)]';
    } else if (origin === 'debtor_side') {
        color = 'bg-slate-500';
        shadow = 'shadow-[0_0_8px_rgba(100,116,139,0.8)]';
    }

    return <div className={`w-2 h-2 rounded-full shrink-0 ${color} ${shadow}`} />;
}

export default GlowingDot;
