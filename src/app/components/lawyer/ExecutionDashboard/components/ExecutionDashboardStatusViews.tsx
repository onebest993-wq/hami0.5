import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ExecutionDashboardRootFrame } from './ExecutionDashboardRootFrame';

function ExecutionDashboardLoadingShell() {
    return (
        <div className="flex h-full w-full max-w-md flex-col border border-slate-700/30 bg-slate-900/95 shadow-2xl">
            <div className="mx-2 mt-2 rounded-xl border-b border-black/50 border-t border-white/10 bg-gradient-to-r from-slate-800/40 via-slate-700/20 to-slate-800/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
                <div className="grid w-full grid-cols-[2.25rem_minmax(0,1fr)_2.25rem_2.25rem] items-center gap-1.5 px-2.5 py-2">
                    <div className="inline-flex h-9 w-9 rounded-xl border border-white/8 bg-hami-navy/45" aria-hidden />
                    <div className="flex min-w-0 justify-center">
                        <div className="h-4 w-36 animate-pulse rounded-full bg-white/10" />
                    </div>
                    <div className="inline-flex h-9 w-9 rounded-xl border border-[#E6C673]/20 bg-[#E6C673]/8" aria-hidden />
                    <div className="inline-flex h-9 w-9 rounded-xl border border-white/8 bg-hami-navy/45" aria-hidden />
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden px-3 pt-3">
                <div className="mb-3 rounded-2xl border border-amber-500/25 bg-[#0B1120]/55 px-3 py-3">
                    <div className="mx-auto h-5 w-40 animate-pulse rounded-full bg-amber-100/10" />
                </div>

                <div className="space-y-3">
                    <div className="rounded-2xl border border-emerald-500/18 bg-[#0B1120]/35 px-3 py-5">
                        <div className="mx-auto h-4 w-24 animate-pulse rounded-full bg-white/10" />
                    </div>
                    <div className="rounded-2xl border border-rose-500/18 bg-[#0B1120]/35 px-3 py-5">
                        <div className="mx-auto h-4 w-28 animate-pulse rounded-full bg-white/10" />
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-[#0A0F1C]/28 p-2.5">
                        <div className="grid grid-cols-2 gap-3">
                            {Array.from({ length: 6 }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-24 animate-pulse rounded-xl border ${
                                        idx === 4
                                            ? 'border-emerald-500/18 bg-emerald-500/[0.05]'
                                            : idx === 5
                                              ? 'border-amber-500/18 bg-amber-500/[0.05] col-span-2'
                                              : 'border-white/8 bg-white/[0.03]'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ExecutionDashboardLoadingView({ inline = false }: { inline?: boolean }) {
    if (inline) return <ExecutionDashboardLoadingShell />;
    return (
        <ExecutionDashboardRootFrame>
            <ExecutionDashboardLoadingShell />
        </ExecutionDashboardRootFrame>
    );
}

export function ExecutionDashboardErrorView({
    message,
    onClose,
}: {
    message: string;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 bg-[#000000] z-[230] flex items-center justify-center">
            <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-8 max-w-md text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-red-500 mb-3">خطأ في التحميل</h3>
                <p className="text-gray-300 mb-6">{message}</p>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                    إغلاق
                </button>
            </div>
        </div>
    );
}
