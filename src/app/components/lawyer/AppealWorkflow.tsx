import React, { useState } from 'react';

type WorkflowState =
    | 'INITIAL_REJECTED'
    | 'INITIAL_ACCEPTED'
    | 'PENDING_APPEAL_LAWYER'
    | 'PENDING_APPEAL_DEBTOR'
    | 'FINAL_ACCEPTED'
    | 'FINAL_REJECTED'
    | 'REVOKED_BY_APPEAL';

type LogTone = 'accepted' | 'rejected' | 'pending';

interface TimelineLog {
    id: string;
    at: string;
    tone: LogTone;
    message: string;
}

interface ScenarioState {
    state: WorkflowState;
    timelineLogs: TimelineLog[];
}

const nowIso = () => new Date().toISOString();

const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('ar-IQ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

const toneClasses: Record<LogTone, string> = {
    accepted: 'border-emerald-500/40 bg-emerald-950/35 text-emerald-200',
    rejected: 'border-rose-500/40 bg-rose-950/35 text-rose-200',
    pending: 'border-amber-500/40 bg-amber-950/35 text-amber-200',
};

const stateBadge: Record<WorkflowState, { label: string; cls: string }> = {
    INITIAL_REJECTED: {
        label: 'قرار المنفذ العدل: رفض الطلب ❌',
        cls: 'border-rose-500/40 bg-rose-950/35 text-rose-200',
    },
    INITIAL_ACCEPTED: {
        label: 'قرار المنفذ العدل: قبول ✅',
        cls: 'border-emerald-500/40 bg-emerald-950/35 text-emerald-200',
    },
    PENDING_APPEAL_LAWYER: {
        label: 'قيد الطعن من قبلنا ⏳',
        cls: 'border-amber-500/40 bg-amber-950/35 text-amber-200',
    },
    PENDING_APPEAL_DEBTOR: {
        label: 'قيد الطعن من قبل المدين ⏳ (تم تجميد الإجراءات)',
        cls: 'border-amber-500/40 bg-amber-950/35 text-amber-200',
    },
    FINAL_ACCEPTED: {
        label: 'نهائي: مقبول وساري ✅',
        cls: 'border-emerald-500/40 bg-emerald-950/35 text-emerald-200',
    },
    FINAL_REJECTED: {
        label: 'نهائي: مرفوض نهائياً ❌',
        cls: 'border-rose-500/40 bg-rose-950/35 text-rose-200',
    },
    REVOKED_BY_APPEAL: {
        label: 'منقوض/ملغي لصالح المدين 🚫',
        cls: 'border-rose-500/40 bg-rose-950/35 text-rose-200',
    },
};

function createLog(message: string, tone: LogTone): TimelineLog {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        at: nowIso(),
        tone,
        message,
    };
}

