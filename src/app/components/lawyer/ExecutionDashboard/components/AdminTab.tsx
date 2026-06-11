import React from 'react';
import { RefreshCw, PencilLine, Users, Scale, Gavel, ArrowRightLeft } from 'lucide-react';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';

const ADMIN_OPTIONS = [
    { label: 'طلب تجديد الإضبارة', icon: RefreshCw },
    { label: 'طلب تصحيح خطأ مادي', icon: PencilLine },
    { label: 'طلب انتداب خبير/خبراء', icon: Users },
    { label: 'الاعتراض على تقرير الخبراء', icon: Scale },
    { label: 'تحديد موعد المزايدة العلنية', icon: Gavel },
    { label: 'الإحالة القطعية', icon: ArrowRightLeft },
] as const;

export interface AdminTabProps {
    specialRequestTemplatePick: string;
    setSpecialRequestTemplatePick: (v: string) => void;
    specialRequestDate: string;
    setSpecialRequestDate: (v: string) => void;
    specialRequestContent: string;
    setSpecialRequestContent: (v: string) => void;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    runSpecialFollowupSubmit: () => void;
}

export const AdminTab: React.FC<AdminTabProps> = ({
    specialRequestTemplatePick,
    setSpecialRequestTemplatePick,
    specialRequestDate,
    setSpecialRequestDate,
    specialRequestContent,
    setSpecialRequestContent,
    inlineActionGateKey,
    setInlineActionGateKey,
    runSpecialFollowupSubmit,
}) => {
    const handlePick = (label: string) => {
        setSpecialRequestTemplatePick(label);
    };

    return (
        <div className="space-y-4 p-3 text-right">
            <div className="grid grid-cols-2 gap-2">
                {ADMIN_OPTIONS.map((opt) => {
                    const isActive = specialRequestTemplatePick === opt.label;
                    const Icon = opt.icon;
                    return (
                        <button
                            key={opt.label}
                            type="button"
                            onClick={() => handlePick(opt.label)}
                            className={`flex items-center gap-2 rounded-xl border p-3 text-[10px] font-bold transition-all ${
                                isActive
                                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-emerald-500/30 hover:bg-emerald-950/20 hover:text-emerald-200'
                            }`}
                        >
                            <Icon size={16} className="shrink-0 opacity-70" />
                            <span className="leading-tight">{opt.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="border-t border-white/5 pt-3">
                <div className="mb-1 px-1 text-[9px] text-slate-500">تفاصيل الطلب المختار</div>
                <input
                    type="text"
                    value={specialRequestTemplatePick}
                    onChange={(e) => setSpecialRequestTemplatePick(e.target.value)}
                    placeholder="أو اكتب طلباً مخصصاً..."
                    className="mb-3 w-full bg-black/20 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-emerald-500/50 placeholder:text-white/20"
                />
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className="mb-1 block text-[9px] text-slate-400">تاريخ الطلب</label>
                        <input
                            type="date"
                            value={specialRequestDate}
                            onChange={(e) => setSpecialRequestDate(e.target.value)}
                            max={new Date().toISOString().slice(0, 10)}
                            dir="rtl"
                            className="w-full bg-black/20 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-emerald-500/50 [&::-webkit-calendar-picker-indicator]:invert"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-[9px] text-slate-400">مضمون الطلب</label>
                        <input
                            type="text"
                            value={specialRequestContent}
                            onChange={(e) => setSpecialRequestContent(e.target.value)}
                            placeholder="مضمون الطلب..."
                            className="w-full bg-black/20 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-emerald-500/50 placeholder:text-white/20"
                        />
                    </div>
                </div>
                <div className="relative">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setInlineActionGateKey('admin_submit');
                        }}
                        className="w-full py-3.5 bg-emerald-700/80 text-white hover:bg-emerald-700 rounded-xl font-bold text-[11px] border border-emerald-500/30 transition-all disabled:opacity-50"
                    >
                        تأكيد إرسال الطلب
                    </button>
                    <InlineActionGate
                        gateKey="admin_submit"
                        activeKey={inlineActionGateKey}
                        onConfirm={() => { void runSpecialFollowupSubmit(); }}
                        onCancel={() => setInlineActionGateKey(null)}
                    />
                </div>
            </div>
        </div>
    );
};
