import React from 'react';
import { createPortal } from 'react-dom';
import { Bell, Calendar, X } from 'lucide-react';

export interface ExecutionDebtorNotificationMemoModalContainerProps {
    showNotificationModal: boolean;
    setShowNotificationModal: (show: boolean) => void;
    debtorNotificationDate: string | null;
    setDebtorNotificationDate: React.Dispatch<React.SetStateAction<string | null>>;
    /** يُستدعى بتاريخ التبليغ المختار من المودال (نفس سلوك اللوحة الرئيسية) */
    handleNotifyDebtor: (explicitNotificationDate?: string | null) => void;
    getLocalTodayYmd: () => string;
    EXEC_MODAL_BACKDROP_STRONG: string;
    notificationModalZIndex: number;
}

export const ExecutionDebtorNotificationMemoModalContainer: React.FC<
    ExecutionDebtorNotificationMemoModalContainerProps
> = ({
    showNotificationModal,
    setShowNotificationModal,
    debtorNotificationDate,
    setDebtorNotificationDate,
    handleNotifyDebtor,
    getLocalTodayYmd,
    EXEC_MODAL_BACKDROP_STRONG,
    notificationModalZIndex,
}) => {
    if (!showNotificationModal || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: notificationModalZIndex }}
            onClick={() => setShowNotificationModal(false)}
            role="presentation"
        >
            <div
                className="bg-[#0B1120] border-2 border-indigo-500/40 rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-[#0B1120] border-b border-indigo-500/30 p-4 flex justify-between items-center z-10">
                    <button
                        type="button"
                        onClick={() => setShowNotificationModal(false)}
                        className="p-2 hover:bg-indigo-500/20 rounded-lg transition-all"
                    >
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className="text-indigo-400 font-bold text-lg flex items-center gap-2">
                        <Bell size={20} />
                        التبليغ
                    </h2>
                </div>

                <div className="p-5">
                    <input
                        id="hami-exec-memo-date"
                        type="date"
                        value={(debtorNotificationDate && debtorNotificationDate.trim()) || getLocalTodayYmd()}
                        onChange={(e) => {
                            const picked = String(e.target.value || '').trim() || getLocalTodayYmd();
                            setDebtorNotificationDate(picked);
                            handleNotifyDebtor(picked);
                            setShowNotificationModal(false);
                        }}
                        className="sr-only"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            const el = document.getElementById('hami-exec-memo-date') as HTMLInputElement | null;
                            if (!el) return;
                            try {
                                const withPicker = el as HTMLInputElement & { showPicker?: () => void };
                                withPicker.showPicker?.();
                            } catch {
                                /* ignore */
                            }
                            el.click();
                        }}
                        className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                    >
                        <Calendar size={18} />
                        تحديد تاريخ للتبليغ بمذكرة الإخبار
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
