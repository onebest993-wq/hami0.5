import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';
import { TX_HUB_DROPDOWN_Z } from './transactionsHubOverlayZ';
import {
    closeTransactionsLiteMenuIfOpen,
    markTransactionsLiteMenuOpen,
    TX_LITE_MENU_CLOSE_EVENT,
} from './transactionsLiteMenuOpen';
import { TX_DROPDOWN_CONTENT, TX_DROPDOWN_FOCUS, TX_ICON_BTN } from './transactionsGlassTheme';
import { MoreVerticalIcon } from './transactionsTheme/icons';

export type TransactionsLiteMenuItem = {
    label: string;
    onSelect: () => void;
    testId?: string;
    accent?: boolean;
};

const MENU_WIDTH = 196;
const ITEM_HEIGHT = 44;

function menuPortalRoot(): HTMLElement {
    return getHamiOverlayPortalRoot({
        id: 'hami-transactions-dropdown-root',
        zIndex: TX_HUB_DROPDOWN_Z,
    });
}

function measureMenuBox(trigger: HTMLElement, itemCount: number): { top: number; left: number } {
    const r = trigger.getBoundingClientRect();
    const height = Math.max(itemCount, 1) * ITEM_HEIGHT + 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = r.bottom + 4;
    if (top + height > vh - 8) {
        top = Math.max(8, r.top - height - 4);
    }
    return {
        top,
        left: Math.max(8, Math.min(r.right - MENU_WIDTH, vw - MENU_WIDTH - 8)),
    };
}

function menuItems(menu: HTMLElement | null): HTMLElement[] {
    if (!menu) return [];
    return Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
}

/** قائمة خفيفة بلا Radix — نفس أدوار a11y التي يعتمدها E2E */
export function TransactionsLiteMenu({
    triggerLabel,
    items,
    onTriggerPointerDown,
}: {
    triggerLabel: string;
    items: TransactionsLiteMenuItem[];
    onTriggerPointerDown?: () => void;
}) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [box, setBox] = useState<{ top: number; left: number } | null>(null);
    const menuId = useId();

    const closeMenu = (restoreTrigger: boolean) => {
        setOpen(false);
        setBox(null);
        if (restoreTrigger) triggerRef.current?.focus();
    };

    const openMenu = () => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        closeTransactionsLiteMenuIfOpen();
        setBox(measureMenuBox(trigger, items.length));
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        markTransactionsLiteMenuOpen(true);
        const onPointer = (event: PointerEvent) => {
            const node = event.target;
            if (!(node instanceof Node)) return;
            if (triggerRef.current?.contains(node) || menuRef.current?.contains(node)) return;
            closeMenu(false);
        };
        const onScrollOrResize = () => closeMenu(false);
        const onRemoteClose = () => closeMenu(true);
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener(TX_LITE_MENU_CLOSE_EVENT, onRemoteClose);
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);
        return () => {
            markTransactionsLiteMenuOpen(false);
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener(TX_LITE_MENU_CLOSE_EVENT, onRemoteClose);
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [open]);

    useLayoutEffect(() => {
        if (!open) return;
        menuItems(menuRef.current)[0]?.focus();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                closeMenu(true);
                return;
            }
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') {
                return;
            }
            const list = menuItems(menuRef.current);
            if (list.length === 0) return;
            event.preventDefault();
            const current = list.indexOf(document.activeElement as HTMLElement);
            let next = 0;
            if (event.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % list.length;
            else if (event.key === 'ArrowUp') next = current < 0 ? list.length - 1 : (current - 1 + list.length) % list.length;
            else if (event.key === 'End') next = list.length - 1;
            list[next]?.focus();
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
    }, [open]);

    const menu =
        open && box && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      ref={menuRef}
                      id={menuId}
                      role="menu"
                      dir="rtl"
                      className={`${TX_DROPDOWN_CONTENT} pointer-events-auto min-w-[12rem] py-1`}
                      style={{ position: 'fixed', top: box.top, left: box.left, zIndex: TX_HUB_DROPDOWN_Z }}
                  >
                      {items.map((item) => (
                          <button
                              key={item.label}
                              type="button"
                              role="menuitem"
                              data-testid={item.testId}
                              className={`${TX_DROPDOWN_FOCUS} flex w-full min-h-[44px] items-center px-3 text-sm font-medium text-right ${
                                  item.accent ? 'text-[#E6C673]' : 'text-[#F4F4F5]'
                              }`}
                              onClick={() => {
                                  closeMenu(false);
                                  item.onSelect();
                              }}
                          >
                              {item.label}
                          </button>
                      ))}
                  </div>,
                  menuPortalRoot(),
              )
            : null;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className={TX_ICON_BTN}
                aria-label={triggerLabel}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                onPointerDown={() => onTriggerPointerDown?.()}
                onClick={() => {
                    if (open) {
                        closeMenu(false);
                        return;
                    }
                    openMenu();
                }}
            >
                <MoreVerticalIcon className="w-4 h-4" />
            </button>
            {menu}
        </>
    );
}
