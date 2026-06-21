import { createPortal } from 'react-dom';
import { HAMI_SHELL_CONTAINER } from '../lawyerShellLayout';
import { useHomeLayoutEdit } from './HomeLayoutEditContext';

/** خط إدراج ثابت — لا يغيّر تدفّق الشبكة */
export function HomeDropIndicator() {
    const { isEditing, draggingWidgetId, dropPreview } = useHomeLayoutEdit();

    if (!isEditing || !draggingWidgetId || !dropPreview?.indicatorY) return null;

    return createPortal(
        <div
            className="pointer-events-none fixed inset-x-0 z-[110]"
            style={{ top: dropPreview.indicatorY }}
            aria-hidden
        >
            <div className={`${HAMI_SHELL_CONTAINER} hami-shell-gutter-x`}>
                <div className="h-[3px] rounded-full bg-[#E6C673]/80 shadow-[0_0_14px_rgba(230,198,115,0.45)]" />
            </div>
        </div>,
        document.body,
    );
}
