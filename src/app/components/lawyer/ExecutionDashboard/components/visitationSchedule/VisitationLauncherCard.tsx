import { ChevronLeft } from '@/app/components/ui/icons/ChevronLeft';
import { Users } from '@/app/components/ui/icons/Users';
import type { WorkspaceTab } from './visitationScheduleModuleTypes';

export type VisitationLauncherCardProps = {
    ready: boolean;
    visitChildNames: string[];
    scheduledCount: number;
    documentedCount: number;
    scheduleHint: string;
    onOpen: (tab?: WorkspaceTab) => void;
};

export function VisitationLauncherCard({
    ready,
    visitChildNames,
    scheduledCount,
    documentedCount,
    scheduleHint,
    onOpen,
}: VisitationLauncherCardProps) {
    const childPreview =
        visitChildNames.length > 0
            ? `${visitChildNames.slice(0, 2).join('، ')}${
                  visitChildNames.length > 2 ? ` +${visitChildNames.length - 2}` : ''
              }`
            : null;

    return (
        <button
            type="button"
            data-testid="visitation-schedule-launcher"
            onClick={() => onOpen(ready ? 'appointment' : 'setup')}
            className="mx-3 mt-2 w-[calc(100%-1.5rem)] rounded-xl border border-[#E6C673]/20 bg-[#0B1120]/75 px-3 py-2.5 text-right ring-1 ring-white/[0.03] transition-colors hover:border-[#E6C673]/35 hover:bg-[#E6C673]/8 touch-manipulation"
            dir="rtl"
        >
            <div className="flex items-center gap-2 flex-row-reverse">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673]">
                    <Users size={15} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold leading-tight text-[#E6C673]">
                        جدول التنفيذ والمتابعة
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">{scheduleHint}</p>
                    {childPreview ? (
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">{childPreview}</p>
                    ) : null}
                </div>
                <ChevronLeft size={16} className="shrink-0 text-[#E6C673]/50 rotate-180" aria-hidden />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 flex-row-reverse text-[9px]">
                {ready ? (
                    <>
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-bold text-slate-300">
                            {scheduledCount} موعد
                        </span>
                        {documentedCount > 0 ? (
                            <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-200/90">
                                {documentedCount} موثّق
                            </span>
                        ) : null}
                    </>
                ) : (
                    <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-bold text-amber-100">
                        إعداد الجدول
                    </span>
                )}
            </div>
        </button>
    );
}
