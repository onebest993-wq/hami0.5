import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import { Lock } from '@/app/components/ui/icons/Lock';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
} from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';

export function SeizedAssetsModalHeader({ onClose }: { onClose: () => void }) {
    return (
        <div className={`flex justify-between items-center border-b border-slate-700 pb-4 mb-6 ${EXEC_MODAL_HEADER_SAFE_TOP}`}>
            <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-3">
                <Lock size={28} />
                🔒 إدارة الأموال المحجوزة والمزايدات العلنية
            </h2>
            <button type="button" onClick={onClose} className={EXEC_MODAL_CLOSE_BTN_CLASS}>
                <X size={20} className="text-slate-400" />
            </button>
        </div>
    );
}
