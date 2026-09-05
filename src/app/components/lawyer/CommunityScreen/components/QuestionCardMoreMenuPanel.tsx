import type { QuestionCardMoreMenuItem } from '../questionCardMoreMenuItems';
import { FORUM_DROPDOWN_PANEL, FORUM_TEXT_APRICOT, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';

type QuestionCardMoreMenuPanelProps = {
    menuId: string;
    items: QuestionCardMoreMenuItem[];
    destructiveItems: QuestionCardMoreMenuItem[];
    onClose: () => void;
    onRunItem: (item: QuestionCardMoreMenuItem, event: React.MouseEvent) => void;
};

export function QuestionCardMoreMenuPanel({
    menuId,
    items,
    destructiveItems,
    onClose,
    onRunItem,
}: QuestionCardMoreMenuPanelProps) {
    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
            <div
                id={menuId}
                role="menu"
                className={`absolute top-full end-0 mt-2 z-50 w-56 py-1.5 ${FORUM_DROPDOWN_PANEL}`}
                onClick={(event) => event.stopPropagation()}
            >
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        onClick={(event) => onRunItem(item, event)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] text-right text-sm transition-colors touch-manipulation ${
                            item.active
                                ? `${FORUM_TEXT_APRICOT} bg-[#E6C673]/10`
                                : `${FORUM_TEXT_PRIMARY} hover:bg-white/[0.06]`
                        }`}
                    >
                        <item.icon size={16} className="shrink-0 opacity-80" />
                        <span className="flex-1">{item.label}</span>
                    </button>
                ))}
                {items.length > 0 && destructiveItems.length > 0 ? (
                    <div className="my-1 border-t border-white/10" role="separator" />
                ) : null}
                {destructiveItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        onClick={(event) => onRunItem(item, event)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] text-right text-sm text-rose-300 hover:bg-rose-500/10 transition-colors touch-manipulation"
                    >
                        <item.icon size={16} className="shrink-0" />
                        <span className="flex-1">{item.label}</span>
                    </button>
                ))}
            </div>
        </>
    );
}
