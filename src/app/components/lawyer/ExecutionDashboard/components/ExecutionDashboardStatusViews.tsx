import React from 'react';
import { AlertCircle } from '@/app/components/ui/icons/AlertCircle';
import {
    EXECUTION_DOSSIER_PAINT_FILE_EMPTY,
    ExecutionDossierInstantFrame,
    type ExecutionDossierPaintFile,
} from '@/app/components/lawyer/dashboard/ExecutionDossierInstantFrame';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/types/execution';

export function ExecutionDashboardLoadingView({
    file,
    onExitToHome,
}: {
    file?: ExecutionFile | FileData | ExecutionDossierPaintFile | null;
    onExitToHome: () => void;
}) {
    return (
        <ExecutionDossierInstantFrame
            file={file ?? EXECUTION_DOSSIER_PAINT_FILE_EMPTY}
            onExitToHome={onExitToHome}
        />
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
                    className="w-full min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all touch-manipulation"
                >
                    إغلاق
                </button>
            </div>
        </div>
    );
}
