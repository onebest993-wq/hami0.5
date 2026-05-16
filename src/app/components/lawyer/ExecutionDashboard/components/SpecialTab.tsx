import React from 'react';
import { ClipboardList, ChevronDown } from 'lucide-react';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';

export interface SpecialTabProps {
    isEvictionExecutionModule: boolean;
    handleDebtorEmploymentToggle: (debtor?: { debtorKey: string; isPrimary: boolean }) => void;
    activeWorkspaceDebtorForFollowup: { key: string; isPrimary: boolean } | null;
    debtorEmploymentToggleMenuLabel: (isEmployee: boolean, wasInitially: boolean) => string;
    activeDebtorIsEmployee: boolean;
    activeDebtorInitialWasEmployee: boolean;
    specialRequestTemplatePick: string;
    setSpecialRequestTemplatePick: (v: string) => void;
    specialRequestTemplateMenuOpen: boolean;
    setSpecialRequestTemplateMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    specialRequestTemplateMenuRef: React.RefObject<HTMLDivElement | null>;
    specialRequestDate: string;
    setSpecialRequestDate: (v: string) => void;
    specialRequestContent: string;
    setSpecialRequestContent: (v: string) => void;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    runSpecialFollowupSubmit: () => void;
    SMART_REQUEST_TEMPLATE_OPTIONS: readonly string[];
}

export const SpecialTab: React.FC<SpecialTabProps> = ({
    isEvictionExecutionModule,
    handleDebtorEmploymentToggle,
    activeWorkspaceDebtorForFollowup,
    debtorEmploymentToggleMenuLabel,
    activeDebtorIsEmployee,
    activeDebtorInitialWasEmployee,
    specialRequestTemplatePick,
    setSpecialRequestTemplatePick,
    specialRequestTemplateMenuOpen,
    setSpecialRequestTemplateMenuOpen,
    specialRequestTemplateMenuRef,
    specialRequestDate,
    setSpecialRequestDate,
    specialRequestContent,
    setSpecialRequestContent,
    inlineActionGateKey,
    setInlineActionGateKey,
    runSpecialFollowupSubmit,
    SMART_REQUEST_TEMPLATE_OPTIONS,
}) => (
    <div className="space-y-3 p-3 text-right">
        {!isEvictionExecutionModule && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-3 space-y-2">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDebtorEmploymentToggle(
                            activeWorkspaceDebtorForFollowup
                                ? {
                                      debtorKey:
                                          activeWorkspaceDebtorForFollowup.key,
                                      isPrimary:
                                          activeWorkspaceDebtorForFollowup.isPrimary,
                                  }
                                : undefined
                        );
                    }}
                    className="w-full rounded-lg bg-amber-800/70 py-2.5 text-[11px] font-bold text-white border border-white/10 disabled:opacity-40"
                >
                    {debtorEmploymentToggleMenuLabel(
                        activeDebtorIsEmployee,
                        activeDebtorInitialWasEmployee
                    )}
                </button>
            </div>
        )}
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1 px-1">
                <ClipboardList size={14} className="text-[#E6C673]" />
                <label className="block text-[10px] font-bold text-slate-400">نماذج الطلبات الذكية</label>
            </div>
            <div className="relative">
                <input
                    id="hami-smart-request-template"
                    value={specialRequestTemplatePick}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSpecialRequestTemplatePick(val);
                    }}
                    onFocus={() => setSpecialRequestTemplateMenuOpen(true)}
                    placeholder="اكتب يدوياً أو اختر من السهم…"
                    className="w-full bg-black/20 border border-white/10 text-white rounded-2xl p-4 pl-12 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 focus:bg-black/40 transition-all placeholder:text-white/20"
                />
                <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        const el = document.getElementById('hami-smart-request-template') as
                            | HTMLInputElement
                            | null;
                        el?.focus();
                        setSpecialRequestTemplateMenuOpen((v) => !v);
                    }}
                    aria-label="إظهار الخيارات"
                >
                    <ChevronDown size={16} />
                </button>
                {specialRequestTemplateMenuOpen ? (
                    <div
                        ref={specialRequestTemplateMenuRef}
                        className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-56 overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-1 text-right shadow-2xl backdrop-blur-3xl"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {SMART_REQUEST_TEMPLATE_OPTIONS.filter((v) => {
                            const q = String(specialRequestTemplatePick || '')
                                .toLowerCase()
                                .trim();
                            if (!q) return true;
                            return String(v).toLowerCase().includes(q);
                        }).map((v) => (
                            <button
                                key={v}
                                type="button"
                                className="w-full rounded-lg px-2.5 py-2 text-[11px] font-bold text-slate-200 hover:bg-white/10"
                                onClick={() => {
                                    setSpecialRequestTemplatePick(v);
                                    setSpecialRequestTemplateMenuOpen(false);
                                }}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
        <div>
            <label htmlFor="hami-special-request-date" className="mb-1 block text-[10px] text-slate-400">تاريخ الطلب</label>
            <input
                id="hami-special-request-date"
                type="date"
                value={specialRequestDate}
                onChange={(e) => setSpecialRequestDate(e.target.value)}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!specialRequestDate) {
                        const today = new Date().toISOString().slice(0, 10);
                        setSpecialRequestDate(today);
                    }
                }}
                max={new Date().toISOString().slice(0, 10)}
                dir="rtl"
                className="w-full bg-black/20 border border-white/10 text-white rounded-2xl p-4 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 focus:bg-black/40 transition-all placeholder:text-white/20 [&::-webkit-calendar-picker-indicator]:invert"
            />
        </div>
        <div>
            <label htmlFor="hami-special-request-content" className="mb-1 block text-[10px] text-slate-400">مضمون الطلب</label>
            <textarea
                id="hami-special-request-content"
                value={specialRequestContent}
                onChange={(e) => setSpecialRequestContent(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                rows={5}
                placeholder="اكتب طلبك بالصيغة التي تريدها..."
                className="w-full bg-black/20 border border-white/10 text-white rounded-2xl p-4 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 focus:bg-black/40 transition-all placeholder:text-white/20 resize-none"
            />
        </div>
        <div className="relative">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setInlineActionGateKey('special_request_submit');
                }}
                className="w-full py-4 mt-4 bg-white text-black hover:bg-slate-200 rounded-2xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all"
            >
                تأكيد إرسال الطلب
            </button>
            <InlineActionGate gateKey="special_request_submit" activeKey={inlineActionGateKey} onConfirm={() => {
                void runSpecialFollowupSubmit();
            }} onCancel={() => setInlineActionGateKey(null)} />
        </div>
    </div>
);
