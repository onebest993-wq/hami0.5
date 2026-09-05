import React from 'react';

/** شريط خفيف لإكمال البيانات بعد موافقة المنفذ — بلا أكورديون متعدد الخطوات */
export function EvictionPostApproveRail(props: {
    title: string;
    children: React.ReactNode;
}) {
    const { title, children } = props;
    return (
        <div
            className="border-t border-white/8 px-3 py-2"
            data-testid="eviction-post-approve-rail"
            dir="rtl"
        >
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-right">
                <p className="text-[10px] font-bold text-slate-300">{title}</p>
                {children}
            </div>
        </div>
    );
}
