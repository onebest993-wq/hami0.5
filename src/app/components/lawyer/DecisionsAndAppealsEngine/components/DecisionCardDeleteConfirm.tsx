import React from 'react';

export type DecisionCardDeleteConfirmProps = {
    deleteConfirmId: string | null;
    decisionId: string;
    setDeleteConfirmId: (id: string | null) => void;
    onDeleteDecision: (id: string) => void;
};

export function DecisionCardDeleteConfirm({
    deleteConfirmId,
    decisionId,
    setDeleteConfirmId,
    onDeleteDecision,
}: DecisionCardDeleteConfirmProps) {
            {deleteConfirmId === decisionId ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
                    <div className="rounded-xl border border-red-500/30 bg-slate-900 p-5 shadow-2xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm text-gray-200 text-center leading-relaxed">
                            هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء
                        </p>
                        <div className="mt-4 flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => { onDeleteDecision(decisionId); setDeleteConfirmId(null); }}
                                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded text-sm font-medium transition-colors"
                            >
                                حذف
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded text-sm font-medium transition-colors"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
}
