import React, { useState } from 'react';
import { X } from '@/app/components/ui/icons/X';
import {
    GLASS_BTN,
    GLASS_CLOSE,
    GLASS_MODAL_HEADER,
    GLASS_MODAL_OVERLAY,
    GLASS_MODAL_SHELL,
    
} from './proceduralModalShell';

type AppealBriefOutcomeModalProps = {
    isOpen: boolean;
    taskTitle?: string;
    onClose: () => void;
    onConfirm: (outcome: 'quashed' | 'upheld' | 'partial') => void;
};

export const AppealBriefOutcomeModal = ({
    isOpen,
    taskTitle,
    onClose,
    onConfirm,
}: AppealBriefOutcomeModalProps) => {
    const [outcome, setOutcome] = useState<'quashed' | 'upheld' | 'partial' | ''>('');

    React.useEffect(() => {
        if (isOpen) setOutcome('');
    }, [isOpen]);

    if (!isOpen) return null;

    const options = [
        { id: 'quashed' as const, label: 'نقض القرار الإعدادي' },
        { id: 'upheld' as const, label: 'تأييد القرار الإعدادي' },
    ];

    return (
        <div className={GLASS_MODAL_OVERLAY} dir="rtl">
            <div className={GLASS_MODAL_SHELL}>
                <div className={GLASS_MODAL_HEADER}>
                    <h3 className="font-bold text-sm text-white/95">نتيجة الطعن التمييزي</h3>
                    <button type="button" onClick={onClose} className={GLASS_CLOSE}>
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {taskTitle ? (
                        <p className="text-xs text-white/60 leading-relaxed">{taskTitle}</p>
                    ) : null}
                    <div className="grid gap-2">
                        {options.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setOutcome(opt.id)}
                                className={`w-full text-right px-3 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                                    outcome === opt.id
                                        ? 'bg-[#E6C673]/15 border-[#E6C673]/35 text-[#E6C673]'
                                        : 'bg-white/[0.03] border-white/[0.08] text-white/80 hover:bg-white/[0.05]'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        disabled={!outcome}
                        onClick={() => outcome && onConfirm(outcome)}
                        className={GLASS_BTN}
                    >
                        تسجيل تقديم اللائحة ونتيجة الطعن
                    </button>
                </div>
            </div>
        </div>
    );
};

