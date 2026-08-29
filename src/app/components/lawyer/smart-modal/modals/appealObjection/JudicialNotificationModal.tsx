import React, { useState } from 'react';
import { Bell } from '@/app/components/ui/icons/Bell';
import { Check } from '@/app/components/ui/icons/Check';
import { X } from '@/app/components/ui/icons/X';
import type { JudicialNotificationModalProps } from '../../smartFile/modalFormTypes';
import {
    GLASS_MODAL_HEADER,
    MoroccanCloseButton,
    MoroccanGlassShell,
    MoroccanHeaderDivider,
} from '../../smartFile/moroccanGlassShell';
import { useSmartFileModalTheme } from '../../smartFile/smartFileModalTheme';

export const JudicialNotificationModal = ({ isOpen, onClose, onConfirm }: JudicialNotificationModalProps) => {
    const T = useSmartFileModalTheme();
    const [targetPerson, setTargetPerson] = useState('');
    const [reason, setReason] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setTargetPerson('');
            setReason('');
            setIsCompleted(false);
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!targetPerson || !reason) return;
        onConfirm({ targetPerson, reason, isCompleted });
        onClose();
    };

    if (!isOpen) return null;

    const accentRequired = T.variant === 'personal-pearl' ? 'text-rose-300' : 'text-[#E6C673]';
    const checkboxActive =
        T.variant === 'personal-pearl'
            ? 'bg-[#F0A8B4]/25 border-[#F0A8B4]/45'
            : 'bg-[#E6C673]/30 border-[#E6C673]/50';
    const checkboxIcon = T.variant === 'personal-pearl' ? 'text-[#FFD4DC]' : 'text-[#E6C673]';

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-lg">
            <div className={T.useMoroccanCorners ? GLASS_MODAL_HEADER : T.header}>
                <h3 className={T.useMoroccanCorners ? 'font-bold text-sm text-white/95' : T.headerTitle}>
                    <Bell size={16} className={T.headerIcon} strokeWidth={1.75} />
                    تسجيل تبليغ قضائي
                </h3>
                {T.useMoroccanCorners ? (
                    <MoroccanCloseButton onClick={onClose} />
                ) : (
                    <button type="button" onClick={onClose} className={T.closeBtn} aria-label="إغلاق">
                        <X size={16} />
                    </button>
                )}
                {T.useMoroccanCorners ? <MoroccanHeaderDivider /> : null}
            </div>

            <div className={`${T.body} md:min-h-[24rem] md:space-y-4`}>
                <div>
                    <label className={T.label}>
                        الشخص المراد تبليغه <span className={accentRequired}>*</span>
                    </label>
                    <input
                        type="text"
                        value={targetPerson}
                        onChange={(e) => setTargetPerson(e.target.value)}
                        className={T.field}
                        autoFocus
                    />
                </div>

                <div>
                    <label className={T.label}>
                        موضوع التبليغ <span className={accentRequired}>*</span>
                    </label>
                    <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className={T.field} />
                </div>

                <div
                    className="flex items-center gap-2 border border-white/[0.08] p-3 rounded-xl bg-white/[0.03] backdrop-blur-sm cursor-pointer hover:bg-white/[0.05] transition-colors"
                    onClick={() => setIsCompleted(!isCompleted)}
                >
                    <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isCompleted ? checkboxActive : 'border-white/30'}`}
                    >
                        {isCompleted && <Check size={14} className={checkboxIcon} />}
                    </div>
                    <span className={`text-sm select-none ${T.variant === 'personal-pearl' ? 'text-[#ECE8E2]/90' : 'text-white/80'}`}>
                        تم التبليغ بالفعل (إضافة للسجل مباشرة)
                    </span>
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!targetPerson || !reason}
                    className={`${T.btn} ${T.btnDisabled}`}
                >
                    {isCompleted ? 'تسجيل التبليغ' : 'إضافة كمهمة متابعة'}
                </button>
            </div>
        </MoroccanGlassShell>
    );
};
