import React, { memo } from 'react';
import type { TimelineEvent } from '../../LawyerShared';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { parseSessionRecordEvent } from '../smartFile/sessionRecordEngine';
import type { SessionHubTheme } from './sessionHubGlassTheme';

export const SessionHearingsRegister = memo(function SessionHearingsRegister({
    T,
    sessions,
    selectedId,
    onSelect,
    onLeave,
}: {
    T: SessionHubTheme;
    sessions: TimelineEvent[];
    selectedId?: string;
    onSelect: (event: TimelineEvent) => void;
    onLeave: () => void;
}) {
    const selected = sessions.find((s) => s.id === selectedId) ?? sessions[0];
    const view = selected ? parseSessionRecordEvent(selected) : null;

    return (
        <div className={T.body} data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionHearingsRegister}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-bold text-white/80">سجل جلسات المرافعة</p>
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionLeaveRegister}
                    onClick={onLeave}
                    className="min-h-[44px] px-3 rounded-xl border border-white/[0.10] text-[11px] font-bold text-white/70 hover:bg-white/[0.05] touch-manipulation"
                >
                    مغادرة السجل
                </button>
            </div>

            {sessions.length === 0 ? (
                <p className="text-sm text-white/40 text-center py-8">لا جلسات مسجّلة بعد</p>
            ) : (
                <>
                    <div className="flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-hide pb-1">
                        {sessions.map((record) => {
                            const parsed = parseSessionRecordEvent(record);
                            const active = selected?.id === record.id;
                            return (
                                <button
                                    key={record.id}
                                    type="button"
                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionHearingRow(String(record.id))}
                                    onClick={() => onSelect(record)}
                                    className={`shrink-0 min-h-[44px] rounded-xl border px-3 py-2 text-right touch-manipulation ${
                                        active
                                            ? 'border-[#E6C673]/35 bg-[#E6C673]/10'
                                            : 'border-white/[0.08] bg-white/[0.03]'
                                    }`}
                                >
                                    <span className="block text-[11px] font-bold text-white/85">
                                        جلسة {parsed.sessionNumber || '—'}
                                    </span>
                                    <span className="block text-[10px] text-white/40 tabular-nums">
                                        {String(record.date ?? '').slice(0, 10)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {view ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                <div>
                                    <p className={T.label}>تاريخ المرافعة</p>
                                    <p className="text-white/85 tabular-nums">{view.date.slice(0, 10) || '—'}</p>
                                </div>
                                <div>
                                    <p className={T.label}>رقم الجلسة</p>
                                    <p className="text-white/85">{view.sessionNumber || '—'}</p>
                                </div>
                                <div>
                                    <p className={T.label}>المرافعة القادمة</p>
                                    <p className="text-white/85 tabular-nums">
                                        {view.nextHearingDate?.slice(0, 10) || '—'}
                                    </p>
                                </div>
                            </div>
                            <div className={T.section}>
                                <p className={T.label}>مجريات الدعوى</p>
                                <p className="text-sm text-white/75 whitespace-pre-line leading-relaxed">
                                    {view.proceedings || '—'}
                                </p>
                            </div>
                            {view.judgeDecisions ? (
                                <div className={T.section}>
                                    <p className={T.label}>قرارات القاضي</p>
                                    <p className="text-sm text-white/75 whitespace-pre-line leading-relaxed">
                                        {view.judgeDecisions}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
});
