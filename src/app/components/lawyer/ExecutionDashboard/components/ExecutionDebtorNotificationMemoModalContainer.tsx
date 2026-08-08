import React from 'react';
import { createPortal } from 'react-dom';
import { Bell, Calendar, X } from '@/app/components/ui/lucideIcons';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_TOUCH_TARGET,
} from '../executionModalMobileShell';
import {
    HUB_HEADER_CLASS,
    HUB_SHELL_CLASS,
    HUB_TITLE_CLASS,
} from '@/app/components/lawyer/Modal_Unified_Summons_Hub/summonsHubStyles';

export interface ExecutionDebtorNotificationMemoModalContainerProps {
    showNotificationModal: boolean;
    setShowNotificationModal?: (show: boolean) => void;
    onCloseNotificationModal?: () => void;
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
    onCloseNotificationModal,
    debtorNotificationDate,
    setDebtorNotificationDate,
    handleNotifyDebtor,
    getLocalTodayYmd,
    EXEC_MODAL_BACKDROP_STRONG,
    notificationModalZIndex,
}) => {
    const closeNotificationModal = () => {
        if (typeof onCloseNotificationModal === 'function') {
            onCloseNotificationModal();
        } else {
            setShowNotificationModal?.(false);
        }
    };

    if (!showNotificationModal || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG} ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            style={{ zIndex: notificationModalZIndex }}
            onClick={closeNotificationModal}
            role="presentation"
        >
            <div
                className={`${HUB_SHELL_CLASS} max-h-[80vh] overflow-y-auto`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`sticky top-0 z-10 ${HUB_HEADER_CLASS} ${EXEC_MODAL_HEADER_SAFE_TOP}`}>
                    <button type="button" onClick={closeNotificationModal} className={EXEC_MODAL_CLOSE_BTN_CLASS}>
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className={HUB_TITLE_CLASS}>
                        <Bell size={20} />
                        التبليغ
                    </h2>
                </div>

                <div className="p-5">
                    <input
                        id="hami-exec-memo-date"
                        type="date"
                        max={getLocalTodayYmd()}
                        value={(debtorNotificationDate && debtorNotificationDate.trim()) || getLocalTodayYmd()}
                        onChange={(e) => {
                            const today = getLocalTodayYmd();
                            const raw = String(e.target.value || '').trim();
                            const picked = raw && raw > today ? today : raw || today;
                            setDebtorNotificationDate(picked);
                            handleNotifyDebtor(picked);
                            closeNotificationModal();
                        }}
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden
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
                        className={`${EXEC_MODAL_TOUCH_TARGET} flex w-full flex-row-reverse items-center justify-center gap-2 rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/10 px-4 py-3 text-sm font-bold text-[#F5F0E6] hover:bg-[#E6C673]/16`}
                    >
                        <Calendar size={18} className="text-[#E6C673]" />
                        تحديد تاريخ للتبليغ بمذكرة الإخبار
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};
