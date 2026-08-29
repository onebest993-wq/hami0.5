import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import { Scan } from '@/app/components/ui/icons/Scan';
import { ChevronLeft } from '@/app/components/ui/icons/ChevronLeft';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { VAULT_SHEET } from '@/app/components/lawyer/SmartVaultModal/vaultDustyRoseTheme';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { useSmartVaultScanner, type ScannerSaveResult } from './useSmartVaultScanner';
import {
    ScannerCameraPhase,
    ScannerCapturingPhase,
    ScannerIdlePhase,
    ScannerResultPhase,
    ScannerUploadingPhase,
} from './SmartVaultScannerPhases';

export type { ScannerSaveResult };

interface SmartVaultScannerPanelProps {
    userId: string;
    onClose: () => void;
    onSaved?: (result: ScannerSaveResult) => void;
    onViewDoc?: (doc: SmartVaultDoc) => void;
    onCategoryUsed?: (name: string) => void;
    categorySuggestions?: string[];
    standalone?: boolean;
}

export const SmartVaultScannerPanel: React.FC<SmartVaultScannerPanelProps> = ({
    userId,
    onClose,
    onSaved,
    onViewDoc,
    onCategoryUsed,
    categorySuggestions = [],
    standalone = false,
}) => {
    const scanner = useSmartVaultScanner({
        userId,
        onClose,
        onSaved,
        onCategoryUsed,
    });
    const keyboardInset = useMobileKeyboardInset(scanner.phase === 'capturing');

    const shellClass = standalone
        ? 'fixed inset-0 z-[100000] flex items-center justify-center pointer-events-auto'
        : 'absolute inset-0 z-[45] flex items-end sm:items-center justify-center pointer-events-auto';

    const panelClass = standalone
        ? `${VAULT_SHEET} w-full max-w-lg mx-4 relative z-10 max-h-[90vh]`
        : `${VAULT_SHEET} w-full sm:max-w-lg sm:mx-4 relative z-10 max-h-[85vh]`;

    return (
        <div
            className={shellClass}
            dir="rtl"
            data-testid="vault-scanner-panel"
            data-scan-phase={scanner.phase}
            data-scanner-signed={scanner.uid ? '1' : '0'}
            aria-busy={scanner.phase === 'uploading' ? true : undefined}
        >
            <div
                onClick={scanner.handleClose}
                className="absolute inset-0 bg-[#0A0F1C]/70"
            />

            <div
                className={panelClass}
                onClick={(e) => e.stopPropagation()}
            >
                    <div className="shrink-0 px-5 py-4 border-b border-[#C9A9A6]/12 flex items-center justify-between bg-[#322E2A]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#C9A9A6]/15 rounded-lg text-[#C9A9A6]">
                                <Scan size={20} />
                            </div>
                            <div>
                                <h3 className="text-[#F7F3EB] font-bold text-base">ماسح المستندات</h3>
                                <p className="text-[#C9A9A6]/45 text-[10px]">يُحفظ مباشرة في المخزن الذكي</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={scanner.handleClose}
                            aria-label="إغلاق الماسح"
                            data-testid="vault-scanner-close"
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center hover:bg-[#4A4440]/40 rounded-full text-[#C9A9A6]/60 hover:text-[#F7F3EB] transition-colors touch-manipulation"
                        >
                            {standalone ? <X size={20} /> : <ChevronLeft size={20} />}
                        </button>
                    </div>

                    <div
                        className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-5 custom-scrollbar"
                        style={
                            keyboardInset > 0
                                ? { paddingBottom: `max(1.25rem, ${keyboardInset}px)` }
                                : undefined
                        }
                    >
                        {scanner.phase === 'idle' ? (
                            <ScannerIdlePhase
                                error={scanner.error}
                                onClearError={() => scanner.setError(null)}
                                onStartCamera={() => void scanner.startCamera()}
                            />
                        ) : null}

                        {scanner.phase === 'camera' ? (
                            <ScannerCameraPhase
                                videoRef={scanner.videoRef}
                                onCapture={scanner.captureFromCamera}
                            />
                        ) : null}

                        {scanner.phase === 'capturing' && scanner.capturedImage ? (
                            <ScannerCapturingPhase
                                capturedImage={scanner.capturedImage}
                                scanTitle={scanner.scanTitle}
                                scanNote={scanner.scanNote}
                                scanCategory={scanner.scanCategory}
                                categorySuggestions={categorySuggestions}
                                onTitleChange={scanner.setScanTitle}
                                onNoteChange={scanner.setScanNote}
                                onCategoryChange={scanner.setScanCategory}
                                onCategoryUsed={onCategoryUsed}
                                onRetake={scanner.retake}
                                onSave={() => void scanner.uploadScan()}
                            />
                        ) : null}

                        {scanner.phase === 'uploading' ? <ScannerUploadingPhase /> : null}

                        {scanner.phase === 'result' && scanner.result ? (
                            <ScannerResultPhase
                                result={scanner.result}
                                onViewDoc={onViewDoc}
                                onScanAnother={scanner.retake}
                            />
                        ) : null}
                    </div>

                    <canvas ref={scanner.canvasRef} className="hidden" />
            </div>
        </div>
    );
};
