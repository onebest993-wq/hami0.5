import { createPortal } from 'react-dom';
import { HAMI_SHELL_CONTAINER } from '../lawyerShellLayout';
import { useHomeLayoutEdit } from './HomeLayoutEditContext';

/** منطقة إفلات ثابتة فوق الدوك أثناء السحب — لا تختبئ خلف الشريط */
export function HomeDockTransferHint() {
    const { isEditing, draggingWidgetId, dropHighlightZone } = useHomeLayoutEdit();

    if (!isEditing || !draggingWidgetId || typeof document === 'undefined') return null;

    return createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-[150] hami-shell-gutter-x">
            <div className={HAMI_SHELL_CONTAINER}>
                <div
                    className={`rounded-2xl border-2 border-dashed px-4 py-3 text-center transition-colors ${
                        dropHighlightZone === 'dock'
                            ? 'border-[#E6C673]/70 bg-[#E6C673]/10'
                            : 'border-white/15 bg-white/[0.02]'
                    }`}
                >
                    <p className="text-[10px] font-bold text-white/50">أفلت هنا للشريط السفلي</p>
                </div>
            </div>
        </div>,
        document.body,
    );
}
