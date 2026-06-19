import React, { useState } from 'react';
import { PauseCircle, X } from 'lucide-react';
import {
    GLASS_MODAL_HEADER,
    MoroccanCloseButton,
    MoroccanGlassShell,
    MoroccanHeaderDivider,
} from '../../smartFile/moroccanGlassShell';
import type { PauseCaseModalProps } from '../../smartFile/modalFormTypes';
import { useSmartFileModalTheme } from '../../smartFile/smartFileModalTheme';

export const PauseCaseModal = ({ isOpen, onClose, onConfirm, editMode = false, editData }: PauseCaseModalProps) => {
    const T = useSmartFileModalTheme();
    const [reason, setReason] = useState('');
    const [linkedCaseNo, setLinkedCaseNo] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (editMode && editData) {
                setReason(editData.reason || '');
                setLinkedCaseNo(editData.linkedCaseNo || '');
            } else {
                setReason('');
                setLinkedCaseNo('');
            }
        }
    }, [isOpen, editMode, editData]);

    const handleSubmit = () => {
        if (!reason || !linkedCaseNo) return;
        onConfirm({ reason, linkedCaseNo, ...(editMode && editData ? { id: editData.id } : {}) });
        onClose();
    };

    if (!isOpen) return null;

    const title = editMode ? 'تحديث استئخار الدعوى' : 'استئخار الدعوى';

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-md">
            <div className={T.useMoroccanCorners ? GLASS_MODAL_HEADER : T.header}>
                <h3 className={T.useMoroccanCorners ? 'font-bold flex items-center gap-2 text-[14px] text-white/95' : T.headerTitle}>
                    <PauseCircle size={17} className={T.headerIcon} strokeWidth={1.75} />
                    {title}
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

            <div className={T.body}>
                <div>
                    <label className={T.label}>
                        رقم الدعوى المرتبطة <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={linkedCaseNo}
                        onChange={(e) => setLinkedCaseNo(e.target.value)}
                        className={`${T.field} text-right`}
                        dir="ltr"
                        autoFocus
                    />
                </div>

                <div>
                    <label className={T.label}>
                        سبب الاستئخار <span className="text-red-400">*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        className={`${T.field} resize-none`}
                    />
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!reason || !linkedCaseNo}
                    className={`${T.btn} ${T.btnDisabled} active:scale-[0.99] flex justify-center items-center gap-2`}
                >
                    {editMode ? 'تحديث البيانات' : 'تأكيد وربط الدعوى'}
                </button>
            </div>
        </MoroccanGlassShell>
    );
};
