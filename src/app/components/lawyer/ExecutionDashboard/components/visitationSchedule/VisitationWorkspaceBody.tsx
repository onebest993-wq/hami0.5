import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { ChevronUp } from '@/app/components/ui/icons/ChevronUp';
import { UserX } from '@/app/components/ui/icons/UserX';
import {
    VisitationScheduleSetupSection,
} from '@/app/components/lawyer/ExecutionCreationView/components/VisitationScheduleSetupSection';
import {
    formatCountdownAr,
    isVisitationSessionDocumented,
    sessionCalendarLabel,
} from '@/app/utils/visitationScheduleEngine';
import { VisitationCalendarPanel } from '../VisitationCalendarPanel';
import { AppointmentBlock } from './AppointmentBlock';
import { CHILD_CHIP_COLORS } from './visitationScheduleModuleConstants';
import type { VisitationScheduleModuleState } from './useVisitationScheduleModuleState';

export function VisitationWorkspaceBody({
    ready,
    workspaceTab,
    config,
    setupDraft,
    setSetupDraft,
    handleGenerateSchedule,
    sessions,
    todayYmd,
    visitChildNames,
    displayedSession,
    displayedTitle,
    showFollowing,
    setShowFollowing,
    canDocument,
    docActions,
    canToggleFollowing,
    handleDocumentSuccess,
    handleDocumentAbsence,
}: VisitationScheduleModuleState) {
    if (!ready || workspaceTab === 'setup') {
        return (
            <div className="space-y-3">
                <p className="text-sm font-bold text-slate-300 text-right">إعداد جدول المواعيد</p>
                {!config ? (
                    <VisitationScheduleSetupSection
                        draft={setupDraft}
                        onChange={setSetupDraft}
                        showGenerateButton
                        onGenerate={handleGenerateSchedule}
                        generateButtonLabel="توليد الجدول"
                    />
                ) : (
                    <div
                        className="space-y-1.5"
                        aria-busy="true"
                        data-testid="execution-visitation-generate-paint-slot"
                    >
                        <div
                            className="h-11 min-h-[44px] rounded-lg border border-white/8 bg-white/[0.04]"
                            aria-hidden
                        />
                        <div
                            className="h-11 min-h-[44px] rounded-lg border border-white/8 bg-white/[0.04]"
                            aria-hidden
                        />
                    </div>
                )}
            </div>
        );
    }

    if (workspaceTab === 'calendar' && config) {
        return (
            <VisitationCalendarPanel
                config={config}
                sessions={sessions}
                todayYmd={todayYmd}
            />
        );
    }

    return (
        <div className="space-y-3">
            {visitChildNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 justify-end">
                    {visitChildNames.map((name, i) => (
                        <span
                            key={`${name}-${i}`}
                            className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                                CHILD_CHIP_COLORS[i % CHILD_CHIP_COLORS.length]
                            }`}
                        >
                            {name}
                        </span>
                    ))}
                </div>
            ) : null}

            {displayedSession && config ? (
                <>
                    <AppointmentBlock
                        title={displayedTitle}
                        session={displayedSession}
                        config={config}
                        todayYmd={todayYmd}
                        tone={showFollowing ? 'next' : 'current'}
                        countdown={
                            showFollowing
                                ? formatCountdownAr(todayYmd, displayedSession.date)
                                : undefined
                        }
                        statusLabel={
                            isVisitationSessionDocumented(displayedSession)
                                ? sessionCalendarLabel(
                                      displayedSession,
                                      config.decisionMode,
                                      todayYmd,
                                  )
                                : undefined
                        }
                    >
                        {canDocument && docActions && (
                            <div className="space-y-2 pt-1">
                                <p className="text-[9px] font-bold text-amber-200/80 text-right">
                                    توثيق الموعد المستحق
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        data-testid="visitation-document-success"
                                        onClick={handleDocumentSuccess}
                                        className="group flex flex-row-reverse items-center gap-3 rounded-xl border border-emerald-500/35 bg-gradient-to-b from-emerald-500/14 to-emerald-950/20 px-3 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:border-emerald-400/45 hover:from-emerald-500/20 active:scale-[0.99] touch-manipulation min-h-[48px]"
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/15 text-emerald-100">
                                            <CheckCircle size={18} aria-hidden />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[11px] font-black text-emerald-50 leading-snug">
                                                تنفيذ ناجح
                                            </span>
                                            <span className="mt-0.5 block text-[9px] font-medium text-emerald-200/75 leading-relaxed">
                                                {docActions.successLabel}
                                            </span>
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        data-testid="visitation-document-absence"
                                        onClick={handleDocumentAbsence}
                                        className="group flex flex-row-reverse items-center gap-3 rounded-xl border border-rose-500/30 bg-gradient-to-b from-rose-600/12 to-rose-950/20 px-3 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:border-rose-400/40 hover:from-rose-600/18 active:scale-[0.99] touch-manipulation min-h-[48px]"
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-400/30 bg-rose-600/15 text-rose-100">
                                            <UserX size={18} aria-hidden />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[11px] font-black text-rose-50 leading-snug">
                                                نكول / عدم تنفيذ
                                            </span>
                                            <span className="mt-0.5 block text-[9px] font-medium text-rose-200/75 leading-relaxed">
                                                {docActions.absenceLabel}
                                            </span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {canDocument ? (
                            <p className="text-[10px] font-bold text-amber-300/90 text-right">
                                موعد مستحق — جاهز للتوثيق
                            </p>
                        ) : null}
                    </AppointmentBlock>

                    {canToggleFollowing ? (
                        <button
                            type="button"
                            data-testid="visitation-toggle-following"
                            onClick={() => setShowFollowing((v) => !v)}
                            className="w-full flex flex-col items-center gap-1 py-2 text-[#E6C673]/80 hover:text-[#E6C673] transition-colors touch-manipulation min-h-[44px]"
                        >
                            {showFollowing ? (
                                <>
                                    <ChevronUp size={22} />
                                    <span className="text-[11px] font-bold">العودة إلى أقرب موعد</span>
                                </>
                            ) : (
                                <>
                                    <ChevronDown size={22} />
                                    <span className="text-[11px] font-bold">عرض الموعد التالي</span>
                                </>
                            )}
                        </button>
                    ) : null}
                </>
            ) : (
                <p className="text-sm text-slate-400 text-right">
                    لا توجد مواعيد مجدولة في النافذة الحالية.
                </p>
            )}
        </div>
    );
}
