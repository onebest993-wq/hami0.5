import React from 'react';
import type { Dispatch, ElementType, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { EXEC_MODAL_CLOSE_BTN_CLASS, EXEC_MODAL_TOUCH_TARGET } from '../executionModalMobileShell';

export type ExecutionPauseResumeOverlayProps = {
    X: ElementType;
    showPauseModal: boolean;
    setShowPauseModal: (show: boolean) => void;
    isPaused: boolean;
    setIsPaused: Dispatch<SetStateAction<boolean>>;
    Pause: ElementType;
    Play: ElementType;
    AlertCircle: ElementType;
    CheckCircle: ElementType;
    pauseReason: string;
    setPauseReason: Dispatch<SetStateAction<string>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    executionId: string;
    executionData: ExecutionFile;
    executionStorageKey: (id: string) => string;
    storageCache: { set: (key: string, value: unknown) => void };
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
};

/** إيقاف / استئناف التنفيذ + شريط الإضبارة الموقوفة */
export function ExecutionPauseResumeOverlay({
    X,
    showPauseModal,
    setShowPauseModal,
    isPaused,
    setIsPaused,
    Pause,
    Play,
    AlertCircle,
    CheckCircle,
    pauseReason,
    setPauseReason,
    setTimelineEvents,
    executionId,
    executionData,
    executionStorageKey,
    storageCache,
    showToast,
}: ExecutionPauseResumeOverlayProps) {
    return (
        <>
            {showPauseModal && (
                <div
                    className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4"
                    onClick={() => setShowPauseModal(false)}
                >
                    <div
                        className="bg-[#0B1021] border-2 border-amber-500/40 rounded-3xl w-full max-w-md overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="border-b border-amber-500/30 bg-amber-950/25 p-4 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => setShowPauseModal(false)}
                                className={EXEC_MODAL_CLOSE_BTN_CLASS}
                                aria-label="إغلاق"
                            >
                                <X size={20} className="text-white" />
                            </button>
                            <h2 className="text-amber-400 font-bold text-lg flex items-center gap-2">
                                {isPaused ? <Play size={20} /> : <Pause size={20} />}
                                {isPaused ? 'استئناف التنفيذ' : 'إيقاف التنفيذ'}
                            </h2>
                        </div>

                        <div className="p-6 space-y-4">
                            {!isPaused ? (
                                <>
                                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-4">
                                        <div className="flex items-start gap-3 mb-3">
                                            <AlertCircle
                                                size={20}
                                                className="text-amber-400 flex-shrink-0 mt-0.5"
                                            />
                                            <div className="text-right">
                                                <p className="text-amber-300 font-semibold text-sm mb-1">
                                                    تحذير: إيقاف التنفيذ
                                                </p>
                                                <p className="text-gray-300 text-xs leading-relaxed">
                                                    سيتم إيقاف جميع المهل الزمنية وتعطيل أدوات التنفيذ
                                                    الجبري بالكامل. يُستخدم هذا الخيار في حالات التأخير
                                                    التنفيذي أو صدور قرار محكمة بإيقاف التنفيذ.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-right text-amber-300 text-sm font-semibold">
                                            سبب الإيقاف (اختياري)
                                        </label>
                                        <textarea
                                            value={pauseReason}
                                            onChange={(e) => setPauseReason(e.target.value)}
                                            placeholder="مثال: قرار محكمة بإيقاف التنفيذ رقم 123/2026"
                                            className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl p-3 text-white text-sm resize-none focus:outline-none focus:border-amber-400/50 transition-all h-24"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPaused(true);
                                            setTimelineEvents((prev) => {
                                                const pauseEvent = {
                                                    id: `pause_${Date.now()}`,
                                                    type: 'system',
                                                    title: '⏸️ إيقاف التنفيذ',
                                                    description: `تم إيقاف التنفيذ قانونياً${
                                                        pauseReason ? `: ${pauseReason}` : ''
                                                    }`,
                                                    date: new Date().toISOString(),
                                                    timestamp: new Date().toISOString(),
                                                };
                                                return [pauseEvent, ...prev];
                                            });

                                            const persistKey = executionData?.id || executionId;
                                            if (persistKey) {
                                                storageCache.set(executionStorageKey(String(persistKey)), {
                                                    ...executionData,
                                                    isPaused: true,
                                                    pauseReason,
                                                });
                                            }

                                            setShowPauseModal(false);
                                            showToast('⏸️ تم إيقاف التنفيذ', 'warning');
                                        }}
                                        className={`${EXEC_MODAL_TOUCH_TARGET} w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-colors`}
                                    >
                                        ⏸️ تأكيد الإيقاف
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-4">
                                        <div className="flex items-start gap-3 mb-3">
                                            <CheckCircle
                                                size={20}
                                                className="text-emerald-400 flex-shrink-0 mt-0.5"
                                            />
                                            <div className="text-right">
                                                <p className="text-emerald-300 font-semibold text-sm mb-1">
                                                    استئناف التنفيذ
                                                </p>
                                                <p className="text-gray-300 text-xs leading-relaxed">
                                                    سيتم استئناف جميع المهل الزمنية وإعادة تفعيل أدوات التنفيذ
                                                    الجبري.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {pauseReason && (
                                        <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-3">
                                            <p className="text-gray-400 text-xs text-right mb-1">
                                                سبب الإيقاف السابق:
                                            </p>
                                            <p className="text-white text-sm text-right">{pauseReason}</p>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPaused(false);
                                            setPauseReason('');
                                            setTimelineEvents((prev) => {
                                                const resumeEvent = {
                                                    id: `resume_${Date.now()}`,
                                                    type: 'system',
                                                    title: '▶️ استئناف التنفيذ',
                                                    description:
                                                        'تم استئناف التنفيذ وإعادة تفعيل جميع الأدوات',
                                                    date: new Date().toISOString(),
                                                    timestamp: new Date().toISOString(),
                                                };
                                                return [resumeEvent, ...prev];
                                            });

                                            const persistKey = executionData?.id || executionId;
                                            if (persistKey) {
                                                storageCache.set(executionStorageKey(String(persistKey)), {
                                                    ...executionData,
                                                    isPaused: false,
                                                    pauseReason: '',
                                                });
                                            }

                                            setShowPauseModal(false);
                                            showToast('▶️ تم استئناف التنفيذ', 'success');
                                        }}
                                        className={`${EXEC_MODAL_TOUCH_TARGET} w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors`}
                                    >
                                        ▶️ تأكيد الاستئناف
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isPaused && (
                <div className="fixed top-0 left-0 right-0 z-[150] border-b-2 border-amber-500 bg-amber-950 py-3 px-4">
                    <div className="flex items-center justify-center gap-3">
                        <Pause size={20} className="text-white animate-pulse" />
                        <p className="text-white font-bold text-sm">⚠️ الإضبارة موقوفة قانونياً</p>
                        {pauseReason && <p className="text-amber-200 text-xs">({pauseReason})</p>}
                    </div>
                </div>
            )}
        </>
    );
}