function ScenarioCard({
    title,
    stateModel,
    setStateModel,
    initialState,
}: {
    title: string;
    stateModel: ScenarioState;
    setStateModel: (next: ScenarioState) => void;
    initialState: WorkflowState;
}) {
    const pushState = (nextState: WorkflowState, message: string, tone: LogTone) => {
        setStateModel({
            state: nextState,
            timelineLogs: [createLog(message, tone), ...stateModel.timelineLogs],
        });
    };

    const reset = () => {
        setStateModel({
            state: initialState,
            timelineLogs: [],
        });
    };

    const current = stateModel.state;
    const inAppeal =
        current === 'PENDING_APPEAL_LAWYER' || current === 'PENDING_APPEAL_DEBTOR';

    return (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4 shadow-lg shadow-black/20">
            <h3 className="mb-3 text-sm font-black text-slate-100">{title}</h3>

            <div className={`mb-4 rounded-xl border px-3 py-2 text-xs font-bold ${stateBadge[current].cls}`}>
                {stateBadge[current].label}
            </div>

            <div className="mb-4 space-y-2">
                {current === 'INITIAL_REJECTED' && (
                    <button
                        type="button"
                        onClick={() =>
                            pushState(
                                'PENDING_APPEAL_LAWYER',
                                '⚖️ تم تقديم طعن تمييزي على قرار الرفض (قيد الطعن من قبلنا).',
                                'pending'
                            )
                        }
                        className="w-full rounded-xl border border-amber-500/50 bg-amber-900/35 px-3 py-2.5 text-xs font-bold text-amber-100 hover:bg-amber-900/55"
                    >
                        تقديم طعن تمييزي
                    </button>
                )}

                {current === 'INITIAL_ACCEPTED' && (
                    <button
                        type="button"
                        onClick={() =>
                            pushState(
                                'PENDING_APPEAL_DEBTOR',
                                '🛑 تم الطعن بالقرار من قبل المدين، تم تجميد الإجراءات التنفيذية لحين الحسم.',
                                'pending'
                            )
                        }
                        className="w-full rounded-xl border border-rose-500/50 bg-rose-900/35 px-3 py-2.5 text-xs font-bold text-rose-100 hover:bg-rose-900/55"
                    >
                        🛑 تم الطعن بالقرار من قبل المدين
                    </button>
                )}

                {inAppeal && (
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (current === 'PENDING_APPEAL_LAWYER') {
                                    pushState(
                                        'FINAL_ACCEPTED',
                                        '✅ قررت محكمة التمييز نقض قرار المنفذ العدل، تمت الموافقة على الطلب.',
                                        'accepted'
                                    );
                                } else {
                                    pushState(
                                        'REVOKED_BY_APPEAL',
                                        '🚫 قررت المحكمة نقض القرار لصالح المدين، تم إلغاء الطلب والموافقة السابقة.',
                                        'rejected'
                                    );
                                }
                            }}
                            className="rounded-xl border border-emerald-500/50 bg-emerald-900/35 px-3 py-2.5 text-xs font-bold text-emerald-100 hover:bg-emerald-900/55"
                        >
                            ⚖️ نقض القرار
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (current === 'PENDING_APPEAL_LAWYER') {
                                    pushState(
                                        'FINAL_REJECTED',
                                        '❌ قررت المحكمة رد طعننا وتصديق قرار الرفض.',
                                        'rejected'
                                    );
                                } else {
                                    pushState(
                                        'FINAL_ACCEPTED',
                                        '✅ قررت المحكمة رد طعن المدين، يبقى القرار ساري المفعول ويمكن استكماله.',
                                        'accepted'
                                    );
                                }
                            }}
                            className="rounded-xl border border-rose-500/50 bg-rose-900/35 px-3 py-2.5 text-xs font-bold text-rose-100 hover:bg-rose-900/55"
                        >
                            ⚖️ رد الطعن
                        </button>
                    </div>
                )}

                {(current === 'FINAL_ACCEPTED' ||
                    current === 'FINAL_REJECTED' ||
                    current === 'REVOKED_BY_APPEAL') && (
                    <button
                        type="button"
                        onClick={reset}
                        className="w-full rounded-xl border border-slate-500/40 bg-slate-700/45 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700/60"
                    >
                        إعادة الاختبار
                    </button>
                )}
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/65 p-3">
                <p className="mb-2 text-xs font-bold text-slate-300">السجل الزمني الآلي</p>
                {stateModel.timelineLogs.length === 0 ? (
                    <p className="text-xs text-slate-500">لا توجد أحداث بعد.</p>
                ) : (
                    <ul className="max-h-48 space-y-2 overflow-y-auto">
                        {stateModel.timelineLogs.map((log) => (
                            <li
                                key={log.id}
                                className={`rounded-lg border px-2.5 py-2 text-xs ${toneClasses[log.tone]}`}
                            >
                                <p className="font-semibold leading-relaxed">{log.message}</p>
                                <p className="mt-1 text-[11px] opacity-85">{formatDateTime(log.at)}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export const AppealWorkflow: React.FC = () => {
    const [scenarioRejected, setScenarioRejected] = useState<ScenarioState>({
        state: 'INITIAL_REJECTED',
        timelineLogs: [],
    });
    const [scenarioAccepted, setScenarioAccepted] = useState<ScenarioState>({
        state: 'INITIAL_ACCEPTED',
        timelineLogs: [],
    });

    return (
        <div dir="rtl" className="min-h-screen bg-slate-900 p-4 text-right">
            <div className="mx-auto max-w-6xl space-y-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                    <h2 className="text-lg font-black text-slate-100">لوحة دورة حياة القرارات والطعون التمييزية</h2>
                    <p className="mt-1 text-sm text-slate-400">
                        محاكاة للمسارين: رفض الطلب ثم الطعن، وقبول المنفذ ثم طعن المدين.
                    </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <ScenarioCard
                        title="السيناريو الأول: قرار المنفذ = رفض الطلب ❌"
                        stateModel={scenarioRejected}
                        setStateModel={setScenarioRejected}
                        initialState="INITIAL_REJECTED"
                    />
                    <ScenarioCard
                        title="السيناريو الثاني: قرار المنفذ = قبول ✅"
                        stateModel={scenarioAccepted}
                        setStateModel={setScenarioAccepted}
                        initialState="INITIAL_ACCEPTED"
                    />
                </div>
            </div>
        </div>
    );
};

export default AppealWorkflow;
